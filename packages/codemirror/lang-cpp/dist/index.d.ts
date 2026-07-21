import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer C++
parser](https://code.haverbeke.berlin/lezer/cpp), extended with
highlighting and indentation information.
*/
declare const cppLanguage: LRLanguage;
/**
Language support for C++.
*/
declare function cpp(): LanguageSupport;

export { cpp, cppLanguage };
