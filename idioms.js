/**
 * 英熟語データ
 * 各熟語は以下のフィールドを持つ:
 *   phrase    ... 英熟語（穴埋め問題の正解にもなる）
 *   image     ... 意味をイメージしたイラスト（SVG）のパス
 *   emoji     ... 画像が無い場合のフォールバック表示
 *   meaning   ... 日本語の意味
 *   example   ... phrase を必ず含む英語の例文
 *   exampleJa ... 例文の日本語訳
 *
 * 例文は phrase を「そのままの形」で含めること。
 * （穴埋め問題はこの example から phrase を空欄に置き換えて生成される）
 */
const IDIOMS = [
  {
    phrase: "break the ice",
    image: "images/break-the-ice.svg",
    emoji: "🧊",
    meaning: "（初対面などで）緊張をほぐす、打ち解ける",
    example: "He told a joke to break the ice at the meeting.",
    exampleJa: "彼は会議で打ち解けるために冗談を言った。",
  },
  {
    phrase: "a piece of cake",
    image: "images/a-piece-of-cake.svg",
    emoji: "🍰",
    meaning: "とても簡単なこと、朝飯前",
    example: "The test was a piece of cake for her.",
    exampleJa: "そのテストは彼女にとって朝飯前だった。",
  },
  {
    phrase: "hit the books",
    image: "images/hit-the-books.svg",
    emoji: "📚",
    meaning: "（猛）勉強する",
    example: "I need to hit the books before the exam.",
    exampleJa: "試験前にしっかり勉強しないといけない。",
  },
  {
    phrase: "under the weather",
    image: "images/under-the-weather.svg",
    emoji: "🤒",
    meaning: "体調が悪い、気分がすぐれない",
    example: "I am feeling under the weather today.",
    exampleJa: "今日は体調がよくない。",
  },
  {
    phrase: "once in a blue moon",
    image: "images/once-in-a-blue-moon.svg",
    emoji: "🌙",
    meaning: "ごくまれに、めったに〜ない",
    example: "We go to the cinema once in a blue moon.",
    exampleJa: "私たちはごくまれにしか映画館に行かない。",
  },
  {
    phrase: "cost an arm and a leg",
    image: "images/cost-an-arm-and-a-leg.svg",
    emoji: "💸",
    meaning: "大金がかかる、非常に高価である",
    example: "That new phone will cost an arm and a leg.",
    exampleJa: "あの新しいスマホはとても高くつくだろう。",
  },
  {
    phrase: "let the cat out of the bag",
    image: "images/let-the-cat-out-of-the-bag.svg",
    emoji: "🐱",
    meaning: "うっかり秘密を漏らす",
    example: "Don't let the cat out of the bag about the party.",
    exampleJa: "パーティーのことをうっかり漏らさないでね。",
  },
  {
    phrase: "on the same page",
    image: "images/on-the-same-page.svg",
    emoji: "📄",
    meaning: "認識が一致している、考えが同じ",
    example: "Let's make sure we are on the same page.",
    exampleJa: "認識が一致しているか確認しよう。",
  },
  {
    phrase: "bite the bullet",
    image: "images/bite-the-bullet.svg",
    emoji: "😬",
    meaning: "嫌なことを覚悟してやる、ぐっとこらえる",
    example: "I decided to bite the bullet and see the dentist.",
    exampleJa: "覚悟を決めて歯医者に行くことにした。",
  },
  {
    phrase: "call it a day",
    image: "images/call-it-a-day.svg",
    emoji: "🌇",
    meaning: "その日の作業を切り上げる、終わりにする",
    example: "We worked hard, so let's call it a day.",
    exampleJa: "よく働いたから、今日はもう終わりにしよう。",
  },
];

// ブラウザでは window.IDIOMS、Node（テスト）では module.exports として使える
if (typeof module !== "undefined" && module.exports) {
  module.exports = { IDIOMS };
}
