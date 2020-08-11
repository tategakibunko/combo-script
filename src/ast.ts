import { Ast, Action, ActionPlayer, ActionValidator, ValidationContext, ValidationError, ActionMapper } from './types';

export class CsAst implements Ast {
  constructor(public actions: Action[]) { }

  async acceptActionPlayer(visitor: ActionPlayer): Promise<any> {
    visitor.reset();
    for (let i = 0; i < this.actions.length; i++) {
      await this.actions[i].acceptPlayer(visitor);
    }
  }
  acceptActionMapper(mapper: ActionMapper<Action[]>): Ast {
    const actions = this.actions.reduce((acm: Action[], action: Action) => {
      return acm.concat(action.acceptMapper(mapper));
    }, [] as Action[]);
    return new CsAst(actions);
  }
  acceptActionBrancher(mapper: ActionMapper<Action[]>): Ast[] {
    // [a, h, b] -> [[a], [h1, h2], [b]] -> [[a, h1, b], [a, h2, b]]
    const branches = this.actions.map(act => act.acceptMapper(mapper)).reduce((acm, acts) => {
      if (acts.length === 0) return acm;
      if (acm.length === 0) return acts.map(a => [a]);
      // [[a,b], [a,c]] + [h1, h2] => [[a,b,h1], [a,b,h2], [a,c,h1], [a,c,h2]]
      // acm = [[a,b], [a,c]]
      return acm.reduce((acm2, br) => {
        // br = [a,b], [a,c]
        const branche = acts.reduce((brs, act) => {
          // act = h1, h2
          const br2 = br.concat(act); // [a,b,h1], [a,b,h2]
          return brs.concat([br2]); // brs.push(br2); return brs;
        }, [] as Action[][]);
        return acm2.concat(branche);
      }, [] as Action[][]);
    }, [] as Action[][]);
    return branches.map(branche => new CsAst(branche));
  }
  acceptActionValidator(validator: ActionValidator): ValidationError[] {
    const context = this.actions.reduce((ctx: ValidationContext, action: Action) => action.acceptValidator(validator, ctx), {
      leftStickAngle: -1,
      rightStickAngle: -1,
      pushingButtons: [],
      errors: []
    });
    return context.errors;
  }
}

