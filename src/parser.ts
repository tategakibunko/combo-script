import { Lexer, Parser, Ast, Action, Token, TokenType, ButtonName } from './types';
import { PushAction, PushDownAction, RotateStickAction, MoveStickAction, SetStickAction, UnsetStickAction, TextAction, AndActions, PushUpAction, NopAction, TouchStickAction, PluginAction, HoldAction, OrActions } from './action';
import { CsAst } from "./ast";

export class CsParser implements Parser {
  constructor(private lexer: Lexer) { }

  private parseAction(token: Token): Action {
    // (a, b, c) => AndActions([a, b, c])
    if (token.type === "lparen") {
      const actions = this.parseActionsUntil("rparen");
      return new AndActions(actions);
    }
    if (token.type === "string") {
      return new TextAction(token.value, "normal");
    }
    if (token.type === "symbol") {
      const token2 = this.lexer.peekNext();
      if (token2 && token2.type === "lparen") {
        const _ = this.lexer.getNext(); // ignore lparen
        // or(a, b, c) => OrActions([a, b, c])
        if (token.value.toLowerCase() === "or") {
          const actions = this.parseActionsUntil("rparen");
          return new OrActions(actions);
        }
        const args = this.parseArgs();
        return this.parseFunc(token.value.toLowerCase(), args);
      }
      return new PushAction(token.value.toLowerCase() as string);
    }
    console.log(token);
    throw new Error("parse error! invalid syntax");
  }

  private parseArgs(): string[] {
    let args = [];
    while (true) {
      const token = this.lexer.getNext();
      if (token.type === "rparen") {
        break;
      }
      if (token.type === "comma") {
        continue;
      }
      args.push(token.value);
    }
    return args;
  }

  private parseFunc(funcName: string, args: string[]): Action {
    switch (funcName) {
      case "rotate": case "rotatel": return new RotateStickAction("lstick", parseInt(args[0]), parseInt(args[1]));
      case "rotater": return new RotateStickAction("rstick", parseInt(args[0]), parseInt(args[1]));
      case "move": case "movel": return new MoveStickAction("lstick", parseInt(args[0]), parseInt(args[1]));
      case "mover": return new MoveStickAction("rstick", parseInt(args[0]), parseInt(args[1]));
      case "set": case "setl": return new SetStickAction("lstick", parseInt(args[0]));
      case "setr": return new SetStickAction("rstick", parseInt(args[0]));
      case "unset": case "unsetl": return new UnsetStickAction("lstick", parseInt(args[0]));
      case "unsetr": return new UnsetStickAction("rstick", parseInt(args[0]));
      case "touch": case "touchl": return new TouchStickAction("lstick");
      case "touchr": return new TouchStickAction("rstick");
      case "pushdown": return new PushDownAction(args[0].toLowerCase() as ButtonName);
      case "pushup": return new PushUpAction(args[0].toLowerCase() as ButtonName);
      case "info": return new TextAction(args[0], "info");
      case "warn": return new TextAction(args[0], "warn");
      case "error": return new TextAction(args[0], "error");
      case "nop": return NopAction.instance;
    }
    return new PluginAction(funcName, args);
  }

  private parseActionsUntil(terminator: TokenType): Action[] {
    let actions = [];
    while (true) {
      const token = this.lexer.getNext();
      if (token.type === terminator) {
        break;
      }
      if (token.type === "comma") {
        continue;
      }
      const action = this.parseAction(token);
      actions.push(action);
    }
    return actions;
  }

  parse(): Ast {
    let actions: Action[] = [];
    while (this.lexer.hasNext()) {
      const token = this.lexer.getNext();
      if (token.type === "comma") {
        continue;
      }
      const action = this.parseAction(token);
      const token2 = this.lexer.peekNext();
      if (token2 && token2.type === "lcurl") {
        const _ = this.lexer.getNext(); // skip lcurl
        const children = this.parseActionsUntil("rcurl");
        actions.push(new HoldAction(action, children));
        continue;
      }
      actions.push(action);
    }
    return new CsAst(actions);
  }
}