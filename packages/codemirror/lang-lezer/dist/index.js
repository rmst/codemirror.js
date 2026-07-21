import { parser } from '../../../lezer/lezer/dist/index.js';
import { LRLanguage, foldNodeProp, foldInside, LanguageSupport } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer Lezer
parser](https://code.haverbeke.berlin/lezer/lezer-grammar), extended
with highlighting and indentation information.
*/
const lezerLanguage = /*@__PURE__*/LRLanguage.define({
    name: "lezer",
    parser: /*@__PURE__*/parser.configure({
        props: [
            /*@__PURE__*/foldNodeProp.add({
                "Body TokensBody SkipBody PrecedenceBody": foldInside
            })
        ]
    }),
    languageData: {
        commentTokens: { block: { open: "/*", close: "*/" }, line: "//" },
        indentOnInput: /^\s*\}$/
    }
});
/**
Language support for Lezer grammars.
*/
function lezer() {
    return new LanguageSupport(lezerLanguage);
}

export { lezer, lezerLanguage };
