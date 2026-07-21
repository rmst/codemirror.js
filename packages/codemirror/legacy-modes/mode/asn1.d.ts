import {StreamParser} from "../../language/dist/index.js"
export declare function asn1(conf: {
  keywords?: {[word: string]: any},
  cmipVerbs?: {[word: string]: any},
  compareTypes?: {[word: string]: any},
  status?: {[word: string]: any},
  tags?: {[word: string]: any},
  storage?: {[word: string]: any},
  modifier?: {[word: string]: any},
  accessTypes?: {[word: string]: any},
  multiLineStrings?: boolean
}): StreamParser<unknown>
