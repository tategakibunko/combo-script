import { Action, StickName, ActionValidator, ValidationContext, ButtonName, ValidationError, ActionContext, Ast } from "./types";
import { PushAction, PushDownAction, PushUpAction, RotateStickAction, MoveStickAction, SetStickAction, UnsetStickAction, AndActions, OrActions } from "./action";

type PushGroup = PushAction | PushDownAction | PushUpAction;
type StickGroup = RotateStickAction | MoveStickAction | SetStickAction | UnsetStickAction;

const isPushGroup = (action: Action): action is PushGroup => {
  return action instanceof PushAction || action instanceof PushDownAction || action instanceof PushUpAction;
}
const isStickGroup = (action: Action): action is StickGroup => {
  return action instanceof RotateStickAction || action instanceof MoveStickAction || action instanceof SetStickAction || action instanceof UnsetStickAction;
}

export class ErrorChecker implements ActionValidator {
  constructor(
    private ast: Ast
  ) { }

  visit(action: Action, context: ValidationContext): ValidationContext {
    if (action instanceof AndActions) {
      return this.visitAndActions(action.actions, action.context, context);
    }
    // In validation phase, holded OrActions must be splitted to each brances(by 'BrancheOr' class).
    if (action instanceof OrActions) {
      console.warn("OrActions is not branched!")
      return context;
    }
    if (action instanceof PushAction) {
      return this.visitPush(action.target, action.context, context);
    }
    if (action instanceof PushDownAction) {
      return this.visitPushDown(action.target, action.context, context);
    }
    if (action instanceof PushUpAction) {
      return this.visitPushUp(action.target, action.context, context);
    }
    if (action instanceof RotateStickAction) {
      return this.visitRotate(action.target, action.fromAngle, action.toAngle, action.context, context);
    }
    if (action instanceof MoveStickAction) {
      return this.visitMove(action.target, action.fromAngle, action.toAngle, action.context, context);
    }
    return context;
  }
  private visitAndActions(actions: Action[], acontext: ActionContext, context: ValidationContext): ValidationContext {
    const pushGroup = actions.filter(isPushGroup);
    const stickGroup = actions.filter(isStickGroup);
    let context2 = this.visitAndActionsPushGroup(pushGroup, acontext, context);
    context2 = this.visitAndActionsStickGroup(stickGroup, acontext, context2);
    return actions.reduce((ctx, action) => action.acceptValidator(this, ctx), context2);
  }
  private visitAndActionsPushGroup(actions: PushGroup[], acontext: ActionContext, context: ValidationContext): ValidationContext {
    let errors: ValidationError[] = [];
    let pushCount: { [buttonName: string]: number } = {};
    actions.forEach(action => pushCount[action.target] = pushCount[action.target] ? pushCount[action.target] + 1 : 1);
    for (let buttonName in pushCount) {
      if (pushCount[buttonName] >= 2) {
        errors.push({
          ast: this.ast,
          errorCode: "E_ACTION_SET",
          errorMessage: `Duplicate pushDown or pushUp for "${buttonName}" is detected`
        });
      }
    }
    return { ...context, errors: context.errors.concat(errors) };
  }
  private visitAndActionsStickGroup(actions: StickGroup[], acontext: ActionContext, context: ValidationContext): ValidationContext {
    let errors: ValidationError[] = [];
    let stickCount: { [stickName: string]: number } = {};
    actions.forEach(action => stickCount[action.target] = stickCount[action.target] ? stickCount[action.target] + 1 : 1);
    for (let stickName in stickCount) {
      if (stickCount[stickName] >= 2) {
        errors.push({
          ast: this.ast,
          errorCode: "E_ACTION_SET",
          errorMessage: `Duplicate stick operation for "${stickName}" is detected`
        });
      }
    }
    return { ...context, errors: context.errors.concat(errors) }
  }
  private visitPush(target: ButtonName, acontext: ActionContext, context: ValidationContext): ValidationContext {
    if (context.pushingButtons.includes(target)) {
      return {
        ...context, errors: context.errors.concat({
          ast: this.ast,
          errorCode: "E_PUSH",
          errorMessage: `Double push for "${target}" can't be done("${target}" is already pushed).`,
        })
      };
    }
    return context;
  }
  private visitPushDown(target: ButtonName, acontext: ActionContext, context: ValidationContext): ValidationContext {
    if (context.pushingButtons.includes(target)) {
      const errorMessage = `Double pushDown for "${target}" can't be done("${target}" is already pushed).`;
      return {
        ...context, errors: context.errors.concat({
          ast: this.ast,
          errorCode: "E_PUSH",
          errorMessage,
        })
      };
    }
    return { ...context, pushingButtons: context.pushingButtons.concat(target) };
  }
  private visitPushUp(target: ButtonName, acontext: ActionContext, context: ValidationContext): ValidationContext {
    if (!context.pushingButtons.includes(target)) {
      const errorMessage = `Non pushed button "${target}" can't be pushed up.`;
      return {
        ...context, errors: context.errors.concat({
          ast: this.ast,
          errorCode: "E_PUSH_UP",
          errorMessage,
        })
      };
    }
    return { ...context, pushingButtons: context.pushingButtons.filter(buttonName => buttonName !== target) };
  }
  private visitRotate(target: StickName, fromAngle: number, toAngle: number, acontext: ActionContext, context: ValidationContext): ValidationContext {
    if (fromAngle === toAngle) {
      return {
        ...context, errors: context.errors.concat({
          ast: this.ast,
          errorCode: "E_ROTATE",
          errorMessage: `Stick can't be rotated from ${fromAngle} to ${toAngle}`,
        })
      };
    }
    return context;
  }
  private visitMove(target: StickName, fromAngle: number, toAngle: number, acontext: ActionContext, context: ValidationContext): ValidationContext {
    if (fromAngle === toAngle) {
      return {
        ...context, errors: context.errors.concat({
          ast: this.ast,
          errorCode: "E_MOVE",
          errorMessage: `Stick can't be moved from ${fromAngle} to ${toAngle}`,
        })
      };
    }
    return context;
  }
}

