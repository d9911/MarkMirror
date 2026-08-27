English | [Español](README.es.md) | [Русский](README.ru.md)

# MarkMirror

## Purpose

MarkMirror is a browser-based Markdown editor with editing and preview panels.

## Web address

<https://mark-mirror.d9911.org/>

## Verified capabilities

- Edit Markdown and update plain-text and HTML previews; the bundled parser supports headings, formatting, links, images, lists, tables, task lists, fenced code blocks, blockquotes, and inline HTML.
- Dynamically load a CodeMirror editor and fall back to a simple editor if that import fails.
- Import `.md` and `.txt` files, export the current content as Markdown or HTML, and clear the editor.
- Provide settings for autocomplete, synchronized scrolling, parser selection, embedded export styles, Markdown highlighting, and preview zoom.
- Provide search and replace controls, including regular-expression, case-sensitive, whole-word, and confirmation options, plus an analytics panel.
- Save document content and settings in browser `localStorage`.
- Include a web manifest; `PWAManager` registers `sw.js` and handles an install prompt when the browser provides one. The service worker caches same-origin static files. This describes the shipped implementation only; browser support and resource availability determine its behavior.

## Usage

1. Write Markdown in the editor or import a `.md`/`.txt` file.
2. Read the preview and use the settings, search/replace, or analytics controls as needed.
3. Export the document as `.md` or `.html` when required.

## Local development and build

The repository has no tracked package manifest, lockfile, or project-local build configuration. It is a static ES-module application: serve the repository through a local HTTP server when testing module loading or service-worker behavior. No project-local installation or build command is defined.

## Structure

- `index.html` defines the interface, imports external browser libraries, and loads the application module.
- `src/script/` initializes the application and language controls.
- `src/ui/` provides editor, preview, analytics, and search/replace components; `src/utils/` provides parsing, storage, file, analytics, editor-action, and PWA helpers.
- `manifest.json` defines the app manifest, `sw.js` contains the same-origin cache strategy, and `src/tests/` contains browser-oriented Markdown parser tests.

## Technologies and runtime dependencies

The app uses browser HTML, CSS, JavaScript modules, `localStorage`, Web App Manifest, and Service Worker APIs. Its document loads CodeMirror 6 modules from esm.sh, Highlight.js 11.9.0 from cdnjs, and DOMPurify 3.0.5 plus Marked 9.1.6 from jsDelivr. No Node.js dependency configuration is tracked.

## License

Distribution and license terms are in [LICENSE](LICENSE), including the repository's additional project-specific terms.

## Author

The repository copyright notice identifies Denis Gutsuliak (`d9911.org`), 2024–2025.
