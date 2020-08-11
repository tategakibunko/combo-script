import { Ast } from './types';
import { compile, compilePlainAst, createDebugBranch } from './compile';

// for debug
const compileDebugBranch = (source: string): Ast[] => {
  const ast = compilePlainAst(source);
  return createDebugBranch(ast);
}

test("Duplicate stick operation is not allowed", () => {
  const result = compile("(setL(90), setL(45))");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Can't push the button that is already pushed", () => {
  const result = compile("left { left }")
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Can't push the button that is already pushed2", () => {
  const result = compile("pushDown(left) left");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Non pushed button can't be pushed up", () => {
  const result = compile("pushUp(a)");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Non pushed button can't be pushed up2", () => {
  const result = compile("pushDown(a), pushUp(a)");
  const errors = result.errors;
  expect(errors.length === 0).toBe(true);
});

test("Invalid rotate value", () => {
  const result = compile("rotateL(0, 0)");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Invalid move value", () => {
  const result = compile("moveL(0, 0)");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Or Action duplicate check", () => {
  // (a, x), x -> error
  // (a, y), x -> not error
  const result = compile("(a, or(pushDown(x),y)), x");
  const errors = result.errors;
  expect(errors.length).toBe(1);
});

test("Or Action duplicate check2", () => {
  const result = compile("(a, or(x,y)){ L1 }");
  const errors = result.errors;
  expect(errors.length).toBe(0);
});

// (a, or(x, y)){ y }
// => or((a, x), (a, y)){ y }
// => (a,x){ y }, (a,y){ y }
test("Or Action duplicate check3", () => {
  // ok: (a, x){ y }
  // ng: (a, y){ y }
  const src = "(a, or(x, y)){ y }";
  const branche = compileDebugBranch(src);
  expect(branche.length).toBe(2);
  const result = compile(src);
  const errors = result.errors;
  // console.log(branch);
  // console.log(errors);
  // console.log(result.ast);
  expect(errors.length > 0).toBe(true);
});
