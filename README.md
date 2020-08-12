# combo-script

**combo-script** is light-weight and extensible script language to describe **gamepad** command input.

It also supports validation to prevent logically inconsistent operations(duplicate or unable button push or stick operation etc).

See [DEMO](https://tategakibunko.github.io/combo-player/).

## Install

```bash
npm -i ts-combo-script
```

## Cheatsheet

### 1. Button operations

#### Push

If just single button name is described(for example, `A`), it means pushDown(`A`) and pushUp(`A`).

```
A
```

Note that all button names are **case insensitive**. So you can write both `A` and `a`.

#### PushDown, PushUp

Use `pushDown` or `pushUp` function to describe push-down or push-up event  separatedly.

```
pushDown(left), pushUp(left)
```

Note that function names are **case insensitive**, so you can write `pushDown` or `pushdown`.

#### Push multiple button

You can describe multiple pushing by using `tuple` like this.

```
(A, B)
(right, down)
```

`(A, B)` means pushing down `A` and `B` at the same time(and pushing up `A` and `B` at the same time).

#### Keep pushing(while doing something)

You can use special syntax(called `holding syntax`) to describe this situation. For example,

```
(a, b) { rotateL(0, 180), x, y }, L1
```

It means,

1. Keep pushing `a` and `b` while
   - Rotate `left stick` from `0deg` to `180deg`
   - Push `x`
   - Push `y`
2. Push up `a` and `b`
3. Push `L1`

#### Selective operation

You can describe selective operation(like A or B) by using `or` idiom.

```
rotateL(0, 90), or(triangle, circle)
```

It means,

1. rotate left stick from 0 degree to 90 degree.
2. push `triangle` or `circle` button.

Note that if you use `or` inside multiple push like this...

```
(a, b, or(x, y))
```

it's disassembled to following operation like set operation(`a and b and (x or y)`)

```
or((a, b, x), (a, b, y))
```

### 2. Stick operations

#### Rotate

Rotating stick is described by `rotateL`(for left stick) or `rotateR`(for right stick) function.

```
rotateL(90, 180)
```

It means rotating `left stick`  from `90deg` to `180deg`.

#### Move

Moving stick is described by `moveL`(for left stick) or `moveR`(for right stick) function.

```
moveR(90, 180)
```

It means moveing `right stick` from `0deg` to `90deg`.

#### Set

Tilting stick is described by `setL`(for left stick) or `setR`(for right stick) function.

```
setR(90)
```

It means tilting `right stick` to `90deg`.

#### Unset

Releasing stick is described by `unsetL`(for left stick) or `unsetR`(for right stick) function.

```
unsetL(90)
```

It means release `right stick` from `90deg` pos.

#### Touch

Touching stick in any way is described by `touchL`(for left stick) or `touchR`(for right stick) function.

```
touchL(), touchR()
```



### 3. Helper message

You can output some helper message by using string literal enclosed by `" `  or  `'`.

```
"Input quickly!", left, circle
```

Or you can use `info`, `warn`, `error` functions.

```
info("this is info"), warn("this is warning"), error("this is error")
```



## Compile combo-script

```typescript
import { compile } from 'combo-script'
const { ast, errors } = compile("(a, b){ rotateL(0, 90), L1 }, x, y");
console.log(ast);
console.log(errors);
```



## Integrating combo-script with player app

Although we have [combo-player](https://github.com/tategakibunko/combo-player) already, you can create your own player easily by implementing `ActionPlayer` interface.

```typescript
import { compile, Action, ActionTextGroup, ActionContext, ActionPlayer, ButtonName, StickName } from 'combo-script';

const code = "(a, b) { rotateL(90, 180), up, down }, x, y, (left, a)"
const { ast, errors } = compile(code);
if(errors.length > 0){
  console.error(errors);
  return;
}
// Implement your own ActionPlayer interface.
class MyActionPlayer implements ActionPlayer {
   visitPush(target: ButtonName, context: ActionContext): Promise<any> {
      console.log(`visitPush(${target})`);
      return Promise.resolve();
   },
   // ... full fill other interface functions here ...
}

// And pass your own ActionPlayer to ast.
ast.accept(new MyActionPlayer());
```



## Implementing plugin function

Functions that are not pre-defined are treated as **plugin function**.

By using plugin function, you can extend language in your own way.

To use plugin, you should implement your own behaviour in `visitPlugin` and `visitPluginHoldStart` and `visitPluginHoldEnd` in `ActionPlayer` interface.

```typescript
import { ActionPlayer, Action, ActionContext } from 'combo-script';

class MyActionPlayer implements ActionPlayer {
   visitPushDown(action: Action, context: ActionContext): Promise<any>{
      reutrn Promise.resolve();
   }
   // ...
   // <full fill other interfaces>
   // ...
   // called in normal sequence.   
   visitPlugin(name: string, args: string[], context: ActionContext): Promise<any> {
      console.log(`plugin:${name}`);
      return Promise.resolve();
   }
   // called when holding action is started.
   visitPluginHoldStart(name: string, args: string[], context: ActionContext): Promise<any> {
      console.log(`plugin:${name}(hold start)`);
      return Promise.resolve();
   }
   // called when holding action is finished.
   visitPluginHoldEnd(name: string, args: string[], context: ActionContext): Promise<any> {
      console.log(`plugin:${name}(hold end)`);
      return Promise.resolve();
   }
}
```



## License

MIT

