import { Action, ActionMapper } from './types';
import { HoldAction, AndActions, OrActions, NopAction, PushAction, PushDownAction, PushUpAction } from './action';

// Lift OrActions from inside of AndActions to top-level.
// Note that there is no ActionSet in ActionSet.actions(it's already flattened in each constructor).
export class LiftOrActions implements ActionMapper<Action[]> {
  visit(action: Action): Action[] {
    if (action instanceof AndActions) {
      const ors = action.actions.filter(act => act instanceof OrActions) as OrActions[];
      if (ors.length === 0) {
        return [action];
      }
      const others = action.actions.filter(act => act instanceof OrActions === false);
      if (others.length === 0) {
        return [ors.reduce((acm, or) => or.and(acm), NopAction.instance)];
      }
      const ands = others.length > 1 ? new AndActions(others) : others[0];
      return [ors.reduce((acm, or) => or.and(acm), ands)];
    }
    return [action];
  }
}

export class UniquePushActionSet implements ActionMapper<Action[]> {
  private uniquePushActions(actions: Action[]): Action[] {
    return actions.reduce((acm, action) => {
      if (action instanceof PushAction && acm.some(a => a instanceof PushAction && a.target === action.target)) {
        return acm;
      }
      if (action instanceof PushDownAction && acm.some(a => a instanceof PushDownAction && a.target === action.target)) {
        return acm;
      }
      if (action instanceof PushUpAction && acm.some(a => a instanceof PushUpAction && a.target === action.target)) {
        return acm;
      }
      return acm.concat(action);
    }, [] as Action[]);
  }
  visit(action: Action): Action[] {
    if (action instanceof AndActions || action instanceof OrActions) {
      action.actions = this.uniquePushActions(action.actions);
      return [action];
    }
    return [action];
  }
}

// Flatten single OrActions
// ActionSet([]) => remove
// ActionSet([a]) => a
export class FlattenActionSet implements ActionMapper<Action[]> {
  visit(action: Action) {
    if (action instanceof AndActions || action instanceof OrActions) {
      // clear if empty.
      if (action.actions.length === 0) {
        return [];
      }
      // flatten if single entry.
      if (action.actions.length === 1) {
        const singleAction = action.actions[0];

        // inherit binding from original ActionSet.
        singleAction.children = action.children;
        singleAction.ownerActionSet = action.ownerActionSet;
        singleAction.holdedBy = action.holdedBy;

        return [singleAction];
      }
    }
    return [action];
  }
}

// Clear Nop action from ast.
export class FilterNopAction implements ActionMapper<Action[]> {
  visit(action: Action) {
    if (action instanceof NopAction) {
      return [];
    }
    if (action instanceof AndActions || action instanceof OrActions) {
      action.actions = action.actions.reduce((acm, act) => acm.concat(act.acceptMapper(this)), [] as Action[]);
    }
    return [action];
  }
}

// a { x, y } => Hold(a, [x,y]) => [holdStart(a), x, y, holdEnd(b)]
export class ExtractHoldAction implements ActionMapper<Action[]> {
  visit(action: Action): Action[] {
    if (action instanceof HoldAction) {
      const holder = action.action;
      const children = action.children;
      if (children.some(child => child instanceof HoldAction)) {
        throw new Error("recursive holding syntax is not allowed!");
      }
      return [holder.asHoldStart(holder, children)].concat(children).concat(holder.asHoldEnd(holder, children));
    }
    return [action];
  }
}

// Guarantee 'or less' ast, just used for validation.
// or(a, b) => a, b
// (a, or(x,y)) => (a, x), (a, y)
// (a, or(x,y)){ children } => (a, x){ children }, (a, y){ children }
export class BrancheOr implements ActionMapper<Action[]> {
  visit(action: Action): Action[] {
    // or(a,b) => [a,b]
    if (action instanceof OrActions) {
      return action.actions;
    }
    // or(a,b){ children } => a{ children }, b{ children }
    if (action instanceof HoldAction && action.action instanceof OrActions) {
      const oldHoldAction = action;
      const orActions = action.action;
      return orActions.actions.map(act => new HoldAction(act, oldHoldAction.children));
    }
    // (a, or(x,y)){ children } => (a,x){ children }, (a,y){ children }
    if (action instanceof HoldAction && action.action instanceof AndActions && action.action.actions.some(a => a instanceof OrActions)) {
      const liftedOrActions = action.action.acceptMapper(new LiftOrActions())[0];
      const hold2 = new HoldAction(liftedOrActions, action.children);
      return hold2.acceptMapper(this);
    }
    // lift OrActions in AndActions
    // (a, or(x,y)) => or((a,x), (a,y)) => (a,x), (a,y)
    if (action instanceof AndActions && action.actions.some(act => act instanceof OrActions)) {
      const orActions = action.acceptMapper(new LiftOrActions())[0] as OrActions;
      return orActions.actions;
    }
    return [action];
  }
}