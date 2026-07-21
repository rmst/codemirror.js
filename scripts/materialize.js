import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

export function materialize(sourceRoot, outputRoot) {
	const source = resolve(sourceRoot)
	const output = resolve(outputRoot)
	const runtimeFilesPath = join(source, "runtime-files.json")
	if (!existsSync(runtimeFilesPath)) throw new Error(`missing ${runtimeFilesPath}`)

	const files = ["LICENSE", "package.json", "provenance-lock.json", "runtime-files.json", ...JSON.parse(readFileSync(runtimeFilesPath, "utf8"))]
	for (const relativePath of files) {
		const from = join(source, relativePath)
		const to = join(output, relativePath)
		if (!existsSync(from)) throw new Error(`materialized file does not exist: ${relativePath}`)
		mkdirSync(dirname(to), { recursive: true })
		cpSync(from, to)
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	if (process.argv.length !== 4) throw new Error("usage: node scripts/materialize.js SOURCE_ROOT OUTPUT_ROOT")
	materialize(process.argv[2], process.argv[3])
}
