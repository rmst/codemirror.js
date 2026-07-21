import { LanguageSupport, LRLanguage } from '@codemirror/language';

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
