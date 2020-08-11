const tuple = <T extends string>(...args: T[]): T[] => args;

export type ButtonName = string;
export type StickName = 'lstick' | 'rstick'

export const FuncNames = tuple(
  'rotate', // same as rotateL
  'rotatel',
  'rotater',
  'move', // same as moveL
  'movel',
  'mover',
  'set', // same as setL
  'setl',
  'setr',
  'unset', // same as setL
  'unsetl',
  'unsetr',
  'touch', // same as touchL
  'touchl',
  'touchr',
  'pushdown',
  'pushup',
  'info',
  'warn',
  'error',
  'nop')

export type FuncName = (typeof FuncNames)[number]

export type TokenType = "keyword" | "symbol" | "string" | "number" | "lparen" | "rparen" | "lcurl" | "rcurl" | "comma"
const KEYWORDS: string[] = [] // nothing yet.

export type ErrorCode =
  "E_SYNTAX" |
  "E_ACTION_SET" |
  "E_STICK" |
  "E_PUSH" |
  "E_PUSH_UP" |
  "E_ROTATE" |
  "E_MOVE" |
  "E_SET_ROTATE" |
  "E_TEXT"

export interface Token {
  type: TokenType;
  value: string;
}

export interface ValidationError {
  ast: Ast; // debugging ast(not same as CompileResult.ast)
  errorCode: ErrorCode;
  errorMessage: string;
}

export interface ValidationContext {
  leftStickAngle: number; // -1 is unset
  rightStickAngle: number;
  pushingButtons: string[];
  errors: ValidationError[];
}

export interface CompileResult {
  ast: Ast;
  errors: ValidationError[];
}

export interface Lexer {
  hasNext: () => boolean;
  getNext: () => Token;
  peekNext: () => Token;
}

export interface Parser {
  parse: (source: string) => Ast;
}

export interface Ast {
  actions: Action[]; // sometimes required by validator
  acceptActionPlayer: (player: ActionPlayer) => Promise<any>;
  acceptActionMapper: (mapper: ActionMapper<Action[]>) => Ast;
  acceptActionBrancher: (mapper: ActionMapper<Action[]>) => Ast[];
  acceptActionValidator: (validator: ActionValidator) => ValidationError[];
}

export interface Action {
  ownerActionSet?: ActionSet; // ownerActionSet
  holdedBy?: Action;
  children: Action[];
  context: ActionContext;
  clone: () => Action;
  asHoldStart: (children: Action[]) => Action;
  asHoldEnd: (children: Action[]) => Action;
  toString: () => string;
  acceptMapper: <T>(visitor: ActionMapper<T>) => T;
  acceptPlayer: (visitor: ActionPlayer) => Promise<any>;
  acceptValidator: (visitor: ActionValidator, context: ValidationContext) => ValidationContext;
}

export interface ActionSet extends Action {
  actions: Action[]; // actions that must be done at the same time.
}

export type ActionTextGroup = "normal" | "info" | "warn" | "error"

export interface ActionContext {
  action: Action;
  ownerActionSet?: ActionSet;
  actionSetIndex: number;
  holdedBy?: Action;
  children: Action[];
}

export interface ActionMapper<T> {
  visit: (action: Action) => T;
}

export interface ActionValidator {
  visit: (action: Action, context: ValidationContext) => ValidationContext;
}

export interface ActionPlayer {
  reset: () => void;
  visitPush: (target: ButtonName, context: ActionContext) => Promise<any>;
  visitPushDown: (target: ButtonName, context: ActionContext) => Promise<any>;
  visitPushUp: (target: ButtonName, context: ActionContext) => Promise<any>;
  visitRotate: (target: StickName, fromAngle: number, toAngle: number, context: ActionContext) => Promise<any>;
  visitMove: (target: StickName, fromAngle: number, toAngle: number, context: ActionContext) => Promise<any>;
  visitSet: (target: StickName, toAngle: number, context: ActionContext) => Promise<any>;
  visitUnset: (target: StickName, fromAngle: number, context: ActionContext) => Promise<any>;
  visitTouch: (target: StickName, context: ActionContext) => Promise<any>;
  visitAndActions: (actions: Action[], context: ActionContext) => Promise<any>;
  visitOrActions: (actions: Action[], context: ActionContext) => Promise<any>;
  visitPlugin: (name: string, args: string[], context: ActionContext) => Promise<any>;
  visitPluginHoldStart: (name: string, args: string[], context: ActionContext) => Promise<any>;
  visitPluginHoldEnd: (name: string, args: string[], context: ActionContext) => Promise<any>;
  visitText: (text: string, group: ActionTextGroup, context: ActionContext) => Promise<any>;
}
