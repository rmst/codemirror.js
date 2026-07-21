import * as _codemirror_autocomplete from '../../autocomplete/dist/index.js';
import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

/**
A language provider for Less style sheets.
*/
declare const lessLanguage: LRLanguage;
/**
Property, variable, @-variable, and value keyword completion
source.
*/
declare const lessCompletionSource: _codemirror_autocomplete.CompletionSource;
/**
Language support for Less.
*/
declare function less(): LanguageSupport;

export { less, lessCompletionSource, lessLanguage };
