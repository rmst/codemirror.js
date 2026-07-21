# codemirror.js

A consolidated CodeMirror 6 source and distribution repository. It turns CodeMirror's coordinated package repositories and their runtime dependencies into one Git-pinnable, dependency-free package.

Every upstream package remains in its own directory under `packages/`, with its source, generated distribution, metadata, and license intact. Generated ESM imports are rewritten to relative paths so consumers need only this repository—there is no npm install at build or runtime.

The root package exposes CodeMirror modules under matching subpaths:

```js
import { EditorState } from "codemirror.js/state"
import { EditorView } from "codemirror.js/view"
import { javascript } from "codemirror.js/lang-javascript"
```

`provenance-lock.json` records the exact upstream Git revisions and npm artifacts used to produce the snapshot.

## Updating

Prepare an upstream CodeMirror development checkout using its documented install and build commands, then run:

```sh
node scripts/import-upstream.js /path/to/codemirror/dev
npm test
```

The importer replaces `packages/`, regenerates the root exports and provenance lock, and rejects unresolved internal runtime imports.

## License

CodeMirror, Lezer, and the bundled runtime support packages retain their upstream licenses in their package directories. The consolidation tooling is MIT licensed under [LICENSE](LICENSE).
