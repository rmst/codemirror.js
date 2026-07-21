import { LanguageSupport, LRLanguage } from '../../language/dist/index.js';

declare const wastLanguage: LRLanguage;
declare function wast(): LanguageSupport;

export { wast, wastLanguage };
