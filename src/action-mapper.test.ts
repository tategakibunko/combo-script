import { OrActions, AndActions, PushAction, NopAction, HoldAction } from "./action";
import { LiftOrActions, FilterNopAction, FlattenActionSet, UniquePushActionSet, BrancheOr } from './action-mapper';
import { CsAst } from "./ast";
import { ActionSet } from "./types";
import { compilePlainAst } from './compile';

test("Filter Nop action test", () => {
  const ast = new CsAst([
    new PushAction("a"),
    NopAction.instance,
    new PushAction("b"),
    new AndActions([
      new PushAction("x"),
      NopAction.instance,
      new PushAction("y"),
    ])
  ]);
  const ast2 = ast.acceptActionMapper(new FilterNopAction()) as CsAst;
  const actions = ast2.actions;
  expect(actions.length).toBe(3);
  const p1 = actions[0] as PushAction;
  const p2 = actions[1] as PushAction;
  expect(p1.target).toBe("a");
  expect(p2.target).toBe("b");
  const and = actions[2] as ActionSet;
  expect(and.actions.length).toBe(2);
  const andp1 = and.actions[0] as PushAction;
  const andp2 = and.actions[1] as PushAction;
  expect(andp1.target).toBe("x");
  expect(andp2.target).toBe("y");
})

// And([a]) => a
// Or([b]) => b
// And([]) => remove
// Or([]) => remove
test("Flatten Single ActionSet", () => {
  const ast = new CsAst([
    new AndActions([
      new PushAction("a")
    ]),
    new OrActions([
      new PushAction("b")
    ]),
    new AndActions([]),
    new OrActions([]),
    new PushAction("c")
  ]).acceptActionMapper(new FlattenActionSet()) as CsAst;

  expect(ast.actions.length).toBe(3);
  const p1 = ast.actions[0] as PushAction;
  const p2 = ast.actions[1] as PushAction;
  const p3 = ast.actions[2] as PushAction;
  expect(p1.target).toBe("a");
  expect(p2.target).toBe("b");
  expect(p3.target).toBe("c");
});

test("a * (x + y) = (a,x) + (a,y)", () => {
  const ast = compilePlainAst("(a, or(x,y))").acceptActionMapper(new LiftOrActions());
  const actions = ast.actions;
  const orActions = actions[0] as OrActions;
  expect(orActions instanceof OrActions).toBe(true);
  expect(orActions.actions.length).toBe(2);

  const and1 = orActions.actions[0] as AndActions;
  expect(and1 instanceof AndActions).toBe(true);
  expect(and1.actions.length).toBe(2);
  expect(and1.ownerActionSet === orActions).toBe(true);

  const and2 = orActions.actions[1] as AndActions;
  expect(and2 instanceof AndActions).toBe(true);
  expect(and2.actions.length).toBe(2);
  expect(and2.ownerActionSet === orActions).toBe(true);
});

test("(a, b) * (x + y) = (a,b,x) + (a,b,y)", () => {
  const ast = compilePlainAst("((a,b), or(x,y))").acceptActionMapper(new LiftOrActions());
  const actions = ast.actions;
  const orActions = actions[0] as OrActions;
  expect(orActions instanceof OrActions).toBe(true);

  const and1 = orActions.actions[0] as AndActions;
  const and2 = orActions.actions[1] as AndActions;

  expect((and1.actions as PushAction[]).map(action => action.target).join("")).toBe("xab");
  expect(and1.actions[0].ownerActionSet === and1).toBe(true);
  expect(and1.actions[1].ownerActionSet === and1).toBe(true);
  expect(and1.actions[2].ownerActionSet === and1).toBe(true);

  expect((and2.actions as PushAction[]).map(action => action.target).join("")).toBe("yab");
  expect(and2.actions[0].ownerActionSet === and2).toBe(true);
  expect(and2.actions[1].ownerActionSet === and2).toBe(true);
  expect(and2.actions[2].ownerActionSet === and2).toBe(true);
});

test("(x + y) * (a + b) = (x,a) + (x,b) + (y,a) + (y,b)", () => {
  const ast = compilePlainAst("(or(a,b), or(x,y))").acceptActionMapper(new LiftOrActions());
  const actions = ast.actions;
  const orActions = actions[0] as OrActions;
  const and0 = orActions.actions[0] as AndActions;
  const and1 = orActions.actions[1] as AndActions;
  const and2 = orActions.actions[2] as AndActions;
  const and3 = orActions.actions[3] as AndActions;
  expect(orActions instanceof OrActions).toBe(true);
  expect(orActions.actions.length).toBe(4); // (x,a), (y,a), (x,a), (y,b)
  expect(and0 instanceof AndActions).toBe(true);
  expect(and0.ownerActionSet === orActions).toBe(true);
  expect(and0.context.actionSetIndex).toBe(0);
  expect(and0.actions[0].ownerActionSet === and0).toBe(true);
  expect(and0.actions[1].ownerActionSet === and0).toBe(true);

  expect(and1 instanceof AndActions).toBe(true);
  expect(and1.ownerActionSet === orActions).toBe(true);
  expect(and1.context.actionSetIndex).toBe(1);
  expect(and1.actions[0].ownerActionSet === and1).toBe(true);
  expect(and1.actions[1].ownerActionSet === and1).toBe(true);

  expect(and2 instanceof AndActions).toBe(true);
  expect(and2.ownerActionSet === orActions).toBe(true);
  expect(and2.context.actionSetIndex).toBe(2);
  expect(and2.actions[0].ownerActionSet === and2).toBe(true);
  expect(and2.actions[1].ownerActionSet === and2).toBe(true);

  expect(and3 instanceof AndActions).toBe(true);
  expect(and3.ownerActionSet === orActions).toBe(true);
  expect(and3.context.actionSetIndex).toBe(3);
  expect(and3.actions[0].ownerActionSet === and3).toBe(true);
  expect(and3.actions[1].ownerActionSet === and3).toBe(true);
});

test("AndActions([a, b, a, b]) => AndActions([a, b])", () => {
  const ast = new AndActions([
    new PushAction("a"),
    new PushAction("b"),
    new PushAction("a"),
    new PushAction("b"),
  ]).acceptMapper(new UniquePushActionSet());
  expect(ast.length).toBe(1);
  const andActions = ast[0] as AndActions;
  expect(andActions instanceof AndActions).toBe(true);
  const actions = andActions.actions as PushAction[];
  expect(actions.length).toBe(2);
  expect(actions[0].target).toBe("a");
  expect(actions[1].target).toBe("b");
});

/*
  or(x, y){ children }
  => [
    Ast([Hold(x, children)]),
    Ast([Hold(y, children)])
  ]
*/
test("Branch OrHoldAction1", () => {
  const ast = new CsAst([
    new HoldAction(
      new OrActions([
        new PushAction("x"),
        new PushAction("y"),
      ]),
      [new PushAction("a")]
    ),
  ]);
  const branches = ast.acceptActionBrancher(new BrancheOr());
  expect(branches.length).toBe(2);
});

test("Branch OrHoldAction2", () => {
  const ast = new CsAst([
    new PushAction("L1"),
    new HoldAction(
      new OrActions([
        new PushAction("x"),
        new PushAction("y"),
      ]),
      [new PushAction("a")]
    ),
    new PushAction("R1"),
  ]);
  const branches = ast.acceptActionBrancher(new BrancheOr());
  expect(branches.length).toBe(2);
});

test("Branch OrHoldAction3(no branching)", () => {
  const ast = new CsAst([
    new PushAction("L1"),
    new PushAction("R1"),
  ]);
  const branches = ast.acceptActionBrancher(new BrancheOr());
  expect(branches.length).toBe(1);
});

test("Branch OrActions", () => {
  const ast = new CsAst([
    new OrActions([
      new PushAction("x"),
      new PushAction("y"),
    ]),
  ]);
  const branches = ast.acceptActionBrancher(new BrancheOr());
  expect(branches.length).toBe(2);
});
