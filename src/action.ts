import { Action, ActionTextGroup, ActionContext, ActionPlayer, StickName, ActionValidator, ValidationContext, ButtonName, ActionMapper, ActionSet } from './types';

export class NopAction implements Action {
  static instance = new NopAction();
  private constructor(
    public children: Action[] = [],
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      actionSetIndex: -1,
      children: this.children,
    };
  }
  clone(): Action {
    return this;
  }
  asHoldStart(children: Action[]): Action {
    return this;
  }
  asHoldEnd(children: Action[]): Action {
    return this;
  }
  toString(): string {
    return "nop()";
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(_: ActionPlayer): Promise<void> {
    return Promise.resolve();
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return context;
  }
}

// Play push-down, push-up
export class PushAction implements Action {
  constructor(
    public target: ButtonName,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy, // never
      children: this.children,
    };
  }
  clone(): PushAction {
    return new PushAction(this.target, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): PushDownAction {
    return new PushDownAction(this.target, this.ownerActionSet, children, this.holdedBy);
  }
  asHoldEnd(children: Action[]): PushUpAction {
    return new PushUpAction(this.target, this.ownerActionSet, children, this.holdedBy);
  }
  toString(): string {
    return this.target;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPush(this.target, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class PushDownAction implements Action {
  constructor(
    public target: ButtonName,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      ownerActionSet: this.ownerActionSet,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): PushDownAction {
    return new PushDownAction(this.target, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new PushDownAction(this.target, this.ownerActionSet, children, this.holdedBy);
  }
  asHoldEnd(children: Action[]): Action {
    return new PushUpAction(this.target, this.ownerActionSet, children, this.holdedBy);
  }
  toString(): string {
    return `pushDown(${this.target})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPushDown(this.target, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class PushUpAction implements Action {
  constructor(
    public target: ButtonName,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): PushUpAction {
    return new PushUpAction(this.target, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    throw new Error(`${this.toString()} is not holdable action.`);
  }
  asHoldEnd(children: Action[]): Action {
    return new PushUpAction(this.target, this.ownerActionSet, children, this.holdedBy);
  }
  toString(): string {
    return `pushUp(${this.target})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPushUp(this.target, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class AndActions implements ActionSet {
  constructor(
    public actions: Action[],
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) {
    // AndActions([a, b, AndActions([x, y])]) => AndActions([a, b, x, y])
    this.actions = this.actions.reduce((acm, action) => {
      return acm.concat(action instanceof AndActions ? action.actions : action.clone());
    }, [] as Action[]);
    this.actions.forEach(action => action.ownerActionSet = this);
  }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): AndActions {
    return this; // TODO
  }
  asHoldStart(children: Action[]): Action {
    return new AndActions(this.actions.map(action => action.asHoldStart(children)), this.ownerActionSet, children, this.holdedBy);
  }
  asHoldEnd(children: Action[]): Action {
    return new AndActions(this.actions.map(action => action.asHoldEnd(children)), this.ownerActionSet, children, this.holdedBy);
  }
  toString(): string {
    const childActions = this.actions.map(a => a.toString()).join(",");
    return `and[${this.actions.length}](${childActions})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitAndActions(this.actions, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

// In consructor, actions are cloned,
// it's because sometimes same child is shared by different OrSet.
// [example]
// And(a, Or(x, y)) => Or(And1(x, a), And2(y, a))
// In this example, 'a' is shared by And1 and And2.
// So if it's not cloned in initialization phase,
// both ownerActionSet of And1.a and And2.a will be the last one(And2).
export class OrActions implements ActionSet {
  constructor(
    public actions: Action[],
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) {
    // OrActions([a, b, OrActions([x, y])]) => OrActions([a, b, x, y])
    this.actions = this.actions.reduce((acm, action) => {
      return acm.concat(action instanceof OrActions ? action.actions : action.clone());
    }, [] as Action[]);
    this.actions.forEach(action => action.ownerActionSet = this);
  }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): OrActions {
    return this; // TODO
  }
  // Warning!
  // OrActions x OrActions will cause combinational explosion.
  and(action: Action): OrActions {
    if (action instanceof NopAction) {
      return this;
    }
    if (action instanceof AndActions) {
      return this.andAndActions(action);
    }
    if (action instanceof OrActions) {
      return this.andOrActions(action);
    }
    return this.andUnaryAction(action);
  }
  // (A or B) and C = (A and C) or (B and C)
  // And((a or b), x) => Or((a and x), (b and x))
  private andUnaryAction(action: Action): OrActions {
    return new OrActions(
      this.actions.map(act => new AndActions([act, action])),
      this.ownerActionSet ? this.ownerActionSet.ownerActionSet : undefined,
      this.ownerActionSet ? this.ownerActionSet.children : [],
      this.ownerActionSet ? this.ownerActionSet.holdedBy : undefined,
    );
  }
  // (A or B) and (C and D) = (A and C and D) or (B and C and D)
  private andAndActions(action: AndActions): OrActions {
    return new OrActions(
      this.actions.map(act => new AndActions([act].concat(action.actions))),
      this.ownerActionSet ? this.ownerActionSet.ownerActionSet : undefined,
      this.ownerActionSet ? this.ownerActionSet.children : [],
      this.ownerActionSet ? this.ownerActionSet.holdedBy : undefined,
    );
  }
  // (A or B) and (C or D) = (A and C) or (A and D) or (B and C) or (B and D)
  // And((A or B), (C or D)) => Or((A and B), (A and D), (B and C), (B and D))
  private andOrActions(action: OrActions): OrActions {
    return new OrActions(
      this.actions.reduce((acm1, act1) => {
        return action.actions.reduce((acm2, act2) => {
          return acm2.concat(new AndActions([act1, act2]));
        }, acm1);
      }, [] as AndActions[]),
      this.ownerActionSet ? this.ownerActionSet.ownerActionSet : undefined,
      this.ownerActionSet ? this.ownerActionSet.children : [],
      this.ownerActionSet ? this.ownerActionSet.holdedBy : undefined,
    );
  }
  asHoldStart(children: Action[]): Action {
    return new OrActions(this.actions.map(action => action.asHoldStart(children)), this.ownerActionSet, children, this.holdedBy);
    /*
    // (a or b){ children } => a { children } or b { children }
    return new OrActions(this.actions.map(action => {
      return new HoldAction(action, children);
    }), this.ownerActionSet, this.children, this.holdedBy);
    */
  }
  asHoldEnd(children: Action[]): Action {
    // return NopAction.instance;
    return new OrActions(this.actions.map(action => action.asHoldEnd(children)), this.ownerActionSet, children, this.holdedBy);
  }
  toString(): string {
    const childActions = this.actions.map(a => a.toString()).join(",");
    return `or[${this.actions.length}](${childActions})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitOrActions(this.actions, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

// Note that HoldAction is not expression but statement like.
// It's extracted to corresponding actions after parsing.
export class HoldAction implements Action {
  constructor(
    public action: Action, // action to hold.
    public children: Action[],
  ) { }

  get context(): ActionContext {
    return {
      action: this,
      actionSetIndex: -1,
      children: this.children,
    };
  }
  clone(): HoldAction {
    return this;
  }
  asHoldStart(children: Action[]): Action {
    throw new Error("Duplicate hold(start) is not allowed.");
  }
  asHoldEnd(children: Action[]): Action {
    throw new Error("Duplicate hold(end) is not allowed.");
  }
  toString(): string {
    return `hold(${this.action.toString()})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    throw new Error("HoldAction is not visitable.")
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class RotateStickAction implements Action {
  constructor(
    public target: StickName,
    public fromAngle: number,
    public toAngle: number,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): RotateStickAction {
    return new RotateStickAction(this.target, this.fromAngle, this.toAngle, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    throw new Error(`${this.toString()} is not holdable action.`);
  }
  asHoldEnd(children: Action[]): Action {
    return NopAction.instance;
  }
  toString(): string {
    return `rotate(${this.target}, ${this.fromAngle}, ${this.toAngle})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    return visitor.visitRotate(this.target, this.fromAngle, this.toAngle, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class MoveStickAction implements Action {
  constructor(
    public target: StickName,
    public fromAngle: number,
    public toAngle: number,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): MoveStickAction {
    return new MoveStickAction(this.target, this.fromAngle, this.toAngle, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    throw new Error(`${this.toString()} is not holdable action.`);
  }
  asHoldEnd(children: Action[]): Action {
    return NopAction.instance;
  }
  toString(): string {
    return `move(${this.target}, ${this.fromAngle}, ${this.toAngle})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    return visitor.visitMove(this.target, this.fromAngle, this.toAngle, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class SetStickAction implements Action {
  constructor(
    public target: StickName,
    public toAngle: number,
    public isHolding = false,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): SetStickAction {
    return new SetStickAction(this.target, this.toAngle, this.isHolding, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new SetStickAction(this.target, this.toAngle, true, this.ownerActionSet, children);
  }
  asHoldEnd(children: Action[]): Action {
    return new UnsetStickAction(this.target, this.toAngle, this.ownerActionSet, children);
  }
  toString(): string {
    return `set(${this.target}, ${this.toAngle}, isHolding = ${this.isHolding})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    // If isHolding is true, keep tilting stick to `this.toAngle`.
    return visitor.visitSet(this.target, this.toAngle, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class UnsetStickAction implements Action {
  constructor(
    public target: StickName,
    public fromAngle: number,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): UnsetStickAction {
    return new UnsetStickAction(this.target, this.fromAngle, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    throw new Error(`${this.toString()} is not holdable action.`);
  }
  asHoldEnd(children: Action[]): Action {
    return NopAction.instance;
  }
  toString(): string {
    return `unset(${this.target}, ${this.fromAngle})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    return visitor.visitUnset(this.target, this.fromAngle, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class TouchStickAction implements Action {
  constructor(
    public target: StickName,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): TouchStickAction {
    return new TouchStickAction(this.target, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new TouchStickAction(this.target, this.ownerActionSet, children);
  }
  asHoldEnd(children: Action[]): Action {
    return new UnsetStickAction(this.target, 0, this.ownerActionSet, children);
  }
  toString(): string {
    return `touch(${this.target})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    return visitor.visitTouch(this.target, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class TextAction implements Action {
  constructor(
    public text: string,
    public group: ActionTextGroup,
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }
  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): TextAction {
    return new TextAction(this.text, this.group, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new TextAction(this.text, this.group, this.ownerActionSet, children);
  }
  asHoldEnd(children: Action[]): Action {
    return NopAction.instance;
  }
  toString(): string {
    return `text(${this.text})`;
  }
  acceptMapper<T>(visitor: ActionMapper<T>): T {
    return visitor.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer) {
    return visitor.visitText(this.text, this.group, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class PluginAction implements Action {
  constructor(
    public name: string,
    public args: string[],
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }

  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): PluginAction {
    return new PluginAction(this.name, this.args, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new PluginHoldStartAction(this.name, this.args, this.ownerActionSet, children);
  }
  asHoldEnd(children: Action[]): Action {
    return new PluginHoldEndAction(this.name, this.args, this.ownerActionSet, children);
  }
  acceptMapper<T>(mapper: ActionMapper<T>): T {
    return mapper.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPlugin(this.name, this.args, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class PluginHoldStartAction implements Action {
  constructor(
    public name: string,
    public args: string[],
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }

  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): PluginHoldStartAction {
    return new PluginHoldStartAction(this.name, this.args, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    return new PluginHoldStartAction(this.name, this.args, this.ownerActionSet, children);
  }
  asHoldEnd(children: Action[]): Action {
    return new PluginHoldEndAction(this.name, this.args, this.ownerActionSet, children);
  }
  acceptMapper<T>(mapper: ActionMapper<T>): T {
    return mapper.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPluginHoldStart(this.name, this.args, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}

export class PluginHoldEndAction implements Action {
  constructor(
    public name: string,
    public args: string[],
    public ownerActionSet: ActionSet | undefined = undefined,
    public children: Action[] = [],
    public holdedBy: Action | undefined = undefined,
  ) { }

  get context(): ActionContext {
    return {
      action: this,
      ownerActionSet: this.ownerActionSet,
      actionSetIndex: this.ownerActionSet ? this.ownerActionSet.actions.indexOf(this) : -1,
      holdedBy: this.holdedBy,
      children: this.children,
    };
  }
  clone(): PluginHoldEndAction {
    return new PluginHoldEndAction(this.name, this.args, this.ownerActionSet, this.children, this.holdedBy);
  }
  asHoldStart(children: Action[]): Action {
    throw new Error(`PluginHoldEndAction is not holdable!`)
  }
  asHoldEnd(children: Action[]): Action {
    return this;
  }
  acceptMapper<T>(mapper: ActionMapper<T>): T {
    return mapper.visit(this);
  }
  acceptPlayer(visitor: ActionPlayer): Promise<void> {
    return visitor.visitPluginHoldEnd(this.name, this.args, this.context);
  }
  acceptValidator(validator: ActionValidator, context: ValidationContext): ValidationContext {
    return validator.visit(this, context);
  }
}
