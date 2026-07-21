import * as _codemirror_autocomplete from '../../autocomplete/dist/index.js';
import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer Sass
parser](https://code.haverbeke.berlin/lezer/sass), extended with
highlighting and indentation information.
*/
declare const sassLanguage: LRLanguage;
/**
Property, variable, $-variable, and value keyword completion
source.
*/
declare const sassCompletionSource: _codemirror_autocomplete.CompletionSource;
/**
Language support for CSS.
*/
declare function sass(config?: {
    /**
    When enabled, support classical indentation-based syntax. Default
    to false (SCSS syntax).
    */
    indented?: boolean;
}): LanguageSupport;

export { sass, sassCompletionSource, sassLanguage };
