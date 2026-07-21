import { LanguageSupport, Language, LRLanguage } from '../../language/dist/index.js';

/**
A language provider based on the [Lezer YAML
parser](https://code.haverbeke.berlin/lezer/yaml), extended with
highlighting and indentation information.
*/
declare const yamlLanguage: LRLanguage;
/**
Language support for YAML.
*/
declare function yaml(): LanguageSupport;
/**
Returns language support for a document parsed as `config.content`
with an optional YAML "frontmatter" delimited by lines that
contain three dashes.
*/
declare function yamlFrontmatter(config: {
    content: Language | LanguageSupport;
}): LanguageSupport;

export { yaml, yamlFrontmatter, yamlLanguage };
