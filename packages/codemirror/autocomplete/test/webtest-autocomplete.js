var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { autocompletion, startCompletion, currentCompletions, completionStatus, completeFromList, acceptCompletion, snippet, nextSnippetField } from "@codemirror/autocomplete";
import ist from "ist";
const Timeout = 1000, Chunk = 15;
class Runner {
    constructor() {
        this.tests = [];
    }
    test(name, spec, f) {
        this.tests.push({ name, spec, f });
    }
    options(name, doc, sources, list) {
        this.test(name, { doc, sources }, (view, sync) => {
            startCompletion(view);
            return sync(options, list);
        });
    }
    runTest(name, spec, f) {
        let syncing = null;
        let selection = spec.selection == null ? EditorSelection.single((spec.doc || "").length)
            : typeof spec.selection == "number" ? EditorSelection.single(spec.selection)
                : spec.selection;
        let view = new EditorView({
            state: EditorState.create({
                doc: spec.doc,
                selection,
                extensions: [
                    autocompletion({ override: spec.sources, interactionDelay: 0, updateSyncTime: 40, activateOnTypingDelay: 10 }),
                    EditorState.allowMultipleSelections.of(true)
                ]
            }),
            parent: document.querySelector("#workspace"),
            dispatchTransactions: trs => {
                if (syncing && syncing.get(trs[trs.length - 1].state) === syncing.value) {
                    syncing.resolve();
                    syncing = null;
                }
                view.update(trs);
            }
        });
        let sync = (get, value) => new Promise((resolve, reject) => {
            if (syncing)
                throw new Error("Overlapping syncs");
            if (get(view.state) === value)
                return resolve();
            let mine = syncing = { get, value, resolve };
            setTimeout(() => {
                if (syncing == mine)
                    reject(new Error(`${name}: Failed to sync: ${get(view.state)} !== ${value}\n`));
            }, Timeout);
        });
        return { view, promise: f(view, sync) };
    }
    finish(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let tests = this.tests;
            if (filter)
                tests = tests.filter(t => t.name.indexOf(filter) > -1);
            for (let from = 0; from < tests.length; from += Chunk) {
                let active = tests.slice(from, Math.min(tests.length, from + Chunk)).map(t => this.runTest(t.name, t.spec, t.f));
                let cleanup = () => {
                    for (let { view } of active)
                        view.destroy();
                };
                yield Promise.all(active.map(t => t.promise)).then(cleanup, err => { cleanup(); throw err; });
            }
        });
    }
}
function from(list) {
    return cx => {
        let word = cx.matchBefore(/\w+$/);
        if (!word && !cx.explicit)
            return null;
        return { from: word ? word.from : cx.pos, options: list.split(" ").map(w => ({ label: w })), validFor: /^\w*/ };
    };
}
function tagged(validFor) {
    return cx => {
        let word = cx.matchBefore(/\w+$/);
        return { from: word ? word.from : cx.pos, options: [{ label: "tag" + cx.pos }], validFor: validFor ? /^\w*/ : undefined };
    };
}
function sleep(delay) {
    return new Promise(resolve => setTimeout(() => resolve(undefined), delay));
}
function slow(c, delay) {
    return (cx) => new Promise(resolve => setTimeout(() => resolve(c(cx)), delay));
}
function once(c) {
    let done = false;
    return (cx) => {
        if (done)
            throw new Error("Used 'once' completer multiple times");
        done = true;
        return c(cx);
    };
}
function options(s) {
    return currentCompletions(s).map(c => / /.test(c.label) ? JSON.stringify(c.label) : c.label).join(" ");
}
function type(view, text) {
    let cur = view.state.selection.main.head;
    view.dispatch({ changes: { from: cur, insert: text },
        selection: { anchor: cur + text.length },
        userEvent: "input.type" });
}
function del(view) {
    let cur = view.state.selection.main.head;
    view.dispatch({ changes: { from: cur - 1, to: cur },
        userEvent: "delete.backward" });
}
const words = "one onetwothree OneTwoThree two three";
describe("autocomplete", () => {
    // Putting all tests together in a single `it` to allow them to run
    // concurrently.
    it("works", function () {
        this.timeout(5000);
        let run = new Runner;
        run.options("prefers by-word matches", "ott", [from(words)], "OneTwoThree onetwothree");
        run.options("can merge multiple sources", "one", [from(words), from("onet bonae")], "one onet onetwothree OneTwoThree bonae");
        run.options("only shows prefix matches for single-letter queries", "t", [from(words)], "three two");
        run.options("doesn't allow split matches for two-letter queries", "wr", [from(words)], "");
        run.options("prefers case-matched completions", "eTw", [from(words)], "OneTwoThree onetwothree");
        run.options("allows everything for empty patterns", "", [from("a b foo")], "a b foo");
        run.options("sorts alphabetically when score is equal", "a", [from("ac ab acc")], "ab ac acc");
        run.options("sorts by sortText when given", "a", [cx => ({ from: 0, to: 1, options: [{ label: "ab" }, { label: "ac", sortText: "aa" }] })], "ac ab");
        run.options("removes duplicate options", "t", [from("two"), from("two three")], "three two");
        run.options("handles all-uppercase words", "sel", [from("SCOPE_CATALOG SELECT SELECTIVE")], "SELECT SELECTIVE SCOPE_CATALOG");
        run.options("penalizes by-word matches with gaps", "abc", [from("xabc aVeryBigCar")], "xabc aVeryBigCar");
        run.options("prefers shorter options", "hair", [
            completeFromList(["aVerySmallChair", "Hairstyle", "chair", "BigChair"])
        ], "Hairstyle chair BigChair aVerySmallChair");
        run.test("will eagerly populate the result list when a source is slow", {
            doc: "on",
            sources: [from("one two"), slow(from("ono"), 100)]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one");
            yield sync(options, "one ono");
        }));
        run.test("starts completion on input", { sources: [from("one two")] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "o");
            yield sync(options, "one");
        }));
        run.test("further narrows completions on input", { sources: [once(from("one okay ono"))] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "o");
            yield sync(options, "okay one ono");
            type(view, "n");
            yield sync(options, "one ono");
            type(view, "e");
            yield sync(options, "one");
            type(view, "k");
            yield sync(options, "");
        }));
        run.test("doesn't abort on backspace", { sources: [once(from("one okay")), once(from("ohai"))] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "on");
            yield sync(options, "one");
            del(view);
            yield sync(options, "ohai okay one");
            del(view);
            yield sync(options, "");
        }));
        run.test("can backspace out entire word when explicit", { sources: [from("one two")] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one two");
            type(view, "o");
            yield sync(options, "one");
            del(view);
            yield sync(options, "one two");
        }));
        run.test("stops explicit completion on non-spanning input", { sources: [from("one two")] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one two");
            type(view, "o");
            yield sync(options, "one");
            type(view, " ");
            yield sync(options, "");
            del(view);
            yield sync(options, "");
        }));
        run.test("stops explicit completion when backspacing past start", {
            doc: "foo.o",
            sources: [from("one two")]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one");
            del(view);
            yield sync(options, "one two");
            del(view);
            yield sync(options, "");
        }));
        run.test("stops explicit completions for non-matching input", { sources: [from("one")] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one");
            type(view, "x");
            yield sync(options, "");
            del(view);
            yield sync(options, "");
        }));
        run.test("resets selection after refinement", {
            sources: [once(from("primitive-classnames print proxy"))]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            type(view, "p");
            yield sync(options, "primitive-classnames print proxy");
            type(view, "rin");
            yield sync(options, "print primitive-classnames");
            ist((_a = view.dom.querySelector("[aria-selected]")) === null || _a === void 0 ? void 0 : _a.textContent, "print");
        }));
        run.test("calls sources again when necessary", { sources: [tagged(true)] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "t");
            yield sync(options, "tag1");
            type(view, " t");
            yield sync(options, "tag3");
        }));
        run.test("always calls span-less sources", { sources: [tagged(false)] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "tag0");
            type(view, "ta");
            yield sync(options, "tag2");
            del(view);
            yield sync(options, "tag1");
            del(view);
            yield sync(options, "tag0");
        }));
        run.test("adjust completions when changes happen during query", {
            sources: [slow(once(from("one ok")), 100)]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "o");
            yield sleep(80);
            type(view, "n");
            yield sync(options, "one");
        }));
        run.test("doesn't cancel completions when deleting before they finish", {
            sources: [slow(tagged(false), 80)]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "ta");
            yield sleep(80);
            del(view);
            yield sync(options, "tag1");
        }));
        run.test("preserves the dialog on irrelevant changes", {
            sources: [from("one two")],
            doc: "woo o"
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "one");
            let dialog = view.dom.querySelector(".cm-tooltip");
            ist(dialog);
            view.dispatch({ changes: { from: 0, insert: "!" } });
            ist(view.dom.querySelector(".cm-tooltip"), dialog);
        }));
        run.test("replaces entire selected ranges", {
            sources: [from("one hey")],
            doc: "hello world",
            selection: EditorSelection.single(1, 5)
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "hey");
            acceptCompletion(view);
            ist(view.state.doc.toString(), "hey world");
        }));
        run.test("replaces inverted ranges", {
            sources: [from("one hey")],
            doc: "hello world",
            selection: EditorSelection.single(5, 1)
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "hey");
            acceptCompletion(view);
            ist(view.state.doc.toString(), "hey world");
        }));
        run.test("can cover range beyond cursor", {
            sources: [cx => ({ from: 0, to: 4, options: [{ label: "brrrr" }] })],
            doc: "brrr"
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "brrrr");
            acceptCompletion(view);
            ist(view.state.doc.toString(), "brrrr");
        }));
        run.test("complete from list", { sources: [once(completeFromList(["one", "two", "three"]))], doc: "t" }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "three two");
            type(view, "h");
            yield sync(options, "three");
            del(view);
            yield sync(options, "three two");
            del(view);
            yield sync(options, "one three two");
        }));
        run.test("complete from nonalphabetic list", {
            sources: [completeFromList(["$foo.bar", "$baz.boop", "$foo.quux"])]
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "x");
            yield sync(v => completionStatus(v), null);
            type(view, "$");
            yield sync(options, "$baz.boop $foo.bar $foo.quux");
            type(view, "foo.b");
            yield sync(options, "$foo.bar");
        }));
        let events = [];
        run.test("calls abort handlers", {
            sources: [(cx) => __awaiter(this, void 0, void 0, function* () {
                    events.push("start " + cx.aborted);
                    cx.addEventListener("abort", () => events.push("aborted"));
                    yield sleep(50);
                    events.push("fin " + cx.aborted);
                    return from("one two")(cx);
                })],
            doc: "one two\nthree four "
        }, (view) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sleep(80);
            view.dispatch({ selection: { anchor: 1 } });
            yield sleep(80);
            ist(events.join(", "), "start false, aborted, fin true");
        }));
        run.test("supports unfitered completions", {
            sources: [completeFromList(["one", "two"]), cx => ({ from: cx.pos, options: [{ label: "ok" }, { label: "hah" }], filter: false })],
            doc: "o"
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "ok hah one");
        }));
        run.test("will complete for multiple cursors", {
            sources: [from("okay")],
            doc: "o\no",
            selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)])
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "okay");
            yield sleep(80);
            acceptCompletion(view);
            ist(view.state.doc.toString(), "okay\nokay");
        }));
        run.test("will not complete for multiple cursors if prefix doesn't match", {
            sources: [from("okay allo")],
            doc: "o\na",
            selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)])
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "okay");
            acceptCompletion(view);
            ist(view.state.doc.toString(), "okay\na");
        }));
        run.test("can synchronously update results", { sources: [cx => ({
                    options: [{ label: "a" }, { label: "aha" }],
                    from: 0,
                    update: (r, from, to) => ({ options: r.options.filter(o => o.label.length > 1), from: r.from })
                })] }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            type(view, "a");
            yield sync(options, "a aha");
            type(view, "h");
            ist(options(view.state), "aha");
        }));
        run.test("preserves completion position when changes happen", {
            sources: [from("pow")],
            doc: "\n\n",
            selection: 2
        }, (view, sync) => __awaiter(this, void 0, void 0, function* () {
            startCompletion(view);
            yield sync(options, "pow");
            view.dispatch({ changes: { from: 0, insert: "woooooo" } });
            acceptCompletion(view);
            ist(view.state.doc.toString(), "woooooo\n\npow");
        }));
        run.test("selects the first snippet field and makes ${0} the final stop", {
            sources: []
        }, (view) => __awaiter(this, void 0, void 0, function* () {
            snippet("foo(${1:bar})${0}")(view, null, 0, 0);
            ist(view.state.doc.toString(), "foo(bar)");
            // The first placeholder is selected, not the ${0} exit stop.
            let sel = view.state.selection.main;
            ist(view.state.sliceDoc(sel.from, sel.to), "bar");
            // Tabbing once moves to ${0}: an empty selection at the end.
            nextSnippetField(view);
            let exit = view.state.selection.main;
            ist(exit.empty);
            ist(exit.from, 8);
        }));
        return run.finish();
    });
});
