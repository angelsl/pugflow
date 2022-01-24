// adapted from https://github.com/parcel-bundler/parcel/blob/v2/packages/transformers/pug/src/PugTransformer.js

const path = require("node:path");

const { Transformer } = require("@parcel/plugin");

const pug = require("pug");
const { escape } = require("pug-runtime");

const shiki = require("shiki");

let markdownImports = null;

async function importMarkdown() {
  if (markdownImports) {
    return markdownImports;
  }
  const { unified } = await import("unified");
  const remarkParse = (await import("remark-parse")).default;
  const remarkGfm = (await import("remark-gfm")).default;
  const remarkHtml = (await import("remark-html")).default;
  const { visit } = await import("unist-util-visit");
  function remarkShiki({ highlighter }) {
    return (tree) => {
      visit(tree, "code", (node) => {
        if (!node.lang) {
          return;
        }

        node.type = "html";
        node.value = highlighter.codeToHtml(node.value, { lang: node.lang });
        delete node.lang;
      });
    };
  }

  markdownImports = { unified, remarkParse, remarkGfm, remarkHtml, remarkShiki };
  return markdownImports;
}

module.exports = new Transformer({
  async loadConfig({ config }) {
    let configFile = await config.getConfig([".pugflowrc", ".pugflowrc.js", "pugflow.config.js"]);

    if (configFile) {
      let isJavascript = path.extname(configFile.filePath) === ".js";
      if (isJavascript) {
        config.invalidateOnStartup();
      }

      return configFile.contents;
    }
  },

  async transform({ asset, config }) {
    const pugConfig = config?.pug ?? {};
    const shikiConfig = {
      theme: "monokai",
      langs: ["c", "cpp"],
      ...config?.shiki,
    };

    const highlighter = await shiki.getHighlighter(shikiConfig);

    // add some filters
    pugConfig.filters ||= {};
    pugConfig.filters.escape = escape;

    if (!config?.disableMarkdown) {
      const { unified, remarkParse, remarkGfm, remarkHtml, remarkShiki } = await importMarkdown();
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkShiki, { highlighter })
        .use(remarkHtml, { sanitize: false });
      pugConfig.filters.md = (value) => processor.processSync(value).value;
    }

    pugConfig.filters.code = (v, o) => {
      const languageCandidates = Object.entries(o).filter(([k, v]) => v === true && k !== "filename");
      if (languageCandidates.length < 1) {
        throw new Error("No language specified to :code filter");
      }
      if (languageCandidates.length > 1) {
        throw new Error("Multiple languages specified to :code filter");
      }
      const language = languageCandidates[0][0];

      return highlighter.codeToHtml(v, { lang: language });
    };

    const content = await asset.getCode();
    const render = pug.compile(content, {
      compileDebug: false,
      basedir: path.dirname(asset.filePath),
      filename: asset.filePath,
      ...pugConfig,
      pretty: pugConfig.pretty || false,
    });

    for (let filePath of render.dependencies) {
      await asset.invalidateOnFileChange(filePath);
    }

    asset.type = "html";
    asset.setCode(render(pugConfig.locals));

    return [asset];
  },
});
