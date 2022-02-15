# pugflow (Browser-sync version)

My slide authoring workflow:

- Reveal.js: slide framework
- Pug: because writing HTML directly is too verbose
- Shiki: for nicer highlighting than Highlight.js
- Remark: for Markdown-in-slides (although Pug sort of obviates the need for this)
- ...?

## Usage

Install pugflow:

```
$ yarn add pugflow
```

(actually, it's not published on NPM yet so maybe you need to add this Git repository directly)


Run:

```
$ yarn run pugflow [pug file(s) to compile]
```

If you specify no files to compile, browser-sync will be started which will watch and compile all modified *.pug files.
