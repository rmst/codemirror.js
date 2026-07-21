import {LRParser} from "../../lr/dist/index.js"
import {Input, PartialParse, Parser, TreeCursor, ParseWrapper} from "../../common/dist/index.js"

export const parser: LRParser

export function configureNesting(tags?: readonly {
  tag: string,
  attrs?: (attrs: {[attr: string]: string}) => boolean,
  parser: Parser
}[], attributes?: {
  name: string,
  tagName?: string,
  parser: Parser
}[]): ParseWrapper
