/**
 * 英熟語データ
 * 各熟語は以下のフィールドを持つ:
 *   phrase    ... 英熟語（穴埋め問題の正解にもなる）
 *   emoji     ... 意味をイメージしたビジュアル（後でAI生成画像に差し替え可能）
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
    emoji: "🧊",
    meaning: "（初対面などで）緊張をほぐす、打ち解ける",
    example: "He told a joke to break the ice at the meeting.",
    exampleJa: "彼は会議で打ち解けるために冗談を言った。",
  },
  {
    phrase: "a piece of cake",
    emoji: "🍰",
    meaning: "とても簡単なこと、朝飯前",
    example: "The test was a piece of cake for her.",
    exampleJa: "そのテストは彼女にとって朝飯前だった。",
  },
  {
    phrase: "hit the books",
    emoji: "📚",
    meaning: "（猛）勉強する",
    example: "I need to hit the books before the exam.",
    exampleJa: "試験前にしっかり勉強しないといけない。",
  },
  {
    phrase: "under the weather",
    emoji: "🤒",
    meaning: "体調が悪い、気分がすぐれない",
    example: "I am feeling under the weather today.",
    exampleJa: "今日は体調がよくない。",
  },
  {
    phrase: "once in a blue moon",
    emoji: "🌙",
    meaning: "ごくまれに、めったに〜ない",
    example: "We go to the cinema once in a blue moon.",
    exampleJa: "私たちはごくまれにしか映画館に行かない。",
  },
  {
    phrase: "cost an arm and a leg",
    emoji: "💸",
    meaning: "大金がかかる、非常に高価である",
    example: "That new phone will cost an arm and a leg.",
    exampleJa: "あの新しいスマホはとても高くつくだろう。",
  },
  {
    phrase: "let the cat out of the bag",
    emoji: "🐱",
    meaning: "うっかり秘密を漏らす",
    example: "Don't let the cat out of the bag about the party.",
    exampleJa: "パーティーのことをうっかり漏らさないでね。",
  },
  {
    phrase: "on the same page",
    emoji: "📄",
    meaning: "認識が一致している、考えが同じ",
    example: "Let's make sure we are on the same page.",
    exampleJa: "認識が一致しているか確認しよう。",
  },
  {
    phrase: "bite the bullet",
    emoji: "😬",
    meaning: "嫌なことを覚悟してやる、ぐっとこらえる",
    example: "I decided to bite the bullet and see the dentist.",
    exampleJa: "覚悟を決めて歯医者に行くことにした。",
  },
  {
    phrase: "call it a day",
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
