import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, "..")
const sourceRoot = resolve(process.argv[2] || "")

if (!process.argv[2]) throw new Error("usage: node scripts/import-upstream.js /path/to/codemirror/dev")
if (!existsSync(join(sourceRoot, "bin", "packages.js"))) throw new Error(`not a CodeMirror development checkout: ${sourceRoot}`)
if (!existsSync(join(sourceRoot, "package-lock.json"))) throw new Error("the upstream checkout must be installed so package-lock.json and runtime dependencies are available")

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const require = createRequire(import.meta.url)
const { all: codeMirrorDirectories } = require(join(sourceRoot, "bin", "packages.js"))
const packageLock = readJson(join(sourceRoot, "package-lock.json"))

const officialRoots = new Map(codeMirrorDirectories.map((directory) => {
	const root = join(sourceRoot, directory)
	if (!existsSync(join(root, "package.json"))) throw new Error(`missing upstream package: ${directory}`)
	return [readJson(join(root, "package.json")).name, root]
}))

const sourceRootForPackage = (name) => officialRoots.get(name) || join(sourceRoot, "node_modules", ...name.split("/"))
const packages = new Map()
const queue = [...officialRoots.keys()]

while (queue.length > 0) {
	const name = queue.shift()
	if (packages.has(name)) continue
	const root = sourceRootForPackage(name)
	if (!existsSync(join(root, "package.json"))) throw new Error(`runtime dependency ${name} was not installed in ${sourceRoot}`)
	const manifest = readJson(join(root, "package.json"))
	packages.set(name, { manifest, root })
	queue.push(...Object.keys(manifest.dependencies || {}))
}

const hasRootEntry = (name) => {
	const { manifest } = packages.get(name)
	if (manifest.module || manifest.browser || manifest.main) return true
	if (!manifest.exports) return false
	if (typeof manifest.exports === "string" || Array.isArray(manifest.exports)) return true
	const keys = Object.keys(manifest.exports)
	return !keys.some((key) => key.startsWith(".")) || Object.hasOwn(manifest.exports, ".")
}

const packageRelativeDirectory = (name) => {
	if (name === "codemirror") return join("packages", "codemirror", "basic-setup")
	if (name.startsWith("@codemirror/")) return join("packages", "codemirror", name.slice("@codemirror/".length))
	if (name.startsWith("@lezer/")) return join("packages", "lezer", name.slice("@lezer/".length))
	if (name.startsWith("@marijn/")) return join("packages", "marijn", name.slice("@marijn/".length))
	return join("packages", "vendor", ...name.split("/"))
}

const stagingRoot = join(repositoryRoot, ".import-staging")
rmSync(stagingRoot, { force: true, recursive: true })
mkdirSync(stagingRoot, { recursive: true })

for (const [name, { root }] of packages) {
	const target = join(stagingRoot, packageRelativeDirectory(name))
	mkdirSync(dirname(target), { recursive: true })
	cpSync(root, target, {
		filter: (source) => !relative(root, source).split(sep).some((part) => part === ".git" || part === "node_modules"),
		recursive: true,
	})
}

const packageTargetRoot = (name) => join(stagingRoot, packageRelativeDirectory(name))
const conditionalTarget = (target) => {
	if (typeof target === "string") return target
	if (Array.isArray(target)) return conditionalTarget(target[0])
	if (!target || typeof target !== "object") return null
	for (const condition of ["import", "browser", "default", "module", "node"]) {
		const found = conditionalTarget(target[condition])
		if (found) return found
	}
	return Object.values(target).map(conditionalTarget).find(Boolean) || null
}

const exportedTarget = (name, subpath = "") => {
	const { manifest } = packages.get(name)
	const request = subpath ? `./${subpath}` : "."
	const exports = manifest.exports
	let target = null
	if (typeof exports === "string" || Array.isArray(exports)) {
		target = subpath ? null : conditionalTarget(exports)
	} else if (exports && typeof exports === "object") {
		const exportKeys = Object.keys(exports)
		if (!exportKeys.some((key) => key.startsWith("."))) {
			target = subpath ? null : conditionalTarget(exports)
		} else {
			target = conditionalTarget(exports[request])
			if (!target) {
				for (const [pattern, value] of Object.entries(exports)) {
					if (!pattern.includes("*")) continue
					const [prefix, suffix] = pattern.split("*")
					if (!request.startsWith(prefix) || !request.endsWith(suffix)) continue
					const matched = request.slice(prefix.length, request.length - suffix.length)
					target = conditionalTarget(value)?.replaceAll("*", matched) || null
					if (target) break
				}
			}
		}
	}
	if (!target && subpath) target = `./${subpath}`
	if (!target) target = manifest.module || manifest.browser || manifest.main || "./index.js"
	if (target.endsWith(".cjs")) {
		const esmTarget = target.replace(/\.cjs$/, ".js")
		if (existsSync(join(packageTargetRoot(name), esmTarget))) target = esmTarget
	}
	let absolute = join(packageTargetRoot(name), target.replace(/^\.\//, ""))
	if (!existsSync(absolute) && existsSync(`${absolute}.js`)) absolute += ".js"
	if (!existsSync(absolute)) throw new Error(`cannot resolve ${name}${subpath ? `/${subpath}` : ""} to ${target}`)
	return absolute
}

const packageRequest = (specifier) => {
	if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#")) return null
	const parts = specifier.split("/")
	const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
	if (!packages.has(name)) return null
	return { name, subpath: parts.slice(name.startsWith("@") ? 2 : 1).join("/") }
}

const relativeImport = (from, to) => {
	const path = relative(dirname(from), to).split(sep).join("/")
	return path.startsWith(".") ? path : `./${path}`
}

const runtimeQueue = []
const runtimeFiles = new Set()
const enqueueRuntime = (file) => {
	if (!file || runtimeFiles.has(file)) return
	runtimeFiles.add(file)
	runtimeQueue.push(file)
}

const relativeRuntimeTarget = (file, specifier) => {
	if (!specifier.startsWith(".")) return null
	const target = resolve(dirname(file), specifier)
	for (const candidate of [target, `${target}.js`, `${target}.mjs`, join(target, "index.js")]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
	}
	return null
}

const rewriteRuntimeImports = (file, { follow = true } = {}) => {
	const original = readFileSync(file, "utf8")
	const rewritten = original.replace(/\b(from|import)\s*(\(\s*)?(["'])([^"']+)\3/g, (match, keyword, call, quote, specifier) => {
		const request = packageRequest(specifier)
		if (request) {
			const target = exportedTarget(request.name, request.subpath)
			if (follow) enqueueRuntime(target)
			return `${keyword}${call || " "}${quote}${relativeImport(file, target)}${quote}`
		}
		if (follow) enqueueRuntime(relativeRuntimeTarget(file, specifier))
		return match
	})
	if (rewritten !== original) writeFileSync(file, rewritten)
}

const walk = (directory, visit) => {
	for (const name of readdirSync(directory)) {
		const path = join(directory, name)
		if (statSync(path).isDirectory()) walk(path, visit)
		else visit(path)
	}
}

for (const name of packages.keys()) {
	const { manifest } = packages.get(name)
	const exports = manifest.exports
	const keys = exports && typeof exports === "object" ? Object.keys(exports) : []
	const rootExported = manifest.module || manifest.browser || manifest.main || !exports || !keys.some((key) => key.startsWith(".")) || Object.hasOwn(exports, ".")
	if (rootExported) enqueueRuntime(exportedTarget(name))
}
walk(join(stagingRoot, packageRelativeDirectory("@codemirror/legacy-modes"), "mode"), (file) => {
	if (/\.js$/.test(file)) enqueueRuntime(file)
})

while (runtimeQueue.length > 0) rewriteRuntimeImports(runtimeQueue.shift())

walk(join(stagingRoot, "packages"), (file) => {
	if (/\.(?:d\.ts|d\.mts)$/.test(file) && /[\\/](?:dist|lib|mode)[\\/]/.test(file)) rewriteRuntimeImports(file, { follow: false })
})

const unresolved = []
for (const file of runtimeFiles) {
	const content = readFileSync(file, "utf8")
	for (const match of content.matchAll(/\b(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)) {
		if (packageRequest(match[1])) unresolved.push(`${relative(stagingRoot, file)}: ${match[1]}`)
	}
}
if (unresolved.length > 0) throw new Error(`unresolved merged-package imports:\n${unresolved.join("\n")}`)

const typeTarget = (name) => {
	const { manifest } = packages.get(name)
	let target = manifest.types || manifest.typings || null
	if (!target && manifest.exports && typeof manifest.exports === "object") {
		const rootExport = Object.keys(manifest.exports).some((key) => key.startsWith(".")) ? manifest.exports["."] : manifest.exports
		if (rootExport && typeof rootExport === "object") target = conditionalTarget(rootExport.types)
	}
	return target && existsSync(join(packageTargetRoot(name), target.replace(/^\.\//, "")))
		? join(packageTargetRoot(name), target.replace(/^\.\//, ""))
		: null
}

const exportName = (name) => {
	if (name === "codemirror") return "."
	if (name.startsWith("@codemirror/")) return `./${name.slice("@codemirror/".length)}`
	if (name.startsWith("@lezer/")) return `./lezer/${name.slice("@lezer/".length)}`
	if (name.startsWith("@marijn/")) return `./marijn/${name.slice("@marijn/".length)}`
	return `./vendor/${name}`
}

const repositoryRelative = (path) => `./${relative(stagingRoot, path).split(sep).join("/")}`
const exports = Object.fromEntries([...packages.keys()].filter(hasRootEntry).sort().map((name) => {
	const importTarget = repositoryRelative(exportedTarget(name))
	const types = typeTarget(name)
	return [exportName(name), types ? { types: repositoryRelative(types), import: importTarget } : importTarget]
}))
exports["./legacy-modes/mode/*"] = {
	types: "./packages/codemirror/legacy-modes/mode/*.d.ts",
	import: "./packages/codemirror/legacy-modes/mode/*.js",
}

const packageManifestPath = join(repositoryRoot, "package.json")
const packageManifest = readJson(packageManifestPath)
packageManifest.exports = exports
writeFileSync(packageManifestPath, `${JSON.stringify(packageManifest, null, "\t")}\n`)

const gitValue = (root, ...args) => {
	try {
		return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
	} catch {
		return null
	}
}

const provenance = {
	format: 1,
	packages: Object.fromEntries([...packages].sort(([a], [b]) => a.localeCompare(b)).map(([name, { manifest, root }]) => {
		const official = officialRoots.has(name)
		const lockKey = `node_modules/${name}`
		const locked = packageLock.packages?.[lockKey] || {}
		return [name, {
			version: manifest.version,
			license: manifest.license || null,
			...(official ? {
				kind: "git",
				repository: gitValue(root, "config", "--get", "remote.origin.url"),
				revision: gitValue(root, "rev-parse", "HEAD"),
			} : {
				kind: "npm",
				resolved: locked.resolved || null,
				integrity: locked.integrity || null,
			}),
		}]
	})),
}
writeFileSync(join(repositoryRoot, "provenance-lock.json"), `${JSON.stringify(provenance, null, "\t")}\n`)

const packagesTarget = join(repositoryRoot, "packages")
rmSync(packagesTarget, { force: true, recursive: true })
renameSync(join(stagingRoot, "packages"), packagesTarget)
rmSync(stagingRoot, { force: true, recursive: true })

console.log(`imported ${packages.size} packages from ${sourceRoot}`)
