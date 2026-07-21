import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer Lezer
parser](https://code.haverbeke.berlin/lezer/lezer-grammar), extended
with highlighting and indentation information.
*/
declare const lezerLanguage: LRLanguage;
/**
Language support for Lezer grammars.
*/
declare function lezer(): LanguageSupport;

export { lezer, lezerLanguage };
