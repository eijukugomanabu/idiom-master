/**
 * Node標準のテストランナーで動くテスト（依存ライブラリ不要）。
 *   実行: npm test   （内部的には node --test）
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { IDIOMS, LEVELS } = require("../idioms.js");
const { chunk, filterByLevel, makeBlank, isCorrect, normalize } = require("../lib.js");

test("十分な数の熟語がある（土台）", () => {
  assert.ok(IDIOMS.length >= 30, `熟語数=${IDIOMS.length}`);
});

test("各熟語が必須フィールドを持つ（image は任意）", () => {
  for (const item of IDIOMS) {
    for (const field of ["level", "phrase", "emoji", "meaning", "example", "exampleJa"]) {
      assert.ok(item[field], `「${item.phrase}」に ${field} がありません`);
    }
  }
});

test("例文には熟語がそのまま含まれている（穴埋め問題が作れる）", () => {
  for (const item of IDIOMS) {
    assert.ok(
      item.example.toLowerCase().includes(item.phrase.toLowerCase()),
      `「${item.phrase}」が例文に含まれていません: ${item.example}`,
    );
  }
});

test("熟語に重複がない", () => {
  const phrases = IDIOMS.map((i) => i.phrase);
  assert.strictEqual(new Set(phrases).size, phrases.length);
});

test("すべての熟語の level は既知のレベルIDである", () => {
  const ids = new Set(LEVELS.map((l) => l.id));
  for (const item of IDIOMS) {
    assert.ok(ids.has(item.level), `未知のレベル: ${item.level}（${item.phrase}）`);
  }
});

test("各レベルに熟語が10個以上ある（十問ずつのセットが作れる）", () => {
  for (const level of LEVELS) {
    const n = filterByLevel(IDIOMS, level.id).length;
    assert.ok(n >= 10, `${level.name} の熟語数=${n}`);
  }
});

test("filterByLevel は指定レベルの熟語だけを返す", () => {
  const junior = filterByLevel(IDIOMS, "junior");
  assert.ok(junior.length > 0);
  assert.ok(junior.every((i) => i.level === "junior"));
});

test("chunk は配列を指定サイズずつに分割する", () => {
  assert.deepStrictEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("chunk はサイズ0以下でエラーになる", () => {
  assert.throws(() => chunk([1], 0));
});

test("makeBlank は例文中の熟語を空欄に置き換える", () => {
  const item = IDIOMS[0];
  const blanked = makeBlank(item.example, item.phrase);
  assert.ok(blanked.includes("____"));
  assert.ok(!blanked.toLowerCase().includes(item.phrase.toLowerCase()));
});

test("isCorrect は大文字小文字・余分な空白を無視して正誤判定する", () => {
  assert.ok(isCorrect("Break The Ice", "break the ice"));
  assert.ok(isCorrect("  break   the ice ", "break the ice"));
  assert.ok(!isCorrect("break ice", "break the ice"));
});

test("normalize は前後空白を除き小文字化して空白を1つにまとめる", () => {
  assert.strictEqual(normalize("  Hello   World  "), "hello world");
});
