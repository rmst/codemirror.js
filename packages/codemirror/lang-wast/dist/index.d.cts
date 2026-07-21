import { LanguageSupport, LRLanguage } from '@codemirror/language';

declare const wastLanguage: LRLanguage;
declare function wast(): LanguageSupport;

export { wast, wastLanguage };
