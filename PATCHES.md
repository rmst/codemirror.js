# Local patches

Preserve these changes when importing upstream sources, until equivalent fixes land upstream.

- `@codemirror/merge`: prefer the start boundary of an empty line when constructing chunks, matching the end-boundary calculation. Previously, newline-aligned insertions/deletions could lose a character from their chunk's length, causing incremental updates to report changes in unchanged text. Source and both distributions are patched; `test/merge.test.js` covers the boundaries and repeated updates in both directions. The faulty calculation is still present in upstream revision `53c8f7b213332743a1f4f7d26bf40cfe2b512b53`.
