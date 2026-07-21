import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer Java
parser](https://code.haverbeke.berlin/lezer/java), extended with
highlighting and indentation information.
*/
declare const javaLanguage: LRLanguage;
/**
Java language support.
*/
declare function java(): LanguageSupport;

export { java, javaLanguage };
