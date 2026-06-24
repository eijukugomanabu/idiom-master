/**
 * アプリのロジック部分（UIに依存しない純粋関数）。
 * ブラウザでもNode（テスト）でも使えるようにしてある。
 */

/** 配列を size 個ずつのまとまりに分割する（フラッシュカードを「十問ずつ」表示するために使う） */
function chunk(array, size) {
  if (size <= 0) throw new Error("size must be a positive number");
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/** 指定したレベルの熟語だけを取り出す */
function filterByLevel(idioms, level) {
  return idioms.filter((item) => item.level === level);
}

/** 例文の中の phrase を空欄（____）に置き換えて、穴埋め問題文を作る */
function makeBlank(example, phrase) {
  const re = new RegExp(escapeRegExp(phrase), "i");
  return example.replace(re, "____");
}

/** 解答の正誤を判定する（大文字小文字・前後の空白・連続スペースを無視して比較） */
function isCorrect(input, phrase) {
  return normalize(input) === normalize(phrase);
}

/**
 * 入力が熟語の正解、または「似た意味の別解（idiom.accept）」に一致するか。
 * ニュアンスが近い言い換えも正解として受け入れる。
 */
function matchesIdiom(input, idiom) {
  const n = normalize(input);
  if (n === normalize(idiom.phrase)) return true;
  if (Array.isArray(idiom.accept)) {
    for (const alt of idiom.accept) {
      if (n === normalize(alt)) return true;
    }
  }
  return false;
}

/** 比較用に文字列を正規化する */
function normalize(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, " ");
}

/** 正規表現で使う特殊文字をエスケープする */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { chunk, filterByLevel, makeBlank, isCorrect, matchesIdiom, normalize };
}
