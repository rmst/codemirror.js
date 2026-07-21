import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { history, undo, undoDepth } from "codemirror.js/commands"
import { javascript } from "codemirror.js/lang-javascript"
import { syntaxTree } from "codemirror.js/language"
import { EditorState } from "codemirror.js/state"
import { materialize } from "../scripts/materialize.js"

test("merged modules share one editor state implementation", () => {
	let state = EditorState.create({ doc: "const value = 1", extensions: [history(), javascript()] })
	state = state.update({ changes: { from: state.doc.length, insert: "\nvalue" } }).state
	assert.equal(undoDepth(state), 1)
	assert.equal(syntaxTree(state).topNode.name, "Script")

	assert.equal(undo({
		state,
		dispatch(transaction) {
			state = transaction.state
		},
	}), true)
	assert.equal(state.doc.toString(), "const value = 1")
})

test("every public CodeMirror module can be imported", async () => {
	const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)))
	const moduleNames = Object.keys(manifest.exports)
		.filter((name) => name === "." || (name.startsWith("./") && !name.includes("*") && !name.startsWith("./lezer/") && !name.startsWith("./marijn/") && !name.startsWith("./vendor/")))
		.map((name) => name === "." ? "codemirror.js" : `codemirror.js/${name.slice(2)}`)

	for (const name of moduleNames) await import(name)
})

test("runtime materialization is complete and self-contained", async () => {
	const output = await mkdtemp(join(tmpdir(), "codemirror-js-"))
	try {
		materialize(fileURLToPath(new URL("..", import.meta.url)), output)
		const manifest = JSON.parse(await readFile(join(output, "package.json")))
		const stateTarget = manifest.exports["./state"].import.replace(/^\.\//, "")
		const module = await import(new URL(stateTarget, `file://${output}/`))
		assert.equal(typeof module.EditorState.create, "function")
	} finally {
		await rm(output, { force: true, recursive: true })
	}
})
