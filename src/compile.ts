import { CompileResult, Ast, ValidationError } from './types';
import { CsAst } from './ast';
import { CsLexer } from './lexer';
import { CsParser } from './parser';
import { ExtractHoldAction, FilterNopAction, UniquePushActionSet, FlattenActionSet, LiftOrActions, BrancheOr } from './action-mapper'
import { ErrorChecker } from './validator';
import { TextAction } from './action';

export function compilePlainAst(source: string): Ast {
  return new CsParser(new CsLexer(source)).parse();
}

// Create special ast for debug(all holding OrActions are branched).
// [example]
// or(a,b){x} => [[a{x}] [b{x}]]
// or(a,b),x  => [[a,x], [b,x]]
export function createDebugBranch(plainAst: Ast): Ast[] {
  return plainAst
    .acceptActionMapper(new FilterNopAction())
    .acceptActionMapper(new UniquePushActionSet())
    .acceptActionMapper(new FlattenActionSet())
    // .acceptActionMapper(new LiftOrActions())
    .acceptActionBrancher(new BrancheOr()) // In BrancheOr, both branching and lifting are done.
    .map(branche => branche
      .acceptActionMapper(new ExtractHoldAction())
    );
  ;
}

export function optimizeAst(plainAst: Ast): Ast {
  return plainAst
    .acceptActionMapper(new ExtractHoldAction()) // a{ x, y } -> hold(a), x, y, unhold(a)
    .acceptActionMapper(new FilterNopAction()) // x, nop(), y -> x, y
    .acceptActionMapper(new UniquePushActionSet()) // (x, y, x) -> (x, y)
    .acceptActionMapper(new FlattenActionSet()) // (x), or(a, a) -> x, a
    .acceptActionMapper(new LiftOrActions()) // (a, or(x, y)) -> or((a, x), (a, y))
    ;
}

export function validateDebugBranch(debugBranch: Ast[]): ValidationError[] {
  return debugBranch.reduce((errors, ast) => {
    const errors2 = ast.acceptActionValidator(new ErrorChecker(ast));
    return errors.concat(errors2);
  }, [] as ValidationError[]);
}

export function compile(source: string): CompileResult {
  try {
    const plainAst = compilePlainAst(source);
    const debugBranch = createDebugBranch(plainAst);
    const optAst = optimizeAst(plainAst);
    const errors = validateDebugBranch(debugBranch);
    return { ast: optAst, errors };
  } catch (error) {
    console.error(error);
    const ast = new CsAst([new TextAction(error, "error")]);
    const errors: ValidationError[] = [{ ast, errorCode: "E_SYNTAX", errorMessage: error }];
    return { ast, errors };
  }
}
