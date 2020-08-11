import { AndActions, PushAction, OrActions } from './action';
import { ActionSet } from './types';

// AndActions([a, b, AndActions([x, y])]) => AndActions([a, b, x, y])
test("Recursive AndActions must be flattened on constructor", () => {
  const actions = [
    new PushAction("a"),
    new AndActions([
      new PushAction("b"),
      new AndActions([
        new PushAction("c"),
      ]),
    ]),
  ];
  const andActions = new AndActions(actions);
  expect(andActions.actions.length).toBe(3);
  expect(andActions.actions[0] instanceof PushAction).toBe(true);
  expect(andActions.actions[0].ownerActionSet).toBe(andActions);
  expect((andActions.actions[0] as PushAction).target).toBe("a");
  expect(andActions.actions[1] instanceof PushAction).toBe(true);
  expect(andActions.actions[1].ownerActionSet).toBe(andActions);
  expect((andActions.actions[1] as PushAction).target).toBe("b");
  expect(andActions.actions[2] instanceof PushAction).toBe(true);
  expect(andActions.actions[2].ownerActionSet).toBe(andActions);
  expect((andActions.actions[2] as PushAction).target).toBe("c");
});

test("Or(a) x b = Or(And(a, b))", () => {
  const or1 = new OrActions([new PushAction("a")]);
  const or2 = or1.and(new PushAction("b"));
  expect(or2.actions.length).toBe(1);
  expect(or2.actions[0] instanceof AndActions).toBe(true);
  const and = or2.actions[0] as AndActions;
  const p1 = and.actions[0] as PushAction;
  const p2 = and.actions[1] as PushAction;
  expect(and.actions.length).toBe(2);
  expect(p1.target).toBe("a");
  expect(p2.target).toBe("b");
});

test("Or(a, b) x c = Or(And(a, c), And(b, c))", () => {
  const or1 = new OrActions([new PushAction("a"), new PushAction("b")]);
  const or2 = or1.and(new PushAction("c"));
  expect(or2.actions.length).toBe(2);
  expect(or2.actions[0] instanceof AndActions).toBe(true);
  expect(or2.actions[1] instanceof AndActions).toBe(true);
  const and1 = or2.actions[0] as AndActions;
  const and2 = or2.actions[1] as AndActions;
  expect(and1.actions.length).toBe(2);
  expect(and2.actions.length).toBe(2);
  const a1p1 = and1.actions[0] as PushAction;
  const a1p2 = and1.actions[1] as PushAction;
  const a2p1 = and2.actions[0] as PushAction;
  const a2p2 = and2.actions[1] as PushAction;
  expect(a1p1.target).toBe("a");
  expect(a1p2.target).toBe("c");
  expect(a2p1.target).toBe("b");
  expect(a2p2.target).toBe("c");
});

test("Or(a) x And(b,c) = Or(And(a, b, c))", () => {
  const or1 = new OrActions([new PushAction("a")]);
  const or2 = or1.and(new AndActions([new PushAction("b"), new PushAction("c")]));
  expect(or2.actions.length).toBe(1);
  expect(or2.actions[0] instanceof AndActions).toBe(true);
  const and1 = or2.actions[0] as AndActions;
  expect(and1.actions.length).toBe(3);
  const a1p1 = and1.actions[0] as PushAction;
  const a1p2 = and1.actions[1] as PushAction;
  const a1p3 = and1.actions[2] as PushAction;
  expect(a1p1.target).toBe("a");
  expect(a1p2.target).toBe("b");
  expect(a1p3.target).toBe("c");
});

test("Or(a, b) x And(c, d) = Or(And(a, c, d), And(b, c, d))", () => {
  const or1 = new OrActions([new PushAction("a"), new PushAction("b")]);
  const or2 = or1.and(new AndActions([new PushAction("c"), new PushAction("d")]));
  expect(or2.actions.length).toBe(2);
  expect(or2.actions[0] instanceof AndActions).toBe(true);
  expect(or2.actions[1] instanceof AndActions).toBe(true);
  const and1 = or2.actions[0] as AndActions;
  const and2 = or2.actions[1] as AndActions;
  expect(and1.actions.length).toBe(3);
  expect(and2.actions.length).toBe(3);
  const a1p1 = and1.actions[0] as PushAction;
  const a1p2 = and1.actions[1] as PushAction;
  const a1p3 = and1.actions[2] as PushAction;
  const a2p1 = and2.actions[0] as PushAction;
  const a2p2 = and2.actions[1] as PushAction;
  const a2p3 = and2.actions[2] as PushAction;
  expect(a1p1.target).toBe("a");
  expect(a1p2.target).toBe("c");
  expect(a1p3.target).toBe("d");
  expect(a2p1.target).toBe("b");
  expect(a2p2.target).toBe("c");
  expect(a2p3.target).toBe("d");
});

test("Or(a, b) x Or(c, d) = Or(And(a, c), And(a, d), And(b, c), And(b, d))", () => {
  const or1 = new OrActions([new PushAction("a"), new PushAction("b")]);
  const or2 = or1.and(new OrActions([new PushAction("c"), new PushAction("d")]));
  expect(or2.actions.length).toBe(4);
  expect(or2.actions[0] instanceof AndActions).toBe(true);
  expect(or2.actions[1] instanceof AndActions).toBe(true);
  expect(or2.actions[2] instanceof AndActions).toBe(true);
  expect(or2.actions[3] instanceof AndActions).toBe(true);
  const and1 = or2.actions[0] as AndActions;
  const and2 = or2.actions[1] as AndActions;
  const and3 = or2.actions[2] as AndActions;
  const and4 = or2.actions[3] as AndActions;
  expect(and1.actions.length).toBe(2);
  expect(and2.actions.length).toBe(2);
  expect(and3.actions.length).toBe(2);
  expect(and4.actions.length).toBe(2);
  const a1p1 = and1.actions[0] as PushAction;
  const a1p2 = and1.actions[1] as PushAction;
  const a2p1 = and2.actions[0] as PushAction;
  const a2p2 = and2.actions[1] as PushAction;
  const a3p1 = and3.actions[0] as PushAction;
  const a3p2 = and3.actions[1] as PushAction;
  const a4p1 = and4.actions[0] as PushAction;
  const a4p2 = and4.actions[1] as PushAction;
  expect(a1p1.target).toBe("a");
  expect(a1p2.target).toBe("c");
  expect(a2p1.target).toBe("a");
  expect(a2p2.target).toBe("d");
  expect(a3p1.target).toBe("b");
  expect(a3p2.target).toBe("c");
  expect(a4p1.target).toBe("b");
  expect(a4p2.target).toBe("d");
});