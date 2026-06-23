/* 英熟語マスター — UIロジック（ブラウザでのみ実行） */
(function () {
  "use strict";

  const CARDS_PER_SET = 10; // 「十問ずつ」表示する
  const sets = chunk(IDIOMS, CARDS_PER_SET);
  const cards = sets[0] || []; // 今は1セット（10問）。データが増えてもchunkで分割される。

  /* ---------- 画面（モード）切り替え ---------- */
  const views = {
    home: document.getElementById("home"),
    flashcards: document.getElementById("flashcards"),
    quiz: document.getElementById("quiz"),
  };

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle("is-hidden", key !== name);
    });
  }

  // モード選択カード
  document.querySelectorAll(".mode-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.go;
      if (target === "flashcards") {
        renderCard();
      } else if (target === "quiz") {
        startQuiz();
      }
      showView(target);
    });
  });

  // 「モード選択にもどる」ボタン
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showView("home"));
  });

  /* ---------- 画像表示（無ければ絵文字でフォールバック） ---------- */
  function setImage(imgEl, card) {
    imgEl.src = card.image;
    imgEl.alt = card.phrase;
    imgEl.onerror = () => {
      // SVGが読めない環境では絵文字に切り替える
      imgEl.replaceWith(
        Object.assign(document.createElement("div"), {
          className: imgEl.className + " emoji-fallback",
          textContent: card.emoji,
        }),
      );
    };
  }

  /* ---------- フラッシュカード ---------- */
  const cardEl = document.getElementById("card");
  const imageEl = document.getElementById("card-image");
  const phraseEl = document.getElementById("card-phrase");
  const meaningEl = document.getElementById("card-meaning");
  const exampleEl = document.getElementById("card-example");
  const exampleJaEl = document.getElementById("card-example-ja");
  const progressEl = document.getElementById("card-progress");
  let index = 0;

  function renderCard() {
    const card = cards[index];
    cardEl.classList.remove("is-flipped");
    setImage(imageEl, card);
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
  const quizImage = document.getElementById("quiz-image");
  const quizMeaning = document.getElementById("quiz-meaning");
  const quizSentence = document.getElementById("quiz-sentence");
  const quizForm = document.getElementById("quiz-form");
  const quizInput = document.getElementById("quiz-input");
  const quizFeedback = document.getElementById("quiz-feedback");
  const quizNext = document.getElementById("quiz-next");
  const quizProgress = document.getElementById("quiz-progress");
  const quizResult = document.getElementById("quiz-result");
  const quizCard = quizForm.parentElement;
  let qIndex = 0;
  let score = 0;
  let answered = false;

  // クイズを最初から始める（モード選択から入ったときに呼ぶ）
  function startQuiz() {
    qIndex = 0;
    score = 0;
    quizCard.classList.remove("is-hidden");
    quizProgress.classList.remove("is-hidden");
    quizResult.classList.add("is-hidden");
    renderQuiz();
  }

  function renderQuiz() {
    const card = cards[qIndex];
    answered = false;
    setImage(quizImage, card);
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
    quizCard.classList.add("is-hidden");
    quizProgress.classList.add("is-hidden");
    quizResult.classList.remove("is-hidden");
    quizResult.innerHTML =
      `🎉 全${cards.length}問終了！<br>スコア: <strong>${score} / ${cards.length}</strong>` +
      `<br><br><button id="quiz-restart">もう一度</button>`;
    document.getElementById("quiz-restart").addEventListener("click", startQuiz);
  }

  /* ---------- 初期化：最初はモード選択画面 ---------- */
  showView("home");
})();
