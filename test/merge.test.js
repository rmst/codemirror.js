import assert from "node:assert/strict"
import test from "node:test"

import { Change, Chunk } from "codemirror.js/merge"
import { EditorState, Text } from "codemirror.js/state"

test("merge chunks preserve empty-line insertion and deletion boundaries", () => {
	for (const oldText of ["\nunchanged\n", "heading\n\nunchanged\n", "heading\n"]) {
		const from = oldText.startsWith("heading") ? 8 : 0
		const inserted = "\nadded\n"
		const newText = oldText.slice(0, from) + inserted + oldText.slice(from)
		for (const reverse of [false, true]) {
			const a = Text.of((reverse ? newText : oldText).split("\n"))
			const b = Text.of((reverse ? oldText : newText).split("\n"))
			const change = new Change(from, from + (reverse ? inserted.length : 0), from, from + (reverse ? 0 : inserted.length))
			const chunks = Chunk.build(a, b, { override: () => [change] })
			assert.equal(chunks.length, 1)
			const [chunk] = chunks
			assert.deepEqual([chunk.fromA, chunk.toA, chunk.fromB, chunk.toB], [change.fromA, change.toA, change.fromB, change.toB])
		}
	}
})

test("incremental merge updates do not mark unchanged lines after an empty-line insertion", () => {
	const unchanged = Array.from({ length: 100 }, (_, index) => `Paragraph ${index}: unchanged text.\n\n`).join("")
	const oldText = `heading\n\n${unchanged}`
	const newText = `heading\n\nadded\n\n${unchanged}`
	for (const reverse of [false, true]) {
		const fixed = EditorState.create({ doc: oldText })
		let changing = EditorState.create({ doc: newText })
		const change = reverse ? new Change(8, 15, 8, 8) : new Change(8, 8, 8, 15)
		const a = reverse ? changing : fixed
		const b = reverse ? fixed : changing
		let chunks = Chunk.build(a.doc, b.doc, { override: () => [change] })
		for (const text of ["revised", "again", "added"]) {
			const line = changing.doc.line(3)
			const transaction = changing.update({ changes: { from: line.from, to: line.to, insert: text } })
			changing = transaction.state
			chunks = reverse
				? Chunk.updateA(chunks, changing.doc, fixed.doc, transaction.changes)
				: Chunk.updateB(chunks, fixed.doc, changing.doc, transaction.changes)
			const fresh = reverse ? Chunk.build(changing.doc, fixed.doc) : Chunk.build(fixed.doc, changing.doc)
			assert.deepEqual(chunks, fresh)
			assert.equal(chunks.length, 1)
		}
	}
})
