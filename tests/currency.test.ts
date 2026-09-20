import { test } from "node:test";
import assert from "node:assert/strict";
import { convertCurrency } from "../src/lib/currency";
test("입력 환율로 원화와 투그릭을 양방향 환산하고 소수를 보존한다", () => {
  assert.equal(convertCurrency("10000", "2.5", "KRW"), 25000);
  assert.equal(convertCurrency("25000", "2.5", "MNT"), 10000);
  assert.equal(convertCurrency("1", "2.5", "MNT"), 0.4);
  assert.equal(convertCurrency("0", "2.5", "MNT"), 0);
});
test("빈 값, 음수, 0 환율, 비유한 값은 결과로 표시하지 않는다", () => {
  for (const amount of ["", " ", "-1", "NaN", "Infinity"])
    assert.equal(convertCurrency(amount, "2.5", "KRW"), null);
  for (const rate of ["", " ", "0", "-1", "NaN", "Infinity"])
    assert.equal(convertCurrency("10000", rate, "MNT"), null);
  assert.equal(convertCurrency("1e308", "10", "KRW"), null);
});
