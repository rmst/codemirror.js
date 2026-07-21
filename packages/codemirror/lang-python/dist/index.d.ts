import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';
import * as _codemirror_autocomplete from '../../autocomplete/dist/index.js';
import { CompletionContext, CompletionResult } from '../../autocomplete/dist/index.js';

/**
Completion source that looks up locally defined names in
Python code.
*/
declare function localCompletionSource(context: CompletionContext): CompletionResult | null;
/**
Autocompletion for built-in Python globals and keywords.
*/
declare const globalCompletion: _codemirror_autocomplete.CompletionSource;

/**
A language provider based on the [Lezer Python
parser](https://code.haverbeke.berlin/lezer/python), extended with
highlighting and indentation information.
*/
declare const pythonLanguage: LRLanguage;
/**
Python language support.
*/
declare function python(): LanguageSupport;

export { globalCompletion, localCompletionSource, python, pythonLanguage };
