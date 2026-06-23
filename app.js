/* 英熟語マスター — UIロジック（ブラウザでのみ実行） */
(function () {
  "use strict";

  const CARDS_PER_SET = 10; // 「十問ずつ」表示する
  const sets = chunk(IDIOMS, CARDS_PER_SET);
  const cards = sets[0] || []; // 今は1セット（10問）。データが増えてもchunkで分割される。

  /* ---------- タブ切り替え ---------- */
  const tabs = document.querySelectorAll(".tab");
  const views = {
    flashcards: document.getElementById("flashcards"),
    quiz: document.getElementById("quiz"),
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const mode = tab.dataset.mode;
      Object.entries(views).forEach(([name, el]) => {
        el.classList.toggle("is-hidden", name !== mode);
      });
    });
  });

  /* ---------- フラッシュカード ---------- */
  const cardEl = document.getElementById("card");
  const emojiEl = document.getElementById("card-emoji");
  const phraseEl = document.getElementById("card-phrase");
  const meaningEl = document.getElementById("card-meaning");
  const exampleEl = document.getElementById("card-example");
  const exampleJaEl = document.getElementById("card-example-ja");
  const progressEl = document.getElementById("card-progress");
  let index = 0;

  function renderCard() {
    const card = cards[index];
    cardEl.classList.remove("is-flipped");
    emojiEl.textContent = card.emoji;
    phraseEl.textContent = card.phrase;
    meaningEl.textContent = card.meaning;
    exampleEl.textContent = card.example;
    exampleJaEl.textContent = card.exampleJa;
    progressEl.textContent = `${index + 1} / ${cards.length}`;
  }

  cardEl.addEventListener("click", () => cardEl.classList.toggle("is-flipped"));
  document.getElementById("prev-card").addEventListener("click", () => {
    index = (index - 1 + cards.length) % cards.length;
    renderCard();
  });
  document.getElementById("next-card").addEventListener("click", () => {
    index = (index + 1) % cards.length;
    renderCard();
  });

  /* ---------- 穴埋め入力 ---------- */
  const quizEmoji = document.getElementById("quiz-emoji");
  const quizMeaning = document.getElementById("quiz-meaning");
  const quizSentence = document.getElementById("quiz-sentence");
  const quizForm = document.getElementById("quiz-form");
  const quizInput = document.getElementById("quiz-input");
  const quizFeedback = document.getElementById("quiz-feedback");
  const quizNext = document.getElementById("quiz-next");
  const quizProgress = document.getElementById("quiz-progress");
  const quizResult = document.getElementById("quiz-result");
  let qIndex = 0;
  let score = 0;
  let answered = false;

  function renderQuiz() {
    const card = cards[qIndex];
    answered = false;
    quizEmoji.textContent = card.emoji;
    quizMeaning.textContent = `ヒント: ${card.meaning}`;
    quizSentence.textContent = makeBlank(card.example, card.phrase);
    quizInput.value = "";
    quizInput.disabled = false;
    quizFeedback.textContent = "";
    quizFeedback.className = "quiz-feedback";
    quizNext.classList.add("is-hidden");
    quizProgress.textContent = `${qIndex + 1} / ${cards.length}　スコア: ${score}`;
    quizInput.focus();
  }

  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered) return;
    const card = cards[qIndex];
    answered = true;
    quizInput.disabled = true;
    if (isCorrect(quizInput.value, card.phrase)) {
      score++;
      quizFeedback.textContent = "⭕️ 正解！";
      quizFeedback.className = "quiz-feedback ok";
    } else {
      quizFeedback.textContent = `❌ 正解は「${card.phrase}」`;
      quizFeedback.className = "quiz-feedback ng";
    }
    quizProgress.textContent = `${qIndex + 1} / ${cards.length}　スコア: ${score}`;
    quizNext.classList.remove("is-hidden");
    quizNext.focus();
  });

  quizNext.addEventListener("click", () => {
    if (qIndex < cards.length - 1) {
      qIndex++;
      renderQuiz();
    } else {
      showResult();
    }
  });

  function showResult() {
    quizForm.parentElement.classList.add("is-hidden");
    quizProgress.classList.add("is-hidden");
    quizResult.classList.remove("is-hidden");
    quizResult.innerHTML =
      `🎉 全${cards.length}問終了！<br>スコア: <strong>${score} / ${cards.length}</strong>` +
      `<br><br><button id="quiz-restart">もう一度</button>`;
    document.getElementById("quiz-restart").addEventListener("click", () => {
      qIndex = 0;
      score = 0;
      quizForm.parentElement.classList.remove("is-hidden");
      quizProgress.classList.remove("is-hidden");
      quizResult.classList.add("is-hidden");
      renderQuiz();
    });
  }

  /* ---------- 初期化 ---------- */
  renderCard();
  renderQuiz();
})();
