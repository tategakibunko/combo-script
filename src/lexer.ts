import { Lexer, Token } from './types';

const KEYWORDS: string[] = []

export class CsLexer implements Lexer {
  private buff: string;
  private tokens: Token[];
  private pos: number;

  constructor(source: string) {
    this.buff = this.normalize(source);
    this.pos = 0;
    this.tokens = []
    while (this.buff) {
      this.tokens.push(this.getToken());
    }
  }

  hasNext(): boolean {
    return this.pos < this.tokens.length;
  }

  getNext(): Token {
    return this.tokens[this.pos++];
  }

  peekNext(count = 0): Token {
    return this.tokens[this.pos + count];
  }

  private normalize(source: string): string {
    return source.trim();
  }

  private getToken(): Token {
    this.buff = this.buff.trim();
    const c1 = this.buff.charAt(0);
    switch (c1) {
      case ",":
        this.buff = this.buff.substring(1);
        return { type: "comma", value: c1 };
      case "(":
        this.buff = this.buff.substring(1);
        return { type: 'lparen', value: c1 };
      case "{":
        this.buff = this.buff.substring(1);
        return { type: 'lcurl', value: c1 };
      case "}":
        this.buff = this.buff.substring(1);
        return { type: 'rcurl', value: c1 };
      case ")":
        this.buff = this.buff.substring(1);
        return { type: 'rparen', value: c1 };
      case "\"":
      case "'":
        this.buff = this.buff.substring(1);
        let escaping = false, str = "";
        while (this.buff) {
          const c2 = this.buff.charAt(0);
          this.buff = this.buff.substring(1);
          if (!escaping && c2 === c1) {
            return { type: 'string', value: str };
          }
          if (!escaping && c2 === "\\") {
            escaping = true;
            str += c2;
          } else if (escaping) {
            escaping = false;
            str += c2;
          } else {
            str += c2;
          }
        }
        throw new Error("unclosed string literal found!");
      default:
        let m = this.buff.match(/^-?[0-9]+/);
        if (m) {
          const value = m[0];
          this.buff = this.buff.substring(value.length);
          return { type: 'number', value: String(parseInt(value)) }
        }
        m = this.buff.match(/^[a-zA-Z][a-zA-Z_\-0-9]*/);
        if (m) {
          const value = m[0];
          this.buff = this.buff.substring(value.length);
          if (KEYWORDS.find(keyword => keyword === value)) {
            return { type: 'keyword', value };
          }
          return { type: 'symbol', value }
        }
        m = this.buff.match(/^[^\s,({}]+/);
        if (m) {
          const value = m[0];
          this.buff = this.buff.substr(value.length);
          return { type: 'symbol', value }
        }
    }
    throw new Error("syntax error!");
  }
}

