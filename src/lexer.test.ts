import { CsLexer } from './lexer';

test("simple sequence", () => {
  const lexer = new CsLexer(`a,"foo", -200, 強パンチ, left`);
  const t1 = lexer.getNext();
  expect(t1.type).toBe("symbol");
  expect(t1.value).toBe("a");
  const c1 = lexer.getNext();
  expect(c1.type).toBe("comma");

  const t2 = lexer.getNext();
  expect(t2.type).toBe("string");
  expect(t2.value).toBe("foo");
  const c2 = lexer.getNext();
  expect(c2.type).toBe("comma");

  const t3 = lexer.getNext();
  expect(t3.type).toBe("number");
  expect(t3.value).toBe("-200");
  const c3 = lexer.getNext();
  expect(c3.type).toBe("comma");

  const t4 = lexer.getNext();
  expect(t4.value).toBe("強パンチ");
  const c4 = lexer.getNext();
  expect(c4.type).toBe("comma");

  const t5 = lexer.getNext();
  expect(t5.value).toBe("left");
});
