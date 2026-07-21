import { LanguageSupport, LRLanguage } from '@codemirror/language';

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
