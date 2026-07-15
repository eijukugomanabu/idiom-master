/* 英熟語マスター — UIロジック（ブラウザでのみ実行） */
(function () {
  "use strict";

  const CARDS_PER_SET = 10; // 「十問ずつ」表示する

  /* ---------- 状態 ---------- */
  let currentLevel = null; // 選択中のレベルID
  let currentMode = null; // "flashcards" | "quiz"
  let sets = []; // 選択中レベルを10問ずつに分割したもの
  let setIndex = 0; // 何セット目か
  let cards = []; // 現在のセット（最大10問）

  /* ---------- 画面切り替え ---------- */
  const views = {
    "level-select": document.getElementById("level-select"),
    home: document.getElementById("home"),
    "set-select": document.getElementById("set-select"),
    flashcards: document.getElementById("flashcards"),
    quiz: document.getElementById("quiz"),
    battle: document.getElementById("battle"),
  };

  const headerEl = document.getElementById("app-header");

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle("is-hidden", key !== name);
    });
    // ヘッダー（英熟語マスター）は最初のレベル選択画面だけ表示
    if (headerEl) headerEl.classList.toggle("is-hidden", name !== "level-select");
    // バトル画面のときだけBGMを鳴らす
    if (typeof Music !== "undefined") {
      if (name === "battle") Music.start();
      else Music.stop();
    }
  }

  // 選択肢を選んだとき、そのカードにズーム演出をかけてから画面を切り替える
  function zoomSelect(el, then) {
    el.classList.add("card-zooming");
    setTimeout(() => {
      el.classList.remove("card-zooming");
      then();
    }, 180);
  }

  // BGMのオン/オフボタン
  const musicToggle = document.getElementById("music-toggle");
  if (musicToggle && typeof Music !== "undefined") {
    const updateMusicIcon = () => {
      musicToggle.textContent = Music.isMuted() ? "🔇" : "🔊";
    };
    updateMusicIcon();
    musicToggle.addEventListener("click", () => {
      Music.toggle();
      updateMusicIcon();
    });
  }

  /* ---------- ① レベル選択 ---------- */
  const levelGrid = document.getElementById("level-grid");
  const GENRE_LABEL = { idiom: "📘 英熟語", toeic: "💼 TOEIC単語" };
  let lastGenre = null;
  LEVELS.forEach((level) => {
    // ジャンルが変わったら見出しを入れる
    if (level.genre && level.genre !== lastGenre) {
      const h = document.createElement("div");
      h.className = "level-genre";
      h.textContent = GENRE_LABEL[level.genre] || "";
      levelGrid.appendChild(h);
      lastGenre = level.genre;
    }
    const count = filterByLevel(IDIOMS, level.id).length;
    const btn = document.createElement("button");
    btn.className = "mode-card";
    btn.innerHTML =
      `<span class="mode-icon">${level.emoji}</span>` +
      `<span class="mode-title">${level.name}</span>` +
      `<span class="mode-desc">${level.desc}</span>` +
      `<span class="level-count">${count}語</span>`;
    btn.addEventListener("click", () => zoomSelect(btn, () => selectLevel(level)));
    levelGrid.appendChild(btn);
  });

  const homeLevelLabel = document.getElementById("home-level-label");

  function selectLevel(level) {
    currentLevel = level.id;
    homeLevelLabel.textContent = `${level.emoji} ${level.name} — 何をしますか？`;
    showView("home");
  }

  /* ---------- ② モード選択 ---------- */
  document.querySelectorAll(".mode-card[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => zoomSelect(btn, () => enterMode(btn.dataset.go)));
  });

  function enterMode(mode) {
    currentMode = mode;
    if (mode === "battle") {
      startBattle();
      showView(mode);
      return;
    }
    // セットは常に「レベル全体を10問ずつ」で固定（第1セットの中身はいつも同じ）
    sets = chunk(filterByLevel(IDIOMS, currentLevel), CARDS_PER_SET);
    showSetSelect(mode);
  }

  /* ---------- セット選択画面（挑戦するセットを手動で選ぶ） ---------- */
  function showSetSelect(mode) {
    currentMode = mode;
    const title = document.getElementById("set-select-title");
    if (title) {
      title.textContent =
        mode === "flashcards" ? "📇 学ぶセットを選ぼう" : "✍️ 穴埋めに挑戦するセットを選ぼう（✅できた単語は出ないよ）";
    }
    const grid = document.getElementById("set-grid");
    grid.innerHTML = "";
    sets.forEach((s, i) => {
      const done = s.filter((w) => mastered[w.phrase]).length;
      const rest = s.length - done;
      const allDone = done >= s.length;
      const btn = document.createElement("button");
      btn.className = "set-card" + (allDone ? " all-done" : "");
      const sub =
        mode === "quiz"
          ? allDone
            ? "🎉 全部できた！（全問出題）"
            : `残り${rest}語を出題`
          : `${s.length}語（${s[0].phrase} …）`;
      btn.innerHTML =
        `<span class="set-name">第${i + 1}セット</span>` +
        `<span class="set-check">✅ ${done}/${s.length}</span>` +
        `<span class="set-sub">${sub}</span>`;
      btn.addEventListener("click", () => startSet(i));
      grid.appendChild(btn);
    });
    showView("set-select");
  }

  // 選んだセットで学習/穴埋めを開始する
  function startSet(i) {
    setIndex = i;
    if (currentMode === "flashcards") {
      loadSet();
      index = 0;
      renderCard();
      showView("flashcards");
    } else {
      loadQuizSet();
      updateQuizFilterInfo();
      startQuiz();
      showView("quiz");
    }
  }

  // 穴埋め画面の「何語を除外しているか」の表示を更新（選択中のセット内の話）
  function updateQuizFilterInfo() {
    const info = document.getElementById("quiz-filter-info");
    if (!info) return;
    const base = sets[setIndex] || [];
    const doneCount = base.filter((w) => mastered[w.phrase]).length;
    if (includeMastered) {
      info.textContent = `第${setIndex + 1}セット：全${base.length}語を出題中（✅${doneCount}語もふくむ）`;
    } else if (doneCount >= base.length && base.length > 0) {
      info.textContent = `第${setIndex + 1}セット：🎉全部できた！ので全${base.length}語を出題中`;
    } else {
      info.textContent = `第${setIndex + 1}セット：未チェックの${base.length - doneCount}語を出題中（✅${doneCount}語は除外）`;
    }
  }

  function loadSet() {
    cards = sets[setIndex] || [];
  }

  // 穴埋め用：選んだセットの中から「できたチェック」の無い単語だけを出題
  function loadQuizSet() {
    const base = sets[setIndex] || [];
    if (includeMastered) {
      cards = base;
      return;
    }
    const rest = base.filter((w) => !mastered[w.phrase]);
    cards = rest.length ? rest : base; // 全部できたセットは全問出題にフォールバック
  }

  /* ---------- 「できた」チェック（覚えた単語の記録。保存される） ---------- */
  let mastered = {};
  try {
    mastered = JSON.parse(localStorage.getItem("idiomMastered") || "{}") || {};
  } catch (e) {
    mastered = {};
  }
  function saveMastered() {
    try {
      localStorage.setItem("idiomMastered", JSON.stringify(mastered));
    } catch (e) {}
  }
  // 設定：できた単語も穴埋めに出すか（初期値は「出さない」）
  let includeMastered = localStorage.getItem("idiomIncludeMastered") === "1";

  /* 「もどる」ボタン（data-back に戻り先のビュー名） */
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.back));
  });

  /* ---------- 画像表示（無ければ絵文字でフォールバック） ---------- */
  function setImage(el, card) {
    if (card.image) {
      el.classList.remove("as-emoji");
      el.innerHTML = `<img src="${card.image}" alt="${card.phrase}" />`;
      const img = el.querySelector("img");
      img.onerror = () => {
        el.classList.add("as-emoji");
        el.textContent = card.emoji;
      };
    } else {
      el.classList.add("as-emoji");
      el.textContent = card.emoji;
    }
  }

  function setProgressLabel(el, position) {
    const setPart = sets.length > 1 ? `セット${setIndex + 1}/${sets.length}　` : "";
    el.textContent = setPart + position;
  }

  /* ---------- フラッシュカード ---------- */
  const cardEl = document.getElementById("card");
  const imageEl = document.getElementById("card-image");
  const phraseEl = document.getElementById("card-phrase");
  const meaningEl = document.getElementById("card-meaning");
  const exampleEl = document.getElementById("card-example");
  const exampleJaEl = document.getElementById("card-example-ja");
  const progressEl = document.getElementById("card-progress");
  const cardNextSet = document.getElementById("card-next-set");
  let index = 0;

  // 例文（英語）の中の phrase を強調表示するHTMLを作る（該当箇所を <span class="hl-word"> で包む）
  function highlightInText(text, term) {
    if (!text) return "";
    if (!term) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      `<span class="hl-word">${escapeHtml(text.slice(idx, idx + term.length))}</span>` +
      escapeHtml(text.slice(idx + term.length))
    );
  }
  // 意味（例:「【動】参照する、言及する」）から、日本語訳の中に実際に現れる語を探す
  // 活用で末尾が変わることがあるので、末尾を削りながら（最短2文字まで）一致を探すベストエフォート
  function jaTermInExample(meaning, exampleJa) {
    if (!meaning || !exampleJa) return "";
    const cleaned = meaning.replace(/【[^】]*】/g, " "); // 品詞タグ【…】を除去
    const cands = cleaned
      .split(/[／\/、,・]/)
      .map((s) => s.replace(/[〜～\s]/g, "").trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length); // 長い候補を優先
    for (const c of cands) {
      for (let len = c.length; len >= 2; len--) {
        const stem = c.slice(0, len);
        if (exampleJa.indexOf(stem) >= 0) return stem;
      }
    }
    return "";
  }

  function renderCard() {
    const card = cards[index];
    if (!card) return;
    cardEl.classList.remove("is-flipped");
    setImage(imageEl, card);
    phraseEl.textContent = card.phrase;
    meaningEl.textContent = card.meaning;
    // 例文の中の学習中の単語と、日本語訳の対応部分を同じ色でハイライト
    exampleEl.innerHTML = highlightInText(card.example, card.phrase);
    exampleJaEl.innerHTML = highlightInText(card.exampleJa, jaTermInExample(card.meaning, card.exampleJa));
    const doneInSet = cards.filter((c) => mastered[c.phrase]).length;
    setProgressLabel(progressEl, `${index + 1} / ${cards.length}　✅ ${doneInSet}/${cards.length}`);
    cardNextSet.classList.remove("is-hidden"); // 「セット選択へ」は常に表示
    // 「次の10問へ」は次のセットがある時だけ表示
    const cardNextGo = document.getElementById("card-next-set-go");
    if (cardNextGo) cardNextGo.classList.toggle("is-hidden", setIndex >= sets.length - 1);
    // 「できた」ボタンの見た目を今の単語に合わせる
    const doneBtn = document.getElementById("mark-done");
    if (doneBtn) {
      const done = !!mastered[card.phrase];
      doneBtn.textContent = done ? "✅ できた！（タップで外す）" : "⬜ できた！チェック";
      doneBtn.classList.toggle("done", done);
    }
    // 「このセットを全部できたに／全部外す」一括ボタンの見た目
    const allBtn = document.getElementById("mark-all-done");
    if (allBtn) {
      const allDone = cards.length > 0 && cards.every((c) => mastered[c.phrase]);
      allBtn.textContent = allDone ? "⬜ このセットのチェックを全部外す" : "✅ このセットを全部「できた」に";
      allBtn.classList.toggle("done", allDone);
    }
  }

  function flipCard() {
    cardEl.classList.toggle("is-flipped");
  }
  function goPrevCard() {
    if (!cards.length) return;
    index = (index - 1 + cards.length) % cards.length;
    renderCard();
  }
  function goNextCard() {
    if (!cards.length) return;
    index = (index + 1) % cards.length;
    renderCard();
  }
  cardEl.addEventListener("click", flipCard);
  document.getElementById("prev-card").addEventListener("click", goPrevCard);
  document.getElementById("next-card").addEventListener("click", goNextCard);

  // キーボード操作（単語帳を開いている時だけ）：←→で前後、スペース/Enter/↑↓でめくる
  document.addEventListener("keydown", (e) => {
    const view = document.getElementById("flashcards");
    if (!view || view.classList.contains("is-hidden")) return; // 単語帳を開いていない時は無視
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return; // 入力中は邪魔しない
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goNextCard(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goPrevCard(); }
    else if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); flipCard(); }
  });
  cardNextSet.addEventListener("click", () => showSetSelect("flashcards")); // セット選択にもどる
  // 次の10問へ：ホーム/セット選択を経由せずダイレクトに次のセットのフラッシュカードへ
  const cardNextGoBtn = document.getElementById("card-next-set-go");
  if (cardNextGoBtn) cardNextGoBtn.addEventListener("click", () => startSet(setIndex + 1));

  // 「できた！」チェックの切り替え（保存される）
  const markDoneBtn = document.getElementById("mark-done");
  if (markDoneBtn) {
    markDoneBtn.addEventListener("click", () => {
      const card = cards[index];
      if (!card) return;
      if (mastered[card.phrase]) {
        // すでに「できた」の単語をタップ→チェックを外す（カードはそのまま）
        delete mastered[card.phrase];
        saveMastered();
        renderCard();
      } else {
        // 「できた」にしたら次のカードへ自動で進む（最後のカードならその場に留まる）
        mastered[card.phrase] = true;
        saveMastered();
        if (index < cards.length - 1) index++;
        renderCard();
      }
    });
  }
  // 「このセットを全部できたに／全部外す」一括チェック（1語ずつ押す手間をなくす）
  const markAllBtn = document.getElementById("mark-all-done");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      const allDone = cards.length > 0 && cards.every((c) => mastered[c.phrase]);
      if (allDone) {
        cards.forEach((c) => delete mastered[c.phrase]); // 全部チェック済みなら一括で外す
      } else {
        cards.forEach((c) => (mastered[c.phrase] = true)); // まだなら一括でできたに
      }
      saveMastered();
      renderCard();
    });
  }
  // 「このセットの覚えてない単語で穴埋めへ」導線（セット番号を引き継いで遷移）
  const goQuizBtn = document.getElementById("go-quiz-unchecked");
  if (goQuizBtn) {
    goQuizBtn.addEventListener("click", () => {
      includeMastered = false;
      try { localStorage.setItem("idiomIncludeMastered", "0"); } catch (e) {}
      const chk = document.getElementById("include-mastered");
      if (chk) chk.checked = false;
      currentMode = "quiz";
      startSet(setIndex); // 今学んでいたセットの未チェック単語だけで穴埋め開始
    });
  }
  // 「このセットを英熟語で学ぶ」導線（穴埋め → フラッシュカード。同じセットへ）
  const goLearnBtn = document.getElementById("quiz-to-learn");
  if (goLearnBtn) {
    goLearnBtn.addEventListener("click", () => {
      currentMode = "flashcards";
      startSet(setIndex); // 今解いていたセットをフラッシュカードで学ぶ
    });
  }
  // 穴埋め側の設定：「できた単語も出題する」切り替え（同じセットで出題しなおす）
  const includeChk = document.getElementById("include-mastered");
  if (includeChk) {
    includeChk.checked = includeMastered;
    includeChk.addEventListener("change", () => {
      includeMastered = includeChk.checked;
      try { localStorage.setItem("idiomIncludeMastered", includeMastered ? "1" : "0"); } catch (e) {}
      loadQuizSet();
      updateQuizFilterInfo();
      startQuiz();
    });
  }

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
  let quizLog = []; // このセットの1問ずつの正誤記録（リザルト用）

  // HTMLに差し込む文字列を安全にエスケープ（ユーザー入力を表示するため）
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // クイズを（現在のセットで）最初から始める
  function startQuiz() {
    cards = shuffled(cards); // 出題順をランダムに（元データは変えずコピーを並べ替え）
    qIndex = 0;
    score = 0;
    quizLog = [];
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
    setProgressLabel(quizProgress, `${qIndex + 1} / ${cards.length}　スコア: ${score}`);
    quizInput.focus();
  }

  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered) return;
    const card = cards[qIndex];
    answered = true;
    quizInput.disabled = true;
    const correct = matchesIdiom(quizInput.value, card);
    quizLog.push({ phrase: card.phrase, meaning: card.meaning, answer: quizInput.value.trim(), correct });
    if (correct) {
      score++;
      quizFeedback.textContent = "⭕️ 正解！";
      quizFeedback.className = "quiz-feedback ok";
    } else {
      quizFeedback.textContent = `❌ 正解は「${card.phrase}」`;
      quizFeedback.className = "quiz-feedback ng";
    }
    setProgressLabel(quizProgress, `${qIndex + 1} / ${cards.length}　スコア: ${score}`);
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

  // セット終了 → リザルト画面（自動で次のセットへは進まない）
  function showResult() {
    quizCard.classList.add("is-hidden");
    quizProgress.classList.add("is-hidden");
    quizResult.classList.remove("is-hidden");
    const hasNext = setIndex < sets.length - 1; // 次のセットがあるか
    const nextBtn = hasNext ? `<button id="quiz-next-set" class="primary-next">➡️ 次の10問へ</button>` : "";
    const wrongItems = quizLog.filter((q) => !q.correct);
    const okItems = quizLog.filter((q) => q.correct);
    const row = (q, showAnswer) =>
      `<div class="result-row">` +
      `<span class="result-phrase">${escapeHtml(q.phrase)}</span>` +
      `<span class="result-meaning">${escapeHtml(q.meaning)}</span>` +
      // リザルトからその場で「できた」チェックを付け外しできるトグル
      `<button type="button" class="result-done${mastered[q.phrase] ? " on" : ""}" data-phrase="${escapeHtml(q.phrase)}">${mastered[q.phrase] ? "✅ できた" : "⬜ できた"}</button>` +
      (showAnswer
        ? `<span class="result-your">あなた: ${q.answer ? escapeHtml(q.answer) : "（未入力）"}</span>`
        : "") +
      `</div>`;
    const wrongHtml = wrongItems.length
      ? `<div class="result-section ng"><div class="result-head">❌ 間違えた問題（${wrongItems.length}）</div>` +
        wrongItems.map((q) => row(q, true)).join("") +
        `</div>`
      : "";
    const okHtml = okItems.length
      ? `<div class="result-section ok"><div class="result-head">⭕️ 正解した問題（${okItems.length}）</div>` +
        okItems.map((q) => row(q, false)).join("") +
        `</div>`
      : "";
    quizResult.innerHTML =
      `🎉 第${setIndex + 1}セット終了！<br>スコア: <strong>${score} / ${cards.length}</strong>` +
      `<div class="result-list">${wrongHtml}${okHtml}</div>` +
      `${nextBtn}` +
      `<br><br><button id="quiz-restart">🔁 もう一度</button> ` +
      `<button id="quiz-to-sets">📚 セット選択へ</button>`;
    document.getElementById("quiz-restart").addEventListener("click", startQuiz);
    document.getElementById("quiz-to-sets").addEventListener("click", () => showSetSelect("quiz"));
    // 次の10問へ：ホーム/セット選択を経由せずダイレクトに次セットの未習得問題を開始
    const nb = document.getElementById("quiz-next-set");
    if (nb) nb.addEventListener("click", () => startSet(setIndex + 1));
    // 各行の「できた」トグル（その場でチェックを付け外し・保存される）
    quizResult.querySelectorAll(".result-done").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = btn.dataset.phrase;
        if (mastered[p]) delete mastered[p];
        else mastered[p] = true;
        saveMastered();
        const on = !!mastered[p];
        btn.classList.toggle("on", on);
        btn.textContent = on ? "✅ できた" : "⬜ できた";
      });
    });
  }

  /* ---------- 英熟語バトル（ローグライク） ---------- */
  const BASE_MAX_HP = 100;
  const MAX_FLOOR = 100;
  /* 敵図鑑：hp/atk=倍率、dodge=回避率、physCut=物理カット率、trait=固有特性
   *  ねずみ   … 群れ（倒すと仲間が乱入）＋「病気」を付与
   *  こうもり … 超回避＋攻撃でHP吸収
   *  クモ     … 「猛毒」「束縛」を付与
   *  ヘビ     … こちらのミスに即カウンター＋「麻痺」を付与
   *  サソリ   … 物理30%カット。プレイヤーHP30%以下で致命の一撃
   *  おおかみ … 仲間がいると攻撃+20%。遠吠えで次の攻撃2倍
   *  サメ     … 手負い特効（HPが減っていると攻撃1.5倍＆会心）＋3連撃
   *  ゆうれい … 物理をよく透かす（魔法職は必中）＋MP吸収
   *  ゾンビ   … 一度だけ復活（火・光で倒すと復活しない）＋防具半減
   *  おに     … 金棒ガードで物理を確率半減＋「気絶」を付与
   *  てんぐ   … 出会いがしらに先制攻撃＋構えを乱す
   *  ドラゴン … ブレスで「炎上」フィールド
   *  魔王     … 3ターンごとに手下を召喚して壁に＋「死の呪い」
   */
  const ENEMIES = [
    { id: "nezumi", emoji: "🐀", name: "Rat", img: "img/enemies/nezumi.png", hp: 0.4, atk: 0.6, dodge: 0.2, trait: "Swarm / Disease" },
    { id: "koumori", emoji: "🦇", name: "Bat", img: "img/enemies/koumori.png", hp: 0.5, atk: 0.6, dodge: 0.35, trait: "Evasive / Lifesteal" },
    { id: "kumo", emoji: "🕷️", name: "Spider", img: "img/enemies/kumo.png", hp: 1, atk: 1, dodge: 0.1, trait: "Poison / Bind" },
    { id: "hebi", emoji: "🐍", name: "Snake", img: "img/enemies/hebi.png", hp: 1, atk: 1.4, dodge: 0.15, trait: "Counter / Paralyze" },
    { id: "sasori", emoji: "🦂", name: "Scorpion", img: "img/enemies/sasori.png", hp: 1.1, atk: 1, dodge: 0, physCut: 0.3, trait: "Hard Shell / Critical" },
    { id: "ookami", emoji: "🐺", name: "Wolf", img: "img/enemies/ookami.png", hp: 1.1, atk: 1.3, dodge: 0.1, trait: "Pack Boost / Howl" },
    { id: "yuurei", emoji: "👻", name: "Ghost", img: "img/enemies/yuurei.png", hp: 0.6, atk: 1, dodge: 0.55, trait: "Phase / MP Drain" },
    { id: "zombie", emoji: "🧟", name: "Zombie", img: "img/enemies/zombie.png", hp: 2.5, atk: 0.9, dodge: 0, trait: "Revive / Armor Break" },
    { id: "oni", emoji: "👹", name: "Ogre", img: "img/enemies/oni.png", hp: 3, atk: 2, dodge: 0, physCut: 0.25, trait: "Club Guard / Stun" },
    { id: "tengu", emoji: "👺", name: "Tengu", img: "img/enemies/tengu.png", hp: 1.8, atk: 1.5, dodge: 0.2, trait: "First Strike / Disrupt" },
    { id: "same", emoji: "🦈", name: "Shark", img: "img/enemies/same.png", hp: 1.5, atk: 1.8, dodge: 0, trait: "Bloodlust / Triple Hit" },
  ];
  const BOSS = { id: "dragon", emoji: "🐉", name: "Dragon", img: "img/enemies/dragon.png", hp: 1, atk: 1.2, dodge: 0, trait: "Fire Breath / Burn Field" };
  const FINAL_BOSS = { id: "maou", emoji: "🐲", name: "Demon King", img: "img/enemies/maou.png", hp: 1, atk: 1.5, dodge: 0.1, trait: "Summon / Death Curse" };

  // 装備スロット
  const SLOTS = [
    { id: "weapon", icon: "⚔️", name: "Weapon" },
    { id: "head", icon: "🪖", name: "Helmet" },
    { id: "body", icon: "👕", name: "Armor" },
    { id: "legs", icon: "👖", name: "Legs" },
    { id: "shoes", icon: "👟", name: "Boots" },
  ];
  const SLOT_META = {};
  SLOTS.forEach((s) => (SLOT_META[s.id] = s));
  // レア度（5段階。深い階ほど高レアが出やすい）
  const RARITIES = [
    { id: "common", name: "Common", color: "#94a3b8" },
    { id: "uncommon", name: "Uncommon", color: "#4ade80" },
    { id: "rare", name: "Rare", color: "#38bdf8" },
    { id: "epic", name: "Epic", color: "#a78bfa" },
    { id: "legendary", name: "Legendary", color: "#fbbf24" },
    { id: "mythic", name: "Mythic", color: "#f43f5e" }, // ガチャ限定
  ];

  /* --- 戦略システムの定義 --- */
  // 構え：ダメージ倍率／被ダメージ倍率／バリアを壊せる枚数
  const STANCES = {
    attack: { icon: "⚔️", name: "Attack Stance", deal: 1.5, take: 1.7, break: 2, desc: "Deal x1.5, break 2 barriers, but take x1.7" },
    normal: { icon: "⚖️", name: "Neutral", deal: 1, take: 1, break: 1, desc: "Balanced" },
    guard: { icon: "🛡️", name: "Guard Stance", deal: 0.5, take: 0.3, break: 1, desc: "Take x0.3, but deal x0.5" },
  };
  // エリート敵（階の最後の敵として出現。バリア持ちで毎ターン行動）
  const ELITES = [
    { id: "iron", name: "Ironclad ", emoji: "💠", barrier: 3, coinMult: 3, desc: "3 barriers" },
    { id: "berserk", name: "Savage ", emoji: "💢", barrier: 2, atkMult: 2, coinMult: 3, desc: "x2 attack" },
    { id: "gold", name: "Golden ", emoji: "👑", barrier: 2, coinMult: 6, desc: "x6 coins" },
    { id: "hex", name: "Hexing ", emoji: "🔮", barrier: 2, cursey: true, coinMult: 3, desc: "Frequent curses" },
  ];
  // 敵の行動予告
  const INTENT_INFO = {
    attack: { icon: "🗡️", label: "Attack" },
    strong: { icon: "😤", label: "Heavy Attack (x2.5)" },
    heal: { icon: "💚", label: "Heal" },
    curse: { icon: "🔮", label: "Curse" },
  };

  /* --- 道具カタログ（消費アイテム）＆お守りカタログ（パッシブ遺物） --- */
  // kind: heal(HP回復) / mp(MP回復) / scroll(使い捨ての戦術) ／ battleOnly: 戦闘中のみ使用可
  const CONSUMABLES = [
    { id: "potion", icon: "🧪", name: "HP Potion", price: 60, kind: "heal", hpPct: 0.5, desc: "Restore 50% HP" },
    { id: "hipotion", icon: "🍶", name: "Super Potion", price: 130, kind: "heal", hpPct: 1.0, desc: "Restore full HP" },
    { id: "ether", icon: "🔷", name: "Ether", price: 70, kind: "mp", mpPct: 0.6, desc: "Restore 60% MP" },
    { id: "sc_bomb", icon: "📜", name: "Blast Scroll", price: 100, kind: "scroll", sc: "bomb", battleOnly: true, desc: "Huge damage (pierces barrier)" },
    { id: "sc_shatter", icon: "📜", name: "Break Scroll", price: 80, kind: "scroll", sc: "shatter", battleOnly: true, desc: "Destroy all enemy barriers" },
    { id: "sc_purify", icon: "📜", name: "Purify Scroll", price: 80, kind: "scroll", sc: "purify", desc: "Cure all ailments + heal 30% HP" },
  ];
  const RELICS_CATALOG = [
    { id: "ward", icon: "🧿", name: "Ward Charm", price: 160, desc: "Always take 20% less damage", fx: { dmgReduce: 0.2 } },
    { id: "medic", icon: "💊", name: "Medic Charm", price: 150, desc: "Healing items +50%", fx: { healBoost: 0.5 } },
    { id: "beast", icon: "🐾", name: "Beast Charm", price: 130, desc: "-40% damage from beasts (Wolf/Shark)", fx: { cutBeast: 0.4 } },
    { id: "holy", icon: "✝️", name: "Holy Charm", price: 130, desc: "-40% damage from undead (Ghost/Zombie)", fx: { cutUndead: 0.4 } },
    { id: "lucky", icon: "🍀", name: "Lucky Charm", price: 140, desc: "+30% coins", fx: { coinBoost: 0.3 } },
  ];


  /* --- キャラクター --- */
  /* 5職業：HP/MP/ATK/DEF/SPD＋固有スキル
   *  SPD は「敵の回避をすり抜ける力」と「自分の回避」に効く
   *  magic:true の職業は攻撃が魔法扱い（ゆうれいに必中・サソリ/おにの物理カット無視） */
  const CHARS = [
    {
      id: "knight", name: "Knight", emoji: "🛡️",
      desc: "Very high HP & defense. Skill stuns enemies to stop big moves.",
      stats: "HP:Max MP:Low ATK:Mid DEF:Max SPD:Low",
      hpPct: 0.6, def: 40, mp: 40, spd: 2,
      skill: { icon: "🛡️", name: "Shield Bash", cost: 30, desc: "Physical damage = 5x DEF + stun enemy 1 turn" },
    },
    {
      id: "assassin", name: "Assassin", emoji: "🗡️",
      desc: "Lightning fast. ATK+25%, Crit+15%. Skill never misses.",
      stats: "HP:Low MP:Mid ATK:High DEF:Low SPD:Max",
      hpPct: -0.15, atkPct: 0.25, crit: 0.15, mp: 60, spd: 10,
      skill: { icon: "🗡️", name: "Shadow Strike", cost: 30, desc: "Guaranteed hit & crit (great vs evasive foes)" },
    },
    {
      id: "wizard", name: "Wizard", emoji: "🔮",
      desc: "ATK+35% (magic). Ignores phys-cut & phase.",
      stats: "HP:Mid MP:Max ATK(mag):Max DEF:Low SPD:Mid",
      atkPct: 0.35, mp: 120, spd: 5, magic: true,
      skill: { icon: "💥", name: "Explosion", cost: 40, desc: "Fiery AoE. Hits back rows too (zombies can't revive)" },
    },
    {
      id: "cleric", name: "Cleric", emoji: "✨",
      desc: "Holy caster. High HP, heals on kill, strong vs ailments.",
      stats: "HP:High MP:High ATK:Mid DEF:High SPD:Mid",
      hpPct: 0.3, def: 20, killHealPct: 0.05, mp: 90, spd: 5, magic: true,
      skill: { icon: "🌟", name: "Saint Nova", cost: 35, desc: "Holy damage + heal 25% HP + cure 1 ailment" },
    },
    {
      id: "alchemist", name: "Alchemist", emoji: "⚗️",
      desc: "Balanced. Coins+20%. Acid melts tough defenses.",
      stats: "HP:Mid MP:Mid ATK:Mid DEF:Mid SPD:High",
      hpPct: 0.1, def: 15, atkPct: 0.1, coinMult: 1.2, mp: 80, spd: 7,
      skill: { icon: "⚗️", name: "Acid Bottle", cost: 25, desc: "Nullify enemy defense 3 turns + 8% max HP DoT" },
    },
  ];

  /* --- ルートマップ（分岐型ローグライク） --- */
  const MAP_LAYERS = 15; // 1ステージのマス数（最後はボス）
  const NODE_TYPES = {
    battle: { icon: "⚔️", name: "Battle", img: "img/nodes/battle.png" },
    elite: { icon: "💠", name: "Elite", img: "img/nodes/elite.png" },
    event: { icon: "❓", name: "Event", img: "img/nodes/event.png" },
    shop: { icon: "🛒", name: "Shop", img: "img/nodes/shop.png" },
    gacha: { icon: "🎲", name: "Gacha", img: "img/nodes/gacha.png" },
    boss: { icon: "👹", name: "Boss", img: "img/nodes/boss.png" },
  };

  const floorLabel = document.getElementById("floor-label");
  const enemyEmoji = document.getElementById("enemy-emoji");
  const enemyName = document.getElementById("enemy-name");
  const enemyHpFill = document.getElementById("enemy-hp-fill");
  const enemyHpText = document.getElementById("enemy-hp-text");
  const playerHpFill = document.getElementById("player-hp-fill");
  const playerHpText = document.getElementById("player-hp-text");
  const battleMessage = document.getElementById("battle-message");
  const battleHint = document.getElementById("battle-hint");
  const battleSentence = document.getElementById("battle-sentence");
  const battleForm = document.getElementById("battle-form");
  const battleInput = document.getElementById("battle-input");
  const battleCard = battleForm.parentElement;
  const battleOver = document.getElementById("battle-over");
  const battleReward = document.getElementById("battle-reward");
  const rewardTitle = document.getElementById("reward-title");
  const rewardGrid = document.getElementById("reward-grid");
  const equipPanel = document.getElementById("equip-panel");
  const comboBadge = document.getElementById("combo-badge");
  const battleStage = document.querySelector("#battle .battle-stage");
  const coinBadge = document.getElementById("coin-badge");
  const playerStats = document.getElementById("player-stats");
  const damageStats = document.getElementById("damage-stats");

  let pool = [];
  let playerHp = BASE_MAX_HP;
  let playerMaxHp = BASE_MAX_HP;
  let floor = 1;
  let defeated = 0;
  let wrongCount = 0; // 間違えた回数（バトル中）
  let stageQuizLog = []; // 今のステージで答えた問題の記録（ステージクリア時のリザルト用）
  let combo = 0; // 連続正解数（コンボ。1問でも間違えると0に戻る）
  let coins = 0; // 所持コイン（敵撃破でランダム入手、ショップで使う）
  let enemiesRemaining = 1; // この階に残っている敵の数
  let splashDamage = 0; // 後ろの敵に蓄積する範囲ダメージ
  const backpack = []; // 外した装備を保管するリュック
  let backpackFilter = "all"; // リュックの振り分け（all / weapon / head / body / legs / shoes）
  let perkPicksLeft = 0; // 残りのパーク選択回数（妖精で2回になる）
  let bonusActive = false; // ステータスの妖精による2回選択中か
  let atkStackMult = 1; // 攻撃ごとに乗算で増える倍率（一部装備）
  let noHitStreak = 0; // 被弾せずに連続攻撃した回数
  let tempAtkBuffPct = 0; // 被弾後の一時攻撃バフ（次の攻撃で消費）
  let totalDamageDealt = 0; // これまでに与えた累計ダメージ
  let immuneLeft = 0; // 残りダメージ無効回数（神核装甲など）
  let bonusHits = 0; // 追加攻撃回数（撃破で増える）
  let causalAtk = 0; // 因果律の剣：与ダメから永続加算する攻撃（武器を外すと無効）
  let bombStore = 0; // チンギスの騎馬靴：貯めた爆弾ダメージ
  let lastAttackDamage = 0; // 直近の攻撃で与えたダメージ
  let maxAttackDamage = 0; // このバトルでの最高ダメージ（開始ごとにリセット）
  let peakTier = 0; // この戦闘で到達したダメージ演出の最大ランク
  /* --- 戦略システム --- */
  let stance = "normal"; // 構え（attack / normal / guard）
  let enemyBarrier = 0; // 敵のバリア枚数（ボス・エリートは一撃で倒せない）
  let enemyIntent = null; // 敵の次の行動の予告
  let enemyElite = null; // エリート敵の特性（nullなら通常敵）
  let enemyActs = false; // 毎ターン行動する敵か（ボス・エリート）
  let curseNext = false; // 呪い状態：次の攻撃が半減＆バリアを壊せない
  /* --- ルート選択型ローグライク --- */
  let playerChar = CHARS[0]; // 選択中のキャラクター
  let currentNodeType = "battle"; // 今いるマスの種類
  let routeMap = []; // ステージのマップ（レイヤーごとのマスの配列）
  let layerIdx = -1; // 今いるレイヤー（-1=出発前）
  let nodeIdx = -1; // 今いるマスの位置
  let stageNum = 1; // 何ステージ目か
  let overkillStreak = 0; // オーバーキル連続回数（自動バランス調整用）
  /* --- 職業・スキル・状態異常 --- */
  let playerMp = 100; // スキル用のMP（正解で回復）
  let playerMaxMp = 100;
  const playerStatus = {}; // 状態異常 { poison:残りターン, sick, para, bind, stun, doom, burn, armor }
  let enemyStun = 0; // 敵の気絶（シールドバッシュ）
  let enemyAcid = 0; // 酸（防御特性無効＋毎ターン固定ダメージ）の残りターン
  let wolfHowl = false; // おおかみの遠吠え（次の攻撃2倍）
  let maouSummonTick = 0; // 魔王の召喚カウント
  let zombieRevived = false; // このゾンビがもう復活したか
  let swarmAdds = 0; // この階でねずみが乱入した回数
  /* --- 道具（インベントリ）＆お守り（遺物） --- */
  const inventory = []; // 消費アイテム（回復ポーション・巻物）
  const relics = []; // お守り（パッシブ遺物・所持しているだけで効果）
  let itemUsesThisBattle = 0; // この戦闘での道具使用回数
  const MAX_ITEM_USES = 3; // 1戦闘の道具使用上限
  const MAX_INVENTORY = 8; // 道具の最大所持数
  let itemsCtx = "battle"; // 道具メニューを開いた文脈（battle / map）
  function relicFx(key) {
    return relics.reduce((s, r) => s + ((r.fx && r.fx[key]) || 0), 0);
  }
  function hasRelic(id) {
    return relics.some((r) => r.id === id);
  }
  let enemyHp = 0;
  let enemyMaxHp = 0;
  let currentEnemy = null;
  let battleIdiom = null;

  // パーク（敵撃破ごとの3択強化）
  let attackBonus = 0; // 攻撃ダメージに加算
  let critChance = 0; // 会心（2倍）の確率
  let damageReduction = 0; // 被ダメージの軽減
  let lifesteal = 0; // 攻撃成功時の回復量
  let perkMaxHpBonus = 0; // 最大HP加算（パーク由来）

  // 撃破・階・与ダメによる累積ボーナスと一時フラグ
  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusMaxHp = 0;
  let bonusCrit = 0;
  let reviveUsed = false;
  let enemyIsBoss = false;

  // 装備（各スロットにアイテム or null。5階ごとの宝箱で入手）
  const equipment = { weapon: null, head: null, body: null, legs: null, shoes: null };

  const PERKS = [
    { icon: "⚔️", name: "Attack Up", desc: "Attack damage +8", apply: () => (attackBonus += 8) },
    { icon: "🔥", name: "Power Strike", desc: "Attack damage +15", apply: () => (attackBonus += 15) },
    { icon: "💥", name: "Critical Hit", desc: "25% chance to deal x2 damage", apply: () => (critChance += 0.25) },
    { icon: "❤️", name: "Max HP +25", desc: "Max HP +25 and heal", apply: () => (perkMaxHpBonus += 25) },
    { icon: "✨", name: "Heal", desc: "Restore 40 HP", apply: () => (playerHp = Math.min(playerMaxHp, playerHp + 40)) },
    { icon: "🩸", name: "Lifesteal", desc: "Heal 4 HP on every attack", apply: () => (lifesteal += 4) },
  ];

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function randomOf(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ===== 効果エンジン（装備の fx を解釈） =====
  function equippedItems() {
    return Object.values(equipment).filter(Boolean);
  }
  // 徳川家康の太刀「天下統一」：防具（武器以外）の効果を2倍にする
  function doubleArmorActive() {
    return equippedItems().some((it) => it.fx.doubleArmor);
  }
  function fxScale(it) {
    return it.slot !== "weapon" && doubleArmorActive() ? 2 : 1;
  }
  function sumFx(key) {
    let t = 0;
    for (const it of equippedItems()) if (typeof it.fx[key] === "number") t += it.fx[key] * fxScale(it);
    return t;
  }
  function maxFx(key) {
    let m = 0;
    for (const it of equippedItems()) if (typeof it.fx[key] === "number") m = Math.max(m, it.fx[key] * fxScale(it));
    return m;
  }
  function hasFx(key) {
    return equippedItems().some((it) => it.fx[key]);
  }
  function condList(key) {
    const arr = [];
    for (const it of equippedItems()) if (it.fx[key]) arr.push(it.fx[key]);
    return arr;
  }

  // 装備中の指定レア度の数
  function countRarity(r) {
    return equippedItems().filter((it) => it.rarity === r).length;
  }
  // レア度の強さ順位（高いほど高レア。並べ替えに使う）
  function rarityRank(id) {
    const i = RARITIES.findIndex((r) => r.id === id);
    return i < 0 ? 0 : i;
  }
  // 大きな数を読みやすく
  // 巨大数を英語の短縮単位（Qa=quadrillion … Vg=vigintillion）で短く表示する
  const BIG_UNITS = [
    [1e63, "Vg"], [1e60, "Nod"], [1e57, "Ocd"], [1e54, "Spd"], [1e51, "Sxd"],
    [1e48, "Qid"], [1e45, "Qad"], [1e42, "Td"], [1e39, "Dd"], [1e36, "Ud"],
    [1e33, "Dc"], [1e30, "No"], [1e27, "Oc"], [1e24, "Sp"], [1e21, "Sx"],
    [1e18, "Qi"], [1e15, "Qa"],
  ];
  function formatNum(n) {
    if (!isFinite(n)) return "∞";
    n = Math.round(n);
    const abs = Math.abs(n);
    if (abs < 1e15) return n.toLocaleString("en-US"); // 1 quadrillion 未満はカンマ区切り
    if (abs >= 1e66) return n.toExponential(2); // vigintillion を超えたら指数表記
    for (const [v, name] of BIG_UNITS) {
      if (abs >= v) return (n / v).toFixed(2).replace(/\.?0+$/, "") + name;
    }
    return n.toExponential(2);
  }
  // ダメージ・ステータスの上限（1e300＝ほぼ無限。Infinity/NaNで計算が壊れるのを防ぐ）
  const NUM_CAP = 1e300;
  function clampNum(n) {
    if (Number.isNaN(n)) return 0;
    if (!isFinite(n) || n > NUM_CAP) return NUM_CAP;
    return n;
  }

  function baseAtk() {
    // 因果律の剣の永続加算は、その武器を装備している間だけ有効
    return attackBonus + sumFx("atk") + bonusAtk + (hasFx("damageToAtkPct") ? causalAtk : 0);
  }
  function baseDef() {
    return damageReduction + sumFx("def") + bonusDef + (playerChar.def || 0);
  }
  // 会心率（基本＋装備＋変換＋条件）
  function critTotal() {
    let c = critChance + sumFx("crit") + bonusCrit + (playerChar.crit || 0);
    c += baseDef() * sumFx("convDefToCrit"); // 防御→会心
    const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 1;
    c += (1 - hpRatio) * sumFx("scalingLowHpCrit"); // HPが低いほど会心up
    for (const x of condList("lowHpCrit")) if (hpRatio <= x.th) c += x.pct;
    if (enemyIsBoss) c += sumFx("bossCrit");
    c *= 1 + sumFx("critMult"); // 会心率の乗算（例 1.5倍）
    if (enemyIsBoss && hasFx("bossCritMult")) c *= Math.max(1, sumFx("bossCritMult"));
    return c;
  }
  function effAttack() {
    let a = baseAtk();
    a += baseDef() * sumFx("convDefToAtk"); // 防御→攻撃
    a += playerHp * sumFx("convCurHpToAtk"); // 現在HP→攻撃
    a += playerMaxHp * sumFx("convMaxHpToAtk"); // 最大HP→攻撃
    return Math.max(0, a);
  }
  function effDefense() {
    let d = baseDef();
    d += baseAtk() * sumFx("convAtkToDef");
    d *= 1 + sumFx("defMult"); // 防御の乗算（例 2倍）
    if (playerStatus.armor > 0) d *= 0.5; // ゾンビの「防具半減」
    return Math.max(0, Math.round(d));
  }
  // 攻撃の倍率（HP割合・ボス・敵HP・装備数などの条件。加算式）
  function attackMultiplier() {
    let mult = 1;
    const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 1;
    for (const c of condList("lowHpAtk")) if (hpRatio <= c.th) mult += c.pct;
    const scaleMax = maxFx("scalingLowHpAtk");
    if (scaleMax > 0) mult += (1 - hpRatio) * scaleMax;
    mult += (1 - hpRatio) * sumFx("missingHpAtk"); // 残りHPが少ないほど攻撃up
    if (enemyIsBoss) mult += sumFx("bossAtk");
    const enemyRatio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1;
    for (const c of condList("lowEnemyAtk")) if (enemyRatio <= c.th) mult += c.pct;
    for (const c of condList("highEnemyAtk")) if (enemyRatio >= c.th) mult += c.pct;
    mult += sumFx("atkPct"); // 攻撃力+X%
    if (hpRatio >= 0.999) mult += sumFx("highHpAtk"); // HP最大時
    if (critTotal() >= 1) mult += sumFx("critOverAtk"); // 会心率100%以上で
    mult += countRarity("common") * sumFx("commonCountAtkPct"); // コモン装備数で
    mult += equippedItems().length * sumFx("allCountAtkPct"); // 全装備数で
    mult += tempAtkBuffPct; // 被弾後の一時バフ
    mult += playerChar.atkPct || 0; // キャラクターの攻撃ボーナス
    return mult;
  }
  // 会心ダメージ倍率（基本2倍＋特殊）
  function critMultiplier() {
    let m = 2 + sumFx("critDmgBonus");
    const over = sumFx("critOverDmgMult"); // 会心率100%超過1%につき乗算
    if (over > 0) {
      const overPct = Math.max(0, critTotal() - 1) * 100;
      if (overPct > 0) m *= Math.pow(over, overPct);
    }
    if (enemyIsBoss && hasFx("bossDigitsCrit")) m *= 1000;
    return m;
  }
  // 最大HPを再計算（基本＋パーク＋装備＋累積＋変換＋乗算）。増えた分は回復する。
  function recomputeMaxHp() {
    let m = BASE_MAX_HP + perkMaxHpBonus + sumFx("maxHp") + bonusMaxHp;
    m += baseDef() * sumFx("convDefToHp");
    m += baseAtk() * sumFx("convAtkToHp"); // 天界守護脚甲：攻撃力をHPにも加算
    m *= 1 + sumFx("maxHpMult"); // 最大HPの乗算（例 2倍）
    m *= 1 + (playerChar.hpPct || 0); // キャラクターのHPボーナス
    m = Math.max(1, Math.round(m));
    const delta = m - playerMaxHp;
    playerMaxHp = m;
    if (delta > 0) playerHp = Math.min(playerMaxHp, playerHp + delta);
    else playerHp = Math.min(playerHp, playerMaxHp);
  }

  function startBattle() {
    pool = filterByLevel(IDIOMS, currentLevel);
    floor = 1;
    defeated = 0;
    wrongCount = 0;
    combo = 0;
    coins = 0;
    attackBonus = 0;
    critChance = 0;
    damageReduction = 0;
    lifesteal = 0;
    perkMaxHpBonus = 0;
    bonusAtk = 0;
    bonusDef = 0;
    bonusMaxHp = 0;
    bonusCrit = 0;
    reviveUsed = false;
    for (const id in equipment) equipment[id] = null;
    backpack.length = 0;
    inventory.length = 0;
    relics.length = 0;
    itemUsesThisBattle = 0;
    shopStock = [];
    shopItems = [];
    splashDamage = 0;
    playerMaxHp = BASE_MAX_HP;
    playerHp = BASE_MAX_HP;
    battleOver.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    battleMessage.textContent = "Answer correctly to attack!";
    renderEquipPanel();
    updateComboDisplay();
    updateCoinDisplay();
    perkPicksLeft = 0;
    bonusActive = false;
    atkStackMult = 1;
    noHitStreak = 0;
    tempAtkBuffPct = 0;
    totalDamageDealt = 0;
    immuneLeft = 0;
    bonusHits = 0;
    causalAtk = 0;
    bombStore = 0;
    lastAttackDamage = 0;
    maxAttackDamage = 0; // Best ダメージは1回の挑戦ごとにリセット
    peakTier = 0;
    stance = "normal";
    curseNext = false;
    overkillStreak = 0;
    stageNum = 1;
    layerIdx = -1;
    nodeIdx = -1;
    currentNodeType = "battle";
    for (const k in playerStatus) delete playerStatus[k];
    enemyStun = 0;
    enemyAcid = 0;
    wolfHowl = false;
    maouSummonTick = 0;
    swarmAdds = 0;
    renderStanceButtons();
    if (hasFx("startAtkMult")) atkStackMult = clampNum(atkStackMult * Math.max(1, sumFx("startAtkMult"))); // ミシック：戦闘開始時に攻撃倍率（ジェネシス）
    showQuestionSourceSelect(); // まず出題する単語の範囲を選ぶ → キャラクター選択へ
    updateBars();
  }

  /* --- 出題する単語の範囲を選ぶ（チェック無しだけ / 全部） --- */
  function showQuestionSourceSelect() {
    battleCard.classList.add("is-hidden");
    battleOver.classList.add("is-hidden");
    if (routeMapEl) routeMapEl.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    rewardTitle.textContent = "📖 Which words should appear?";
    const levelWords = filterByLevel(IDIOMS, currentLevel);
    const unchecked = levelWords.filter((w) => !mastered[w.phrase]);
    battleMessage.textContent = `This level has ${levelWords.length} words (${unchecked.length} not checked yet)`;
    rewardGrid.innerHTML = "";
    // ✅チェックの無い（まだ覚えてない）単語だけを出題
    shopButton(
      "⬜",
      "Unchecked words only",
      unchecked.length
        ? `Only the ${unchecked.length} words you haven't checked as done`
        : "🎉 All words are checked — falls back to all words",
      false,
      () => {
        pool = unchecked.length ? unchecked : levelWords;
        showCharSelect();
      },
    );
    // レベル内の全単語から出題
    shopButton(
      "📚",
      "All words",
      `Draw from all ${levelWords.length} words in this level`,
      false,
      () => {
        pool = levelWords;
        showCharSelect();
      },
    );
    updateBars();
  }

  /* --- キャラクター選択 --- */
  function showCharSelect() {
    battleCard.classList.add("is-hidden");
    battleOver.classList.add("is-hidden");
    if (routeMapEl) routeMapEl.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    rewardTitle.textContent = "🧝 Choose your character";
    battleMessage.textContent = "Each character is good at different things";
    rewardGrid.innerHTML = "";
    CHARS.forEach((ch) => {
      shopButton(
        ch.emoji,
        ch.name,
        `${ch.desc}<br><span class="char-stats">${ch.stats}</span><br>${ch.skill.icon}[${ch.skill.name}] ${ch.skill.desc} (MP${ch.skill.cost})`,
        false,
        () => {
          playerChar = ch;
          playerMaxMp = 50 + (ch.mp || 0);
          playerMp = playerMaxMp;
          recomputeMaxHp();
          playerHp = playerMaxHp;
          genMap();
          battleReward.classList.add("is-hidden");
          showMap(`${ch.emoji} Starting as ${ch.name}! 🗺️ Choose your first node`);
        },
      );
    });
    updateBars();
  }

  function spawnEnemy() {
    const isBossNode = currentNodeType === "boss";
    const isFinal = isBossNode && stageNum >= 2; // 2ステージ目以降のボスは魔王
    enemyIsBoss = isBossNode;
    if (enemyIsBoss && hasFx("totalDmgToAtkOnBoss")) {
      bonusAtk = clampNum(bonusAtk + totalDamageDealt); // ボス戦開始時、累計ダメージを攻撃へ
    }
    currentEnemy = isFinal ? FINAL_BOSS : isBossNode ? BOSS : randomOf(ENEMIES);
    // エリート：エリートマスでは確定。通常マスでも最後の敵が20%でエリート化
    enemyElite = null;
    if (!enemyIsBoss && currentNodeType === "elite") {
      enemyElite = randomOf(ELITES);
    } else if (!enemyIsBoss && floor >= 3 && enemiesRemaining === 1 && Math.random() < 0.2) {
      enemyElite = randomOf(ELITES);
    }
    // バリア：ボスとエリートは一撃で倒せない（1ターンに構えの枚数だけ破壊）
    enemyActs = enemyIsBoss || !!enemyElite;
    enemyBarrier = isFinal ? 8 : enemyIsBoss ? Math.min(7, 4 + Math.floor(floor / 20)) : enemyElite ? enemyElite.barrier : 0;
    curseNext = false;
    // 敵ごとの個体リセット
    enemyStun = 0;
    enemyAcid = 0;
    wolfHowl = false;
    zombieRevived = false;
    if (enemyIsBoss) maouSummonTick = 0;
    const base = isFinal ? 140 : isBossNode ? 70 : 22;
    // 深く進むごとに敵HPが増える（10マスごとに10倍）＋種族ごとのHP倍率
    const hpScale = Math.pow(10, Math.floor((floor - 1) / 10));
    enemyMaxHp = Math.round(
      (base + floor * 6) * (isFinal ? 10 : isBossNode ? 6 : enemyElite ? 2 : 1) * (currentEnemy.hp || 1) * hpScale,
    );
    enemyHp = enemyMaxHp;
    floorLabel.textContent =
      `Stage ${stageNum} · ${Math.max(1, layerIdx + 1)}/${MAP_LAYERS}` + (isBossNode ? " (Boss)" : "");
    enemyEmoji.classList.remove("defeated", "shake");
    // 敵の画像（エリートは特性の絵文字バッジを重ねる）
    if (currentEnemy.img) {
      enemyEmoji.innerHTML =
        `<img class="enemy-img${enemyIsBoss ? " boss" : ""}" src="${currentEnemy.img}" alt="${currentEnemy.name}">` +
        (enemyElite ? `<span class="elite-badge">${enemyElite.emoji}</span>` : "");
    } else {
      enemyEmoji.textContent = enemyElite ? enemyElite.emoji + currentEnemy.emoji : currentEnemy.emoji;
    }
    enemyName.innerHTML =
      (enemyElite ? `${enemyElite.name}` : "") +
      currentEnemy.name +
      (enemiesRemaining > 1 ? ` (${enemiesRemaining} left)` : "") +
      (currentEnemy.trait ? `<span class="trait-badge">${currentEnemy.trait}</span>` : "");
    enemyName.title = currentEnemy.trait || "";
    rollIntent();
    // てんぐ：出会いがしらに先制攻撃してくる
    if (currentEnemy.id === "tengu" && playerHp > 0) {
      battleMessage.textContent = "👺 Tengu's first strike!";
      applyEnemyHit(0.6, "First strike");
      updateBars();
    }
  }

  /* --- 戦略システム：行動予告・バリア・構え・敵のターン --- */
  const enemyIntentEl = document.getElementById("enemy-intent");

  // 敵の次の行動を決めて予告を表示
  function rollIntent() {
    if (!enemyActs) {
      enemyIntent = null;
      renderIntent();
      return;
    }
    const r = Math.random();
    if (enemyElite && enemyElite.cursey && r < 0.35) enemyIntent = "curse";
    else if (r < 0.5) enemyIntent = "attack";
    else if (r < 0.75) enemyIntent = "strong";
    else if (r < 0.9) enemyIntent = "heal";
    else enemyIntent = "curse";
    renderIntent();
  }

  function renderIntent() {
    if (!enemyIntentEl) return;
    if (!enemyActs || !enemyIntent) {
      enemyIntentEl.classList.add("is-hidden");
      return;
    }
    const info = INTENT_INFO[enemyIntent];
    enemyIntentEl.classList.remove("is-hidden");
    enemyIntentEl.innerHTML =
      (enemyBarrier > 0 ? `<span class="barrier-badge">🛡️ Barrier x${enemyBarrier}</span>` : "") +
      `<span class="intent-badge">Next: ${info.icon} ${info.label}</span>`;
  }

  // 敵の1回分のダメージを自分に適用（無敵・回避・軽減・反射・復活も処理）
  // 戻り値：true=続行できる / false=ゲームオーバー
  function applyEnemyHit(mult, label) {
    if (immuneLeft > 0) {
      immuneLeft--;
      const im = sumFx("immuneAtkMult");
      if (im) atkStackMult = clampNum(atkStackMult * Math.max(1, im));
      battleMessage.textContent += ` / Blocked ${label} with immunity! (${immuneLeft} left)`;
      noHitStreak = 0;
      return true;
    }
    const dodgeP = Math.min(0.9, sumFx("dodge") + (playerChar.dodge || 0));
    if (dodgeP > 0 && Math.random() < dodgeP) {
      const das = sumFx("dodgeAtkStack");
      if (das) atkStackMult = clampNum(atkStackMult * Math.max(1, das));
      battleMessage.textContent += ` / Dodged ${label}!`;
      return true;
    }
    // 基本ダメージ＋（ボス/エリートは防御を貫通する割合ダメージ）
    let raw = Math.max(0, 8 + Math.round(floor * 1.5) - effDefense());
    const pierce = enemyIsBoss ? 0.12 : enemyElite ? 0.07 : 0;
    raw += Math.round(playerMaxHp * pierce);
    raw = Math.max(1, raw);
    if (enemyElite && enemyElite.atkMult) raw *= enemyElite.atkMult;
    raw *= currentEnemy.atk || 1; // 種族ごとの攻撃力
    // 種族の攻撃特性
    const sp = currentEnemy.id;
    let spNote = "";
    if (sp === "ookami") {
      if (enemiesRemaining > 1) raw *= 1.2; // 群れ強化
      if (wolfHowl) {
        raw *= 2;
        wolfHowl = false;
        spNote += " (Howl focus attack!)";
      }
    }
    if (sp === "same" && playerHp < playerMaxHp) {
      raw *= 1.5; // 手負い特効
      if (Math.random() < 0.3) {
        raw *= 1.8;
        spNote += " (🦈 Triple hit!)";
      }
    }
    if (sp === "sasori" && playerHp / playerMaxHp <= 0.3) {
      raw *= 3;
      spNote += " (🦂 Critical strike!)";
    }
    raw *= mult * STANCES[stance].take; // 強攻撃倍率と構え
    raw *= playerChar.takeMult || 1; // キャラクターの被ダメ補正
    let reduce = sumFx("damageReducePct");
    for (const c of condList("damageReduceLowHp")) {
      if (playerHp / playerMaxHp <= c.th) reduce += c.pct;
    }
    // お守り（遺物）の被ダメージ軽減
    reduce += relicFx("dmgReduce");
    if ((sp === "ookami" || sp === "same") && relicFx("cutBeast")) reduce += relicFx("cutBeast");
    if ((sp === "yuurei" || sp === "zombie") && relicFx("cutUndead")) reduce += relicFx("cutUndead");
    reduce = Math.min(0.95, reduce);
    const reflectDmg = Math.round(raw * sumFx("reflect"));
    const incoming = Math.max(0, Math.round(raw * (1 - reduce)));
    playerHp -= incoming;
    if (reflectDmg > 0) enemyHp -= reflectDmg;
    noHitStreak = 0;
    tempAtkBuffPct = Math.max(tempAtkBuffPct, sumFx("onHitBuffAtkPct"));
    battleMessage.textContent +=
      ` / ${label} deals ${formatNum(incoming)} damage!${spNote}` +
      (reflectDmg > 0 ? ` (${formatNum(reflectDmg)} reflected)` : "");
    // 攻撃後の種族特性（吸血・MP吸収・状態異常・遠吠えなど）
    if (sp === "koumori" && incoming > 0) {
      enemyHp = Math.min(enemyMaxHp, enemyHp + incoming);
      battleMessage.textContent += " (🦇 HP drained!)";
    }
    if (sp === "yuurei" && playerMp > 0) {
      playerMp = Math.max(0, playerMp - 15);
      battleMessage.textContent += " (👻 15 MP drained!)";
    }
    if (sp === "ookami" && !wolfHowl && Math.random() < 0.25) {
      wolfHowl = true;
      battleMessage.textContent += " (🐺 Howl! Next attack doubles)";
    }
    if (sp === "nezumi" && Math.random() < 0.3) applyStatus("sick", 3);
    if (sp === "kumo") {
      if (Math.random() < 0.3) applyStatus("poison", 3);
      else if (Math.random() < 0.25) applyStatus("bind", 2);
    }
    if (sp === "hebi" && Math.random() < 0.25) applyStatus("para", 3);
    if (sp === "oni" && Math.random() < 0.25) applyStatus("stun", 1);
    if (sp === "zombie" && Math.random() < 0.25) applyStatus("armor", 3);
    if (sp === "tengu" && Math.random() < 0.2) {
      const keys = Object.keys(STANCES);
      stance = keys[randInt(0, keys.length - 1)];
      renderStanceButtons();
      battleMessage.textContent += ` (👺 Disrupt! Stance shifted to ${STANCES[stance].name})`;
    }
    if (sp === "dragon" && mult >= 2) applyStatus("burn", 3); // ブレスで炎上フィールド
    if (playerHp <= 0) {
      const revivePct = maxFx("revive");
      if (revivePct > 0 && !reviveUsed) {
        reviveUsed = true;
        playerHp = Math.max(1, Math.round(playerMaxHp * revivePct));
        battleMessage.textContent += ` 💫 Revived! HP ${formatNum(playerHp)}`;
        return true;
      }
      onGameOver();
      return false;
    }
    return true;
  }

  // 予告していた行動を敵が実行する（ボス・エリートのターン）
  // 戻り値：true=続行できる / false=ゲームオーバー
  function executeIntent() {
    if (!enemyActs || enemyHp <= 0) return true;
    // 気絶中は動けない（シールドバッシュ）
    if (enemyStun > 0) {
      enemyStun--;
      battleMessage.textContent += ` / 💫 ${currentEnemy.name} is stunned and can't move!`;
      rollIntent();
      return true;
    }
    let ok = true;
    if (enemyIntent === "heal") {
      const h = Math.round(enemyMaxHp * 0.2);
      enemyHp = Math.min(enemyMaxHp, enemyHp + h);
      battleMessage.textContent += ` / 💚 ${currentEnemy.name} heals ${formatNum(h)} HP!`;
    } else if (enemyIntent === "curse") {
      if (currentEnemy.id === "maou") {
        applyStatus("doom", 4); // 死の呪い：カウント0で即死（クレリックで解除／魔王撃破で解除）
        battleMessage.textContent += ` / 💀 The Demon King casts a death curse!`;
      } else {
        curseNext = true;
        battleMessage.textContent += ` / 🔮 Cursed! Your next attack is weakened`;
      }
    } else {
      ok = applyEnemyHit(enemyIntent === "strong" ? 2.5 : 1, INTENT_INFO[enemyIntent].icon + INTENT_INFO[enemyIntent].label);
    }
    // 魔王：3ターンごとに倒された魔物を召喚して壁にする（バリア+2）
    if (currentEnemy.id === "maou" && enemyHp > 0) {
      maouSummonTick++;
      if (maouSummonTick % 3 === 0) {
        enemyBarrier += 2;
        battleMessage.textContent += ` / 🐲 Summoned 2 fallen monsters as a wall! (Barrier +2)`;
      }
    }
    rollIntent();
    return ok;
  }

  // 構えの切り替えボタン
  const stanceRow = document.getElementById("stance-row");
  function renderStanceButtons() {
    if (!stanceRow) return;
    stanceRow.innerHTML = "";
    Object.entries(STANCES).forEach(([id, s]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "stance-btn" + (stance === id ? " active" : "");
      b.textContent = `${s.icon} ${s.name}`;
      b.title = s.desc;
      b.addEventListener("click", () => {
        stance = id;
        renderStanceButtons();
        battleMessage.textContent = `${s.icon} ${s.name}！ ${s.desc}`;
      });
      stanceRow.appendChild(b);
    });
  }

  /* ============================================================
   * 🧪 状態異常＆職業スキル
   * ============================================================ */
  const STATUS_INFO = {
    poison: { icon: "☠️", name: "Poison", desc: "5% max HP damage each turn" },
    sick: { icon: "🤢", name: "Disease", desc: "3% max HP damage each turn" },
    para: { icon: "⚡", name: "Paralyze", desc: "Cannot use skills" },
    bind: { icon: "🕸️", name: "Bind", desc: "Deal 30% less damage" },
    stun: { icon: "💫", name: "Stun", desc: "Next attack fizzles" },
    doom: { icon: "💀", name: "Death Curse", desc: "Instant death at 0! Cleric can cure" },
    burn: { icon: "🔥", name: "Burn", desc: "5% max HP damage each turn" },
    armor: { icon: "🩻", name: "Armor Break", desc: "Defense halved" },
  };
  const statusRowEl = document.getElementById("status-row");

  function applyStatus(key, turns) {
    playerStatus[key] = Math.max(playerStatus[key] || 0, turns);
    const info = STATUS_INFO[key];
    battleMessage.textContent += ` (${info.icon} ${info.name}!)`;
    renderStatusRow();
  }

  function renderStatusRow() {
    if (!statusRowEl) return;
    const chips = Object.entries(playerStatus)
      .filter(([, t]) => t > 0)
      .map(([k, t]) => {
        const s = STATUS_INFO[k];
        return `<span class="status-chip${k === "doom" ? " doom" : ""}" title="${s.desc}">${s.icon}${s.name} ${t}</span>`;
      });
    statusRowEl.innerHTML = chips.join("");
    statusRowEl.classList.toggle("is-hidden", chips.length === 0);
  }

  // 毎ターン（問題に答えるたび）状態異常が進行する。戻り値false=死亡
  function tickPlayerStatuses() {
    let dot = 0;
    if (playerStatus.poison > 0) dot += Math.round(playerMaxHp * 0.05);
    if (playerStatus.sick > 0) dot += Math.round(playerMaxHp * 0.03);
    if (playerStatus.burn > 0) dot += Math.round(playerMaxHp * 0.05);
    if (dot > 0) {
      playerHp -= dot;
      battleMessage.textContent = `🩸 Status effect deals ${formatNum(dot)} damage…`;
    }
    for (const k of Object.keys(playerStatus)) {
      if (k === "stun") continue; // 気絶は攻撃時に消費する
      if (playerStatus[k] > 0) playerStatus[k]--;
    }
    // 死の呪いが0になったら即死
    if (playerStatus.doom === 0 && "doom" in playerStatus) {
      delete playerStatus.doom;
      playerHp = 0;
      battleMessage.textContent = "💀 The death curse has taken hold…!";
    }
    renderStatusRow();
    if (playerHp <= 0) {
      const revivePct = maxFx("revive");
      if (revivePct > 0 && !reviveUsed) {
        reviveUsed = true;
        playerHp = Math.max(1, Math.round(playerMaxHp * revivePct));
        battleMessage.textContent += ` 💫 Revived!`;
        updateBars();
        return true;
      }
      onGameOver();
      return false;
    }
    updateBars();
    return true;
  }

  /* --- 職業スキル --- */
  const skillBtn = document.getElementById("use-skill");
  if (skillBtn) skillBtn.addEventListener("click", useSkill);

  function updateSkillButton() {
    if (!skillBtn) return;
    const sk = playerChar.skill;
    if (!sk) {
      skillBtn.classList.add("is-hidden");
      return;
    }
    skillBtn.classList.remove("is-hidden");
    const para = playerStatus.para > 0;
    skillBtn.textContent = para ? `⚡ Paralyzed…` : `${sk.icon} ${sk.name} (MP${sk.cost})`;
    skillBtn.disabled = para || playerMp < sk.cost || battleInput.disabled || enemyHp <= 0;
    skillBtn.title = sk.desc;
  }

  // スキルの基本ダメージ（コンボは乗らないが装備・倍率は乗る）
  function skillBaseDamage() {
    return clampNum((randInt(16, 24) + effAttack()) * attackMultiplier() * atkStackMult);
  }

  function dealSkillDamage(dmg, purge, label) {
    if (enemyBarrier > 0) {
      enemyBarrier = Math.max(0, enemyBarrier - 1);
      battleMessage.textContent = `${label} Destroyed 1 barrier! (${enemyBarrier} left)`;
      renderIntent();
      updateBars();
      return;
    }
    dmg = Math.round(clampNum(dmg));
    enemyHp = clampNum(enemyHp - dmg);
    recordDamage(dmg);
    showDamage(dmg, true);
    shakeEnemy();
    juiceHit(true, dmg);
    battleMessage.textContent = `${label} ${formatNum(dmg)} damage!`;
    updateBars();
    if (enemyHp <= 0) {
      handleEnemyKilled(purge);
    }
  }

  // 撃破処理（ゾンビの復活チェック付き）。purge=true（炎/聖のスキル等）ならゾンビは復活しない
  function handleEnemyKilled(purge) {
    if (currentEnemy.id === "zombie" && !zombieRevived && !purge) {
      zombieRevived = true;
      enemyHp = Math.round(enemyMaxHp * 0.5);
      battleMessage.textContent += ` / 🧟 The zombie rises again! (Defeat it with a fire/holy skill to stop the revival)`;
      updateBars();
      nextBattleQuestion();
      return;
    }
    onEnemyDefeated();
  }

  function useSkill() {
    const sk = playerChar.skill;
    if (!sk || playerMp < sk.cost || battleInput.disabled || enemyHp <= 0) return;
    if (playerStatus.para > 0) {
      battleMessage.textContent = "⚡ Paralyzed — can't use a skill!";
      return;
    }
    playerMp -= sk.cost;
    const id = playerChar.id;
    if (id === "knight") {
      // シールドバッシュ：DEF依存ダメージ＋敵を1ターン気絶
      enemyStun = 1;
      const dmg = clampNum((effDefense() * 5 + 100) * atkStackMult);
      dealSkillDamage(dmg, false, "🛡️ Shield Bash! The enemy is stunned!");
    } else if (id === "assassin") {
      // シャドウストライク：必中＆確定会心
      const dmg = clampNum(skillBaseDamage() * 2 * critMultiplier());
      dealSkillDamage(dmg, false, "🗡️ Shadow Strike! (Never misses · guaranteed crit)");
    } else if (id === "wizard") {
      // エクスプロージョン：炎の全体魔法（後ろの敵にも同ダメージ）
      const dmg = clampNum(skillBaseDamage() * 1.5);
      if (enemiesRemaining > 1) splashDamage = clampNum(splashDamage + dmg);
      dealSkillDamage(dmg, true, "💥 Explosion! (Fire spell hits all enemies)");
    } else if (id === "cleric") {
      // セイント・ノヴァ：聖魔法＋回復＋状態異常1つ解除
      const heal = Math.round(playerMaxHp * 0.25);
      playerHp = Math.min(playerMaxHp, playerHp + heal);
      const order = ["doom", "para", "poison", "sick", "burn", "armor", "bind", "stun"];
      const cured = order.find((k) => playerStatus[k] > 0 || (k === "doom" && "doom" in playerStatus));
      let cureNote = "";
      if (cured) {
        delete playerStatus[cured];
        cureNote = ` +Cured ${STATUS_INFO[cured].icon}${STATUS_INFO[cured].name}`;
        renderStatusRow();
      }
      const dmg = clampNum(skillBaseDamage() * 1.2);
      dealSkillDamage(dmg, true, `🌟 Saint Nova! Healed ${formatNum(heal)} HP${cureNote} / `);
    } else if (id === "alchemist") {
      // アシッドボトル：防御特性を無効化＋毎ターン固定ダメージ
      enemyAcid = 3;
      const dmg = Math.round(enemyMaxHp * 0.08);
      dealSkillDamage(dmg, false, "⚗️ Acid Bottle! The enemy's armor melts! (Lasts 3 turns)");
    }
    updateSkillButton();
    updateBars();
  }

  // 1マス分の敵をまとめてセットアップ（ボス・エリートは1体、通常マスは深さで増える）
  function beginFloorEnemies() {
    let count;
    if (currentNodeType === "boss" || currentNodeType === "elite") count = 1;
    else if (floor >= 20) count = randInt(3, 5);
    else count = randInt(1, 3);
    enemiesRemaining = count; // 通常マスは最大5体まで
    splashDamage = 0; // マスが変わったら範囲ダメージはリセット
    swarmAdds = 0; // ねずみの乱入回数もリセット
    itemUsesThisBattle = 0; // 道具の使用回数は1戦闘ごとにリセット
    spawnEnemy();
  }

  /* ============================================================
   * 🗺️ ルート選択型マップ（分岐するロードマップを自由に進む）
   * ============================================================ */
  const routeMapEl = document.getElementById("route-map");

  // マップ生成：15レイヤー。最初は戦闘、最後はボス、途中はいろいろなマス
  // 各マスは next[]（次のレイヤーで繋がっているマスの番号）を持ち、繋がった道しか進めない
  let pathIdx = []; // 実際に通った道（レイヤーごとの選択マス番号）
  let mapLocked = false; // マス確定後の入力ロック（連打・誤操作防止）

  // ステージ構成：独立レーン → チェックポイントで合流 → 再分岐 → …→ ボス
  // segments：各セグメントの「レーン数」と「本数（縦の長さ）」。合計＋節目＋ボスで MAP_LAYERS 列
  const MAP_SEGMENTS = [
    { lanes: 5, layers: 5 }, // 序盤：5本の独立ルート
    { lanes: 4, layers: 4 }, // 中盤：4本
    { lanes: 3, layers: 3 }, // 終盤：3本
  ];
  const MAP_CHECKPOINTS = ["elite", "shop"]; // セグメントの合流点（中ボス→ショップ）

  // セグメント内マスのランダムな種類（ボス・チェックポイント以外）
  function randSegType() {
    const r = Math.random();
    if (r < 0.48) return "battle";
    if (r < 0.62) return "elite";
    if (r < 0.76) return "event";
    if (r < 0.88) return "shop";
    return "gacha";
  }

  function genMap() {
    stageQuizLog = []; // 新しいステージに入ったらリザルトの記録をリセット
    // まず各列の「役割」を決める（seg本体／cp合流点／boss）
    const layout = [];
    MAP_SEGMENTS.forEach((seg, si) => {
      for (let li = 0; li < seg.layers; li++) {
        layout.push({ kind: "seg", lanes: seg.lanes, entry: li === 0 });
      }
      if (si < MAP_SEGMENTS.length - 1) layout.push({ kind: "cp", cpType: MAP_CHECKPOINTS[si] });
    });
    layout.push({ kind: "boss" });

    // 列ごとにマスを生成
    routeMap = layout.map((info) => {
      if (info.kind === "cp") return [{ type: info.cpType, lane: -1, visited: false, next: [] }];
      if (info.kind === "boss") return [{ type: "boss", lane: -1, visited: false, next: [] }];
      const nodes = [];
      for (let i = 0; i < info.lanes; i++) {
        nodes.push({ type: randSegType(), lane: i, visited: false, next: [] });
      }
      return nodes;
    });

    // 道（接続）を張る。ルールで「レーンは合流点以外では交わらない」を保証する
    for (let L = 0; L < layout.length - 1; L++) {
      const A = layout[L];
      const B = layout[L + 1];
      routeMap[L].forEach((node, i) => {
        if (B.kind === "cp" || B.kind === "boss") {
          node.next = [0]; // 節目の直前：全レーンが1点に合流
        } else if (A.kind === "cp") {
          node.next = routeMap[L + 1].map((_, j) => j); // 節目から再分岐（全レーンへ）
        } else {
          node.next = [i]; // セグメント内：自分のレーンをまっすぐ進む（他レーンへは行けない）
        }
      });
    }
    layerIdx = -1;
    nodeIdx = -1;
    pathIdx = [];
    mapLocked = false;
  }

  function showMap(msg) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleInput.disabled = true;
    if (msg) battleMessage.textContent = msg;
    routeMapEl.classList.remove("is-hidden");
    mapLocked = false; // 次のマスを選び直せるようにロック解除
    renderMap();
    updateBars();
  }

  // 今いるマスから繋がっている（＝選べる）マスかどうか
  function isReachable(L, i) {
    if (layerIdx === -1) return L === 0; // 出発前は1段目から選ぶ
    if (L !== layerIdx + 1) return false; // 次のレイヤー以外は選べない
    const cur = routeMap[layerIdx] && routeMap[layerIdx][nodeIdx];
    return !!(cur && cur.next && cur.next.includes(i));
  }

  function renderMap() {
    if (!routeMapEl) return;
    const legend = ["battle", "elite", "event", "shop", "gacha", "boss"]
      .map((t) => `<span class="legend-item"><img src="${NODE_TYPES[t].img}" alt="">${NODE_TYPES[t].name}</span>`)
      .join(" ");
    routeMapEl.innerHTML =
      `<div class="map-title">🗺️ Stage ${stageNum} Route Map` +
      `<button type="button" id="map-items" class="map-items-btn">🎒 Items (${inventory.length})</button>` +
      `<span class="map-sub">You can only pick connected nodes　${legend}</span></div>`;
    const itemsBtn = routeMapEl.querySelector("#map-items");
    if (itemsBtn) itemsBtn.addEventListener("click", () => showItems("map"));
    const inner = document.createElement("div");
    inner.className = "map-inner";
    inner.innerHTML = `<svg class="map-lines" xmlns="http://www.w3.org/2000/svg"></svg>`;
    routeMap.forEach((layer, L) => {
      const row = document.createElement("div");
      row.className = "map-row";
      layer.forEach((node, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "map-node n-" + node.type;
        b.innerHTML = `<img src="${NODE_TYPES[node.type].img}" alt="${NODE_TYPES[node.type].name}">`;
        b.title = NODE_TYPES[node.type].name;
        if (L === layerIdx && i === nodeIdx) b.classList.add("current");
        else if (node.visited) b.classList.add("visited");
        if (isReachable(L, i)) {
          b.classList.add("selectable");
          b.addEventListener("click", () => enterNode(L, i));
        } else {
          b.disabled = true;
        }
        row.appendChild(b);
      });
      inner.appendChild(row);
    });
    routeMapEl.appendChild(inner);
    // マスとマスをつなぐ道を描く（レイアウト完了前に走ることがあるので少し後にも再描画）
    requestAnimationFrame(() => drawMapLines(inner));
    setTimeout(() => drawMapLines(inner), 150);
    // 今いる場所が見えるようにスクロール
    const cur = routeMapEl.querySelector(".map-node.selectable") || routeMapEl.querySelector(".map-node.current");
    if (cur) setTimeout(() => cur.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  }

  // マス同士の接続線をSVGで描画（通った道は緑、今選べる道は光る紫）
  function drawMapLines(inner) {
    const svg = inner.querySelector("svg.map-lines");
    if (!svg) return;
    const rows = [...inner.querySelectorAll(".map-row")];
    const innerRect = inner.getBoundingClientRect();
    if (innerRect.width === 0) return; // 非表示中は描けない
    svg.setAttribute("viewBox", `0 0 ${inner.clientWidth} ${inner.scrollHeight}`);
    svg.style.width = inner.clientWidth + "px";
    svg.style.height = inner.scrollHeight + "px";
    let html = "";
    routeMap.forEach((layer, L) => {
      if (L >= routeMap.length - 1 || !rows[L] || !rows[L + 1]) return;
      layer.forEach((node, i) => {
        const a = rows[L].children[i];
        if (!a) return;
        (node.next || []).forEach((j) => {
          const b = rows[L + 1].children[j];
          if (!b) return;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const x1 = ra.left + ra.width / 2 - innerRect.left;
          const y1 = ra.bottom - innerRect.top - 3;
          const x2 = rb.left + rb.width / 2 - innerRect.left;
          const y2 = rb.top - innerRect.top + 3;
          let cls = "ln";
          if (pathIdx[L] === i && pathIdx[L + 1] === j) cls += " taken"; // 通った道
          else if (L === layerIdx && i === nodeIdx) cls += " open"; // 今選べる道
          html += `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        });
      });
    });
    svg.innerHTML = html;
  }
  // 画面サイズが変わったら道を引き直す（ズレ防止）
  window.addEventListener("resize", () => {
    if (!routeMapEl || routeMapEl.classList.contains("is-hidden")) return;
    const inner = routeMapEl.querySelector(".map-inner");
    if (inner) drawMapLines(inner);
  });

  // マスに入る（深さ=floorが1増え、階を進む系の装備効果が発動する）
  function enterNode(L, i) {
    // 【不正移動の完全禁止】確定後の連打ロック＋接続していない道はシステム側で弾く
    if (mapLocked) return;
    if (!isReachable(L, i)) return; // 繋がっていないマス・後戻り・横移動はすべて拒否
    mapLocked = true;
    // 【UIロック】選択した瞬間、他のマスをすべて選択不可にする
    routeMapEl.querySelectorAll(".map-node").forEach((b) => {
      b.disabled = true;
      b.classList.remove("selectable");
    });
    layerIdx = L;
    nodeIdx = i;
    pathIdx[L] = i; // 通った道として記録（後戻り・横移動は不可能）
    routeMap[L][i].visited = true;
    currentNodeType = routeMap[L][i].type;
    floor = (stageNum - 1) * MAP_LAYERS + L + 1;
    bonusAtk += sumFx("floorAtk");
    bonusDef += sumFx("floorDef");
    bonusMaxHp += sumFx("floorMaxHp");
    const floorAll = sumFx("floorAll");
    if (floorAll) {
      bonusAtk += floorAll;
      bonusDef += floorAll;
      bonusMaxHp += floorAll;
    }
    recomputeMaxHp();
    shopStock = []; // 新しいマスではショップの在庫が変わる
    routeMapEl.classList.add("is-hidden");
    const t = currentNodeType;
    if (t === "shop") {
      battleMessage.textContent = "🛒 You found a shop!";
      showShop(false, true);
      updateBars();
      return;
    }
    if (t === "gacha") {
      battleMessage.textContent = "🎲 You found a gacha machine!";
      showGacha(null);
      updateBars();
      return;
    }
    if (t === "event") {
      showEvent();
      return;
    }
    // battle / elite / boss
    battleCard.classList.remove("is-hidden");
    beginFloorEnemies();
    nextBattleQuestion();
    battleMessage.textContent =
      t === "boss" ? "👹 Boss fight! Break the barrier and defeat it!" : t === "elite" ? "💠 An elite blocks your path!" : "⚔️ An enemy appears!";
    updateBars();
  }

  // ボス撃破 → ステージクリア。次のステージへ潜るか、勝利で終えるか選べる
  function onStageClear() {
    battleInput.disabled = true;
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    rewardTitle.textContent = `👑 Stage ${stageNum} clear!`;
    battleMessage.textContent = "🎉 You beat the boss! Go deeper, or finish in victory?";
    rewardGrid.innerHTML = "";
    renderStageResult(); // このステージで答えた問題の正誤リストを表示
    shopButton("⬇️", `Take on Stage ${stageNum + 1}`, "Enemies get stronger (gear & coins carry over)", false, () => {
      stageNum++;
      overkillStreak = 0;
      genMap();
      showMap(`⬇️ Entering Stage ${stageNum}! 🗺️ Choose your first node`);
    });
    shopButton("🏆", "Finish in victory", "See your results", false, () => onGameClear());
    updateBars();
  }

  // ステージ中に答えた問題を単語ごとにまとめて、正解/ミスのリザルトを表示する
  // （同じ単語は1行にまとめ、1回でもミスがあれば「Missed」に入れる）
  function renderStageResult() {
    if (!stageQuizLog.length) return;
    const seen = new Map();
    stageQuizLog.forEach((q) => {
      const e = seen.get(q.phrase) || { phrase: q.phrase, meaning: q.meaning, missed: false };
      if (!q.correct) e.missed = true;
      seen.set(q.phrase, e);
    });
    const items = [...seen.values()];
    const missed = items.filter((x) => x.missed);
    const ok = items.filter((x) => !x.missed);
    const row = (q) =>
      `<div class="result-row">` +
      `<span class="result-phrase">${escapeHtml(q.phrase)}</span>` +
      `<span class="result-meaning">${escapeHtml(q.meaning)}</span>` +
      `</div>`;
    const section = (cls, head, list) =>
      list.length
        ? `<div class="result-section ${cls}"><div class="result-head">${head}</div>${list.map(row).join("")}</div>`
        : "";
    const wrap = document.createElement("div");
    wrap.className = "result-list stage-result";
    wrap.innerHTML =
      section("ng", `❌ Missed (${missed.length})`, missed) +
      section("ok", `⭕ Correct (${ok.length})`, ok);
    rewardGrid.appendChild(wrap);
  }

  /* --- ❓ イベントマス（ランダムな選択イベント） --- */
  const EVENTS = [
    {
      name: "Spring of Healing",
      text: "✨ A clear spring bubbles up. What do you do?",
      choices: [
        { icon: "💧", name: "Drink the water", desc: "Fully restore HP", run: () => { playerHp = playerMaxHp; return "💧 HP fully restored!"; } },
        { icon: "🫗", name: "Bathe in its power", desc: "Max HP +20% (current HP unchanged)", run: () => { bonusMaxHp += Math.round(playerMaxHp * 0.2); recomputeMaxHp(); return "🫗 Max HP increased!"; } },
      ],
    },
    {
      name: "Mysterious Merchant",
      text: "🧙 \"Heh heh... I've got good stuff.\"",
      choices: [
        { icon: "💰", name: "Buy gear for 🪙300", desc: "Get a random legendary item", run: () => {
          if (coins < 300) return "Not enough 🪙... (300 needed)";
          coins -= 300;
          const cands = EQUIPMENT.filter((e) => e.rarity === "legendary");
          const tmpl = randomOf(cands);
          const info = rarityInfo("legendary");
          backpack.push({ slot: tmpl.slot, name: tmpl.name, desc: tmpl.desc, fx: tmpl.fx, rarity: "legendary", rarityName: info.name, color: info.color });
          updateCoinDisplay();
          return `✨ Got "${tmpl.name}"! 🎒 Added to backpack`;
        } },
        { icon: "🚶", name: "Leave", desc: "Do nothing", run: () => "🚶 You bid the merchant farewell" },
      ],
    },
    {
      name: "Game of Chance",
      text: "🎲 You're invited to a shady dice game. Bet your coins?",
      choices: [
        { icon: "🎲", name: "Bet it all", desc: "50% to double coins, 50% to halve them", run: () => {
          if (Math.random() < 0.5) { coins *= 2; updateCoinDisplay(); return "🎉 Jackpot! Coins doubled!"; }
          coins = Math.floor(coins / 2); updateCoinDisplay(); return "😱 You lost... coins halved";
        } },
        { icon: "🙅", name: "Don't bet", desc: "Do nothing", run: () => "🙅 You passed on the bet" },
      ],
    },
    {
      name: "Cursed Altar",
      text: "🗿 An eerie altar stands here. Offering blood grants power...",
      choices: [
        { icon: "🩸", name: "Offer blood", desc: "Lose 40% HP, attack x1.5 (rest of the run)", run: () => {
          playerHp = Math.max(1, playerHp - Math.round(playerHp * 0.4));
          atkStackMult = clampNum(atkStackMult * 1.5);
          return "🩸 You feel lighter... attack x1.5 gained!";
        } },
        { icon: "🚶", name: "Stay away", desc: "Do nothing", run: () => "🚶 You slip quietly past" },
      ],
    },
    {
      name: "Wandering Smith",
      text: "🔨 \"Want me to forge for you?\"",
      choices: [
        { icon: "⚔️", name: "Forge weapon", desc: "Attack +20% of current (permanent)", run: () => { bonusAtk = clampNum(bonusAtk + Math.round(effAttack() * 0.2)); return "⚔️ Attack increased!"; } },
        { icon: "🛡️", name: "Forge armor", desc: "Defense +30% of current + Max HP +10%", run: () => { bonusDef += Math.round(effDefense() * 0.3); bonusMaxHp += Math.round(playerMaxHp * 0.1); recomputeMaxHp(); return "🛡️ Your defense hardened!"; } },
      ],
    },
    {
      name: "Stat Fairy",
      text: "🧚 A fairy appears! \"I'll give you two rewards!\"",
      choices: [
        { icon: "🧚", name: "Thank you!", desc: "Pick perks (rewards) twice", runView: "perks" },
      ],
    },
  ];

  function showEvent() {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    const ev = randomOf(EVENTS);
    rewardTitle.textContent = `❓ Event: ${ev.name}`;
    battleMessage.textContent = ev.text;
    rewardGrid.innerHTML = "";
    ev.choices.forEach((c) => {
      shopButton(c.icon, c.name, c.desc, false, () => {
        if (c.runView === "perks") {
          bonusActive = true;
          perkPicksLeft = 2;
          showPerks();
          return;
        }
        const msg = c.run();
        updateBars();
        showMap(`${msg}　🗺️ Choose your next node`);
      });
    });
    updateBars();
  }

  function nextBattleQuestion() {
    // 同じ問題が2連続で出ないようにする（プールが2語以上あるとき）
    const prevPhrase = battleIdiom && battleIdiom.phrase;
    let next = randomOf(pool);
    if (pool.length > 1) {
      let guard = 0;
      while (next.phrase === prevPhrase && guard++ < 20) next = randomOf(pool);
    }
    battleIdiom = next;
    battleHint.textContent = `Hint: ${battleIdiom.meaning}`;
    battleSentence.textContent = makeBlank(battleIdiom.example, battleIdiom.phrase);
    battleInput.value = "";
    battleInput.disabled = false;
    battleInput.focus();
  }

  function updateBars() {
    enemyHpFill.style.width = Math.max(0, (enemyHp / enemyMaxHp) * 100) + "%";
    enemyHpText.textContent = `${Math.max(0, enemyHp)} / ${enemyMaxHp}`;
    playerHpFill.style.width = Math.max(0, (playerHp / playerMaxHp) * 100) + "%";
    playerHpText.textContent = `${formatNum(Math.max(0, playerHp))} / ${formatNum(playerMaxHp)}`;
    renderStats();
    updateBombButton();
    updateItemsButton();
    renderIntent();
  }

  // 今の自分のステータス（攻撃/防御/最大HP/会心）を表示
  function renderStats() {
    if (!playerStats) return;
    playerStats.innerHTML =
      `<span title="Attack">⚔️ ${formatNum(effAttack())}</span>` +
      `<span title="Defense">🛡️ ${formatNum(effDefense())}</span>` +
      `<span title="Max HP">❤️ ${formatNum(playerMaxHp)}</span>` +
      `<span title="Skill MP (+10 on correct answer)" style="color:#7dd3fc">🔮 ${playerMp}/${playerMaxMp}</span>` +
      `<span title="Crit rate">💥 ${Math.round(critTotal() * 100)}%</span>`;
    updateSkillButton();
    renderStatusRow();
    if (damageStats) {
      damageStats.innerHTML =
        `<span title="Damage dealt on your last attack">💢 Last ${formatNum(lastAttackDamage)}</span>` +
        `<span title="Highest damage so far">🏆 Best ${formatNum(maxAttackDamage)}</span>`;
    }
  }

  // ダメージ記録を更新する（直近ダメージ＋過去最高を保存）
  function recordDamage(d) {
    if (!(d > 0)) return;
    lastAttackDamage = d;
    if (d > maxAttackDamage) maxAttackDamage = d;
  }

  /* ===== 脳が溶ける演出（ジュース）レイヤー ===== */
  const fxLayer = document.createElement("div");
  fxLayer.id = "fx-layer";
  document.body.appendChild(fxLayer);

  // ダメージの大きさを 0〜7 のランクに変換（演出の強さに使う）
  function damageTier(d) {
    if (!(d > 0)) return 0;
    if (d < 1e3) return 1;
    if (d < 1e4) return 2;
    if (d < 1e6) return 3;
    if (d < 1e9) return 4;
    if (d < 1e12) return 5;
    if (d < 1e16) return 6;
    return 7; // 京以上＝脳が溶ける
  }
  const TIER_LABEL = {
    3: "GREAT!!", 4: "EXCELLENT!!", 5: "INSANE!!!", 6: "GODLIKE!!!", 7: "💥BRAIN MELT💥",
  };

  // 画面フラッシュ
  function screenFlash(kind, intensity) {
    const f = document.createElement("div");
    f.className = "fx-flash fx-flash-" + kind;
    f.style.setProperty("--a", Math.min(0.85, 0.25 + intensity * 0.1));
    fxLayer.appendChild(f);
    setTimeout(() => f.remove(), 360);
  }
  // 要素を震わせる
  function shakeEl(el, amp, dur) {
    if (!el) return;
    el.style.setProperty("--amp", amp + "px");
    el.style.setProperty("--shdur", (dur || 0.34) + "s");
    el.classList.remove("fx-shake");
    void el.offsetWidth;
    el.classList.add("fx-shake");
    setTimeout(() => el.classList.remove("fx-shake"), (dur || 0.34) * 1000 + 30);
  }
  function screenShake(intensity) {
    shakeEl(battleStage, Math.min(26, 3 + intensity * 3), 0.34);
    if (intensity >= 5) shakeEl(document.querySelector("main"), Math.min(14, intensity * 1.6), 0.4);
  }
  // 弾けるパーティクル
  function spawnBurst(count, opts) {
    if (!battleStage) return;
    opts = opts || {};
    const colors = opts.colors || ["#fbbf24", "#f87171", "#a78bfa", "#38bdf8", "#4ade80", "#fff"];
    const n = Math.min(44, count);
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "fx-particle";
      const ang = Math.random() * Math.PI * 2;
      const dist = (opts.dist || 60) + Math.random() * (opts.spread || 70);
      p.style.setProperty("--tx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--ty", Math.sin(ang) * dist + "px");
      p.style.setProperty("--sz", 4 + Math.random() * 7 + "px");
      p.style.setProperty("--dur", 0.5 + Math.random() * 0.5 + "s");
      p.style.background = colors[i % colors.length];
      p.style.color = colors[i % colors.length];
      p.style.left = (opts.x != null ? opts.x : 50) + "%";
      p.style.top = (opts.y != null ? opts.y : 64) + "px";
      battleStage.appendChild(p);
      setTimeout(() => p.remove(), 1050);
    }
  }
  // 衝撃波リング
  function spawnShockwave() {
    if (!battleStage) return;
    const w = document.createElement("div");
    w.className = "fx-shockwave";
    battleStage.appendChild(w);
    setTimeout(() => w.remove(), 700);
  }
  // コインの雨
  function spawnCoinShower(n) {
    if (!battleStage) return;
    for (let i = 0; i < Math.min(18, n); i++) {
      const c = document.createElement("div");
      c.className = "fx-coin";
      c.textContent = "🪙";
      c.style.left = 15 + Math.random() * 70 + "%";
      c.style.setProperty("--delay", Math.random() * 0.25 + "s");
      c.style.setProperty("--dur", 0.7 + Math.random() * 0.5 + "s");
      battleStage.appendChild(c);
      setTimeout(() => c.remove(), 1500);
    }
  }
  // ランクの大きな掛け声
  function rankBanner(tier) {
    const label = TIER_LABEL[tier];
    if (!label) return;
    const b = document.createElement("div");
    b.className = "fx-rank fx-rank-" + tier;
    b.textContent = label;
    fxLayer.appendChild(b);
    setTimeout(() => b.remove(), 950);
  }
  // 攻撃ヒット時の総合演出
  function juiceHit(crit, dealt) {
    const tier = damageTier(dealt);
    if (typeof Music !== "undefined") Music.hit(tier, crit); // 脳が溶ける打撃音
    screenShake(crit ? tier + 1 : tier);
    if (crit || tier >= 3) screenFlash(tier >= 6 ? "rainbow" : crit ? "crit" : "hit", tier);
    spawnBurst(tier * 4 + (crit ? 8 : 2), {
      colors: tier >= 6 ? ["#ff00ff", "#00ffff", "#ffff00", "#ffffff", "#f87171"] : undefined,
    });
    if (tier > peakTier && tier >= 3) {
      peakTier = tier;
      rankBanner(tier);
    }
  }

  // 与えたダメージ数を敵の上にポップ表示する
  function showDamage(amount, crit) {
    if (!battleStage) return;
    const isNum = typeof amount === "number";
    const tier = isNum ? Math.max(1, damageTier(amount)) : 1;
    const el = document.createElement("div");
    el.className = `dmg-float dtier-${tier}` + (crit ? " crit" : "");
    el.textContent = isNum ? formatNum(amount) : amount;
    el.style.left = `calc(50% + ${Math.round(Math.random() * 44 - 22)}px)`;
    el.style.setProperty("--rot", Math.round(Math.random() * 14 - 7) + "deg");
    battleStage.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // 攻撃時に敵を揺らす
  function shakeEnemy() {
    enemyEmoji.classList.remove("shake");
    void enemyEmoji.offsetWidth; // リフローしてアニメを再起動
    enemyEmoji.classList.add("shake");
    enemyEmoji.addEventListener("animationend", () => enemyEmoji.classList.remove("shake"), {
      once: true,
    });
  }

  // 所持コインの表示（敵ステージ左上）
  function updateCoinDisplay() {
    if (coinBadge) coinBadge.textContent = `🪙 ${coins.toLocaleString("en-US")}`;
  }

  // コンボ（連続正解数）の表示。1以上で敵の右上に出す。
  function updateComboDisplay() {
    if (combo >= 1) {
      comboBadge.classList.remove("is-hidden");
      comboBadge.textContent = `🔥 ${combo} Combo`;
      comboBadge.classList.remove("fx-combo-pop");
      void comboBadge.offsetWidth;
      comboBadge.classList.add("fx-combo-pop");
    } else {
      comboBadge.classList.add("is-hidden");
    }
  }

  battleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (battleInput.disabled) return;
    const phrase = battleIdiom.phrase;
    if (!tickPlayerStatuses()) return; // 状態異常の進行（毒・炎上・死の呪いなど）
    const correct = matchesIdiom(battleInput.value, battleIdiom);
    stageQuizLog.push({ phrase, meaning: battleIdiom.meaning, correct }); // ステージのリザルト用に記録
    if (correct) {
      attackEnemy(phrase);
    } else {
      enemyAttack(phrase);
    }
  });

  // 正解 → 敵を攻撃
  function attackEnemy(phrase) {
    combo++; // 連続正解でコンボが伸びる
    updateComboDisplay();
    const comboMult = Math.pow(1.1, combo); // 1コンボごと×1.1
    playerMp = Math.min(playerMaxMp, playerMp + 10); // 正解でMPが少し回復

    // 気絶していると攻撃が不発になる
    if (playerStatus.stun > 0) {
      delete playerStatus.stun;
      renderStatusRow();
      battleMessage.textContent = `💫 Stunned — couldn't attack…! (Your answer was correct)`;
      const alive = enemyActs ? executeIntent() : true;
      updateBars();
      if (alive) nextBattleQuestion();
      return;
    }

    // ミシック：毎ターン攻撃倍率を乗算で増やす
    if (hasFx("atkMultPerTurn")) atkStackMult = clampNum(atkStackMult * Math.max(1, sumFx("atkMultPerTurn")));
    // ミシック：毎ターン最大HPの割合を回復
    const turnHeal = sumFx("turnHealPct");
    if (turnHeal) playerHp = Math.min(playerMaxHp, playerHp + Math.round(playerMaxHp * turnHeal));

    // 酸（アシッドボトル）：毎ターン固定ダメージ
    if (enemyAcid > 0 && enemyBarrier <= 0) {
      const acidDmg = Math.round(enemyMaxHp * 0.08);
      enemyHp = clampNum(enemyHp - acidDmg);
      showDamage(acidDmg, false);
    }

    // 敵の回避：すばやい敵は攻撃をかわす（魔法職は必中。SPDで回避をすり抜けやすくなる）
    const missP = playerChar.magic
      ? 0
      : Math.max(0, (currentEnemy.dodge || 0) - (playerChar.spd || 0) * 0.02);
    if (enemyBarrier <= 0 && missP > 0 && Math.random() < missP) {
      combo = 0;
      updateComboDisplay();
      battleMessage.textContent = `💨 ${currentEnemy.name} dodged your attack!`;
      // ヘビ：ミスに即カウンター
      let alive = true;
      if (currentEnemy.id === "hebi") {
        battleMessage.textContent += "";
        alive = applyEnemyHit(1, "🐍Counter");
      }
      if (alive && enemyActs) alive = executeIntent();
      updateBars();
      if (alive) nextBattleQuestion();
      return;
    }

    // バリアがある間はHPに届かない（正解攻撃は必ず最低1枚は破壊できる）
    if (enemyBarrier > 0) {
      // 構えの枚数だけ破壊。呪い中でも「壊せない(0)」にはせず、最低1枚は必ず削る
      let breakN = STANCES[stance].break;
      if (curseNext) {
        breakN = Math.max(1, breakN - 1); // 呪いは効きを弱めるだけ（0にはしない）
        curseNext = false;
      }
      const before = enemyBarrier;
      enemyBarrier = Math.max(0, enemyBarrier - breakN);
      const broke = before - enemyBarrier;
      battleMessage.textContent =
        enemyBarrier > 0
          ? `⚔️ "${phrase}" destroyed ${broke} barrier(s)! (${enemyBarrier} left)`
          : `💥 "${phrase}" destroyed all barriers! Now your attacks land!`;
      if (typeof Music !== "undefined") Music.hit(2, enemyBarrier === 0);
      screenShake(enemyBarrier === 0 ? 5 : 2);
      spawnBurst(enemyBarrier === 0 ? 24 : 10, { colors: ["#93c5fd", "#e0f2fe", "#38bdf8"] });
      shakeEnemy();
      const alive = executeIntent(); // 敵のターン
      renderIntent();
      updateBars();
      if (alive) nextBattleQuestion();
      return;
    }

    // 基礎攻撃 × 各種倍率（加算式＋乗算式）
    let hit = (randInt(16, 24) + effAttack()) * attackMultiplier() * comboMult * atkStackMult;
    hit *= STANCES[stance].deal; // 構えの倍率
    if (curseNext) {
      hit *= 0.5;
      curseNext = false;
    }
    if (enemyIsBoss && hasFx("bossMult")) hit *= Math.max(1, sumFx("bossMult"));
    if (floor >= MAX_FLOOR && hasFx("floor100Mult")) hit *= Math.max(1, sumFx("floor100Mult"));
    if (hasFx("critAsAtkMult")) hit *= Math.max(1, critTotal() * 100); // 会心率%を倍率に
    if (hasFx("noHitStreakMult") && noHitStreak > 0) hit *= Math.pow(sumFx("noHitStreakMult"), noHitStreak);
    if (playerHp <= 1 && hasFx("hp1Mult")) hit *= Math.max(1, sumFx("hp1Mult"));
    if (hasFx("allCountMultEach")) hit *= Math.max(1, equippedItems().length * sumFx("allCountMultEach"));
    if (hasFx("defAsDamageMult")) hit *= Math.max(1, effDefense());
    // ミシック：毎ターン3〜30倍などランダム倍率（混沌の脚衣）
    const trm = condList("turnRandomMult")[0];
    if (trm) hit *= randInt(trm.lo, trm.hi);
    // 割合ダメージ（最大HP/現在HP）
    hit += enemyMaxHp * sumFx("enemyMaxHpPct");
    hit += enemyHp * sumFx("enemyCurHpPct");
    // 敵の防御特性（魔法職と酸は無視できる）
    let guardNote = "";
    if (!playerChar.magic && enemyAcid <= 0) {
      if (currentEnemy.physCut) hit *= 1 - currentEnemy.physCut; // サソリ・おにの硬い装甲
      if (currentEnemy.id === "oni" && Math.random() < 0.4) {
        hit *= 0.5;
        guardNote = "👹Club Guard! ";
      }
    }
    // 束縛：与ダメージ-30%
    if (playerStatus.bind > 0) hit *= 0.7;
    hit = clampNum(hit);

    const crit = Math.random() < critTotal();
    if (crit) hit = clampNum(hit * critMultiplier());
    hit = Math.round(hit);

    // ⚖️ 自動バランス調整：オーバーキルが続きすぎたら少し弱体化する
    // （マップ終盤＝ボス直前の4マスでは解除＝「無双」を許容する）
    const lateGame = layerIdx >= MAP_LAYERS - 4;
    let nerfed = false;
    if (!lateGame && overkillStreak >= 3) {
      const nf = Math.max(0.15, 1 / (1 + 0.3 * (overkillStreak - 2)));
      hit = Math.round(hit * nf);
      nerfed = true;
    }
    hit = Math.max(1, hit); // どんなに軽減されても正解攻撃は必ず1以上通る

    let hits = hasFx("extraHit") ? 2 : 1;
    if (hasFx("extraHitChance") && Math.random() < sumFx("extraHitChance")) hits += 1;
    hits += sumFx("extraHits") + bonusHits; // ミシック：追加攻撃回数（神速の靴など）
    hits = Math.max(hits, maxFx("hitCount")); // 宮本武蔵の木刀：固定の多段攻撃

    let dealt = 0;
    let note = "";
    const ikChance = sumFx("instakill") + (playerChar.instakill || 0);
    if (ikChance > 0 && Math.random() < ikChance) {
      enemyHp = 0;
      note = "⚡Instakill! ";
    } else {
      for (let h = 0; h < hits; h++) {
        enemyHp -= hit;
        dealt = clampNum(dealt + hit);
      }
      const execTh = maxFx("execute");
      if (execTh > 0 && enemyHp > 0 && enemyHp <= enemyMaxHp * execTh) {
        enemyHp = 0;
        note = "☠️Execute! ";
      }
    }
    // ミシック：オーバーキル分を次の敵へ持ち越す（アポカリオン）
    if (hasFx("overkillCarry") && enemyHp < 0 && enemiesRemaining > 1) {
      splashDamage = clampNum(splashDamage + Math.round(-enemyHp * sumFx("overkillCarry")));
    }
    // 累積・永久加算系
    if (dealt > 0) {
      totalDamageDealt = clampNum(totalDamageDealt + dealt);
      const dToAtk = sumFx("damageToAtkPct");
      if (dToAtk > 0) causalAtk = clampNum(causalAtk + Math.floor(dealt * dToAtk)); // 因果律の剣（外すと無効）
      if (hasFx("bombStorePct")) bombStore = clampNum(bombStore + Math.round(dealt * sumFx("bombStorePct"))); // 火薬の使い手
    }
    const emEach = sumFx("enemyMaxHpToAtkEach");
    if (emEach) bonusAtk = clampNum(bonusAtk + Math.round(enemyMaxHp * emEach));
    const mhEach = sumFx("maxHpToAtkEach");
    if (mhEach) bonusAtk = clampNum(bonusAtk + Math.round(playerMaxHp * mhEach));
    const stk = sumFx("atkStackPerAttack");
    if (stk) atkStackMult = clampNum(atkStackMult * (1 + stk));
    if (enemyIsBoss) {
      const bstk = sumFx("atkStackPerBossHit");
      if (bstk) atkStackMult = clampNum(atkStackMult * (1 + bstk));
    }
    noHitStreak++;
    tempAtkBuffPct = 0; // 一時バフを消費
    if (lifesteal > 0) playerHp = Math.min(playerMaxHp, playerHp + lifesteal);
    // この階に後ろの敵がいれば、与ダメージの30%を範囲ダメージとして蓄積
    if (enemiesRemaining > 1 && dealt > 0) {
      splashDamage = clampNum(splashDamage + Math.round(dealt * (0.3 + sumFx("splashBonusPct"))));
    }
    recordDamage(dealt); // 直近ダメージ・最大ダメージを記録
    // オーバーキル連続回数を更新（自動バランス調整用）
    if (dealt > enemyMaxHp * 25) overkillStreak++;
    else overkillStreak = Math.max(0, overkillStreak - 1);

    const flair =
      (combo >= 2 ? `🔥${combo} Combo ` : "") +
      (crit ? "💥Crit! " : "") +
      (hits > 1 ? `${hits} hits! ` : "") +
      guardNote +
      (playerStatus.bind > 0 ? "🕸️Bound " : "") +
      (nerfed ? "⚖️ " : "");
    battleMessage.textContent = note
      ? `${note}"${phrase}" defeated the enemy!`
      : `⚔️ ${flair}"${phrase}" deals ${formatNum(dealt)} damage!`;
    if (enemyAcid > 0) enemyAcid--; // 酸の残りターンを消費
    updateBars();
    shakeEnemy();
    showDamage(dealt > 0 ? dealt : "⚡", crit);
    juiceHit(crit, dealt);
    if (enemyHp <= 0) {
      handleEnemyKilled(playerChar.id === "wizard" || playerChar.id === "cleric"); // 炎/聖の魔法職ならゾンビを焼却
    } else {
      // ボス・エリートは生きていれば毎ターン反撃してくる
      const alive = enemyActs ? executeIntent() : true;
      updateBars();
      if (alive) nextBattleQuestion();
    }
  }

  // 不正解 → 敵の反撃
  function enemyAttack(phrase) {
    wrongCount++;
    combo = 0; // 間違えるとコンボはリセット
    updateComboDisplay();
    battleMessage.textContent = `❌ The answer was "${phrase}".`;
    // ボス・エリートは予告していた行動を実行、通常敵はふつうの反撃
    const alive = enemyActs ? executeIntent() : applyEnemyHit(1, `${currentEnemy.name}'s counter`);
    renderIntent();
    updateBars();
    if (!alive) return; // ゲームオーバー
    if (enemyHp <= 0) {
      onEnemyDefeated(); // 反射ダメージで倒した
      return;
    }
    nextBattleQuestion();
  }

  function onEnemyDefeated(chained) {
    defeated++;
    // 魔王を倒すと死の呪いが解ける
    if (currentEnemy.id === "maou" && "doom" in playerStatus) {
      delete playerStatus.doom;
      battleMessage.textContent += " 💀→✨ The death curse is broken!";
      renderStatusRow();
    }
    // ねずみ：倒しても仲間が乱入してくることがある（1つの階で最大2回）
    if (currentEnemy.id === "nezumi" && swarmAdds < 2 && Math.random() < 0.4) {
      enemiesRemaining++;
      swarmAdds++;
      battleMessage.textContent += " 🐀 Another rat joins the fight!";
    }
    // ミシック：撃破ごとに攻撃倍率を乗算で増やす／追加攻撃回数を増やす
    if (hasFx("atkMultPerKill")) atkStackMult = clampNum(atkStackMult * Math.max(1, sumFx("atkMultPerKill")));
    bonusHits += sumFx("killExtraHit");
    // 撃破時の効果
    bonusAtk += sumFx("killAtk");
    bonusDef += sumFx("killDef");
    bonusMaxHp += sumFx("killMaxHp");
    const killAll = sumFx("killAll");
    if (killAll) {
      bonusAtk += killAll;
      bonusDef += killAll;
      bonusMaxHp += killAll;
    }
    const killMaxHpPct = sumFx("killMaxHpPct");
    if (killMaxHpPct) bonusMaxHp += Math.round(playerMaxHp * killMaxHpPct);
    recomputeMaxHp();
    let heal = sumFx("killHeal");
    const healPct = sumFx("killHealPct") + (playerChar.killHealPct || 0);
    if (healPct) heal += Math.round(playerMaxHp * healPct);
    if (hasFx("killHealEnemyMaxHp")) heal = clampNum(heal + enemyMaxHp); // 血月の剣：撃破した敵のHPを丸ごと回復
    if (heal) playerHp = Math.min(playerMaxHp, playerHp + heal);

    // コインをランダム入手（階が上がるほど増える。エリート・ボスはボーナス）
    let coinGain = randInt(25, 50) + Math.floor(floor * 10);
    if (enemyElite) coinGain = Math.round(coinGain * enemyElite.coinMult);
    else if (enemyIsBoss) coinGain = Math.round(coinGain * 3);
    coinGain = Math.round(coinGain * (playerChar.coinMult || 1) * (1 + relicFx("coinBoost"))); // キャラ＆お守りのコイン補正
    coins += coinGain;
    updateCoinDisplay();

    const beatenName = currentEnemy.name;
    battleInput.disabled = true;
    if (!chained) playDefeatAnim(); // 撃破演出（連鎖中は省略して軽く）
    enemiesRemaining--;

    // 演出を見せてから次へ（連鎖撃破中は短く）
    setTimeout(() => {
      if (enemiesRemaining > 0) {
        // 同じ階にまだ敵がいる
        spawnEnemy();
        // 後ろの敵に蓄積した範囲ダメージを適用（余りは次の敵へ持ち越して連鎖）
        let splashNote = "";
        if (splashDamage > 0 && enemyBarrier > 0) {
          splashDamage = 0; // バリアが範囲ダメージを吸収する
          splashNote = " 🛡️The barrier blocked the splash damage!";
        }
        if (splashDamage > 0) {
          const before = enemyHp;
          const applied = Math.min(before, splashDamage);
          if (applied > 0) showDamage(clampNum(applied), false);
          if (splashDamage >= before) {
            // 範囲ダメージで撃破 → オーバーキル分を次の敵へ持ち越して連鎖
            splashDamage = clampNum(splashDamage - before);
            enemyHp = 0;
            battleMessage.textContent = `🌪️ Splash damage also defeats ${currentEnemy.name}! (${enemiesRemaining - 1} left)`;
            updateBars();
            onEnemyDefeated(true);
            return;
          }
          enemyHp = clampNum(enemyHp - splashDamage);
          splashDamage = 0;
          splashNote = ` 🌪️Splash damage ${formatNum(applied)}!`;
        }
        battleMessage.textContent =
          `🗡️ Defeated ${beatenName}! Next enemy (${enemiesRemaining} left)${splashNote}`;
        updateBars();
        nextBattleQuestion();
        return;
      }
      // マスをクリア → ボスならステージクリア、それ以外はごほうび→マップへ
      if (currentNodeType === "boss") {
        onStageClear();
      } else {
        // ランダムで「ステータスの妖精」が出ると2回選べる
        bonusActive = Math.random() < 0.15;
        perkPicksLeft = bonusActive ? 2 : 1;
        showPerks(beatenName);
      }
    }, chained ? 70 : 480);
  }

  // 撃破演出：敵がはじけて消える＋💥
  function playDefeatAnim() {
    enemyEmoji.classList.remove("shake");
    void enemyEmoji.offsetWidth; // リフローでアニメ再起動
    enemyEmoji.classList.add("defeated");
    if (typeof Music !== "undefined") Music.kill(); // 撃破SE（脳が溶ける大爆発音）
    // 撃破の大爆発：閃光＋衝撃波＋粉砕パーティクル＋コインの雨＋画面シェイク
    screenFlash("kill", 7);
    screenShake(6);
    spawnShockwave();
    spawnBurst(36, { dist: 50, spread: 130, colors: ["#fbbf24", "#ffffff", "#f87171", "#fb923c", "#fde68a"] });
    spawnCoinShower(14);
    if (battleStage) {
      const burst = document.createElement("div");
      burst.className = "defeat-burst";
      burst.textContent = "💥";
      battleStage.appendChild(burst);
      setTimeout(() => burst.remove(), 600);
    }
  }

  /* --- 撃破後その1：パーク3択（妖精が出ると2回選べる）--- */
  function showPerks(beatenName) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    if (bonusActive) {
      battleMessage.textContent = `🧚 A stat fairy appeared! You get ${perkPicksLeft} picks!`;
      rewardTitle.textContent = `🧚 Fairy's reward (${perkPicksLeft} left)`;
    } else {
      battleMessage.textContent = `🎉 ${beatenName ? "Defeated " + beatenName + "! " : ""}Choose a reward`;
      rewardTitle.textContent = "🎁 Choose a reward";
    }
    const choices = PERKS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    rewardGrid.innerHTML = "";
    choices.forEach((perk) => {
      const btn = document.createElement("button");
      btn.className = "reward-card";
      btn.innerHTML =
        `<span class="reward-icon">${perk.icon}</span>` +
        `<span class="reward-name">${perk.name}</span>` +
        `<span class="reward-desc">${perk.desc}</span>`;
      btn.addEventListener("click", () => choosePerk(perk));
      rewardGrid.appendChild(btn);
    });
    updateBars();
  }

  function choosePerk(perk) {
    perk.apply();
    recomputeMaxHp();
    perkPicksLeft--;
    if (perkPicksLeft > 0) {
      showPerks(); // 妖精のおかげでもう一度選べる
    } else {
      bonusActive = false;
      advanceFloor(`${perk.icon} Gained ${perk.name}!`);
    }
  }

  /* --- 撃破後その2：宝箱（装備3択） --- */
  function rollRarityIndex() {
    const f = floor;
    const weights = [
      Math.max(1, 60 - f), // コモン
      35, // アンコモン
      8 + f * 0.5, // レア
      2 + f * 0.4, // エピック
      Math.max(0, f * 0.2 - 1), // レジェンダリー
    ];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return 0;
  }

  function makeItem() {
    const rarity = RARITIES[rollRarityIndex()];
    const candidates = EQUIPMENT.filter((e) => e.rarity === rarity.id);
    const tmpl = randomOf(candidates);
    return {
      slot: tmpl.slot,
      name: tmpl.name,
      desc: tmpl.desc,
      fx: tmpl.fx,
      rarity: rarity.id,
      rarityName: rarity.name,
      color: rarity.color,
    };
  }

  function showTreasure(beatenName) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    battleMessage.textContent = `🎁 Defeated ${beatenName}! You found a treasure chest!`;
    rewardTitle.textContent = "🎁 Treasure! Choose one piece of gear";
    const items = [makeItem(), makeItem(), makeItem()];
    rewardGrid.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "reward-card";
      btn.style.borderColor = item.color;
      btn.innerHTML =
        `<span class="reward-icon">${SLOT_META[item.slot].icon}</span>` +
        `<span class="reward-name" style="color:${item.color}">${item.name}</span>` +
        `<span class="reward-desc">【${item.rarityName}】${item.desc}</span>`;
      btn.addEventListener("click", () => chooseEquip(item));
      rewardGrid.appendChild(btn);
    });
    updateBars();
  }

  // 装備する。すでに着けていた装備はリュックに保管する（消滅させない）。
  function equipItem(item) {
    // ミシックは同時に1つだけ。別スロットのミシックは外してリュックへ戻す
    if (item.rarity === "mythic") {
      for (const s of SLOTS) {
        const cur = equipment[s.id];
        if (s.id !== item.slot && cur && cur.rarity === "mythic") {
          equipment[s.id] = null;
          backpack.push(cur);
        }
      }
    }
    const old = equipment[item.slot];
    if (old) {
      // 破軍の剣などを外したら、削ったHPと付与した攻撃を元に戻す
      if (old._sacBonus) {
        bonusAtk = Math.max(0, bonusAtk - old._sacBonus);
        if (old._sacHp) playerHp = Math.min(playerMaxHp || Infinity, playerHp + old._sacHp);
        old._sacBonus = 0;
        old._sacHp = 0;
      }
      backpack.push(old);
    }
    equipment[item.slot] = item;
    // ダメージ無効回数を付与（神核装甲など）
    if (item.fx && item.fx.immuneHits) immuneLeft += item.fx.immuneHits;
    // 破軍の剣：HPを99%削り、失った分の倍率を攻撃力に変換
    if (item.fx && item.fx.hpSacrificeToAtk && playerHp > 1) {
      const lost = playerHp - Math.max(1, Math.round(playerHp * 0.01));
      if (lost > 0) {
        playerHp -= lost;
        item._sacHp = lost;
        item._sacBonus = clampNum(lost * item.fx.hpSacrificeToAtk);
        bonusAtk = clampNum(bonusAtk + item._sacBonus);
      }
    }
    recomputeMaxHp();
    renderEquipPanel();
    updateBombButton();
  }

  function chooseEquip(item) {
    equipItem(item);
    advanceFloor(`Equipped ${item.name}!`);
  }

  /* --- リュック（外した装備の保管＆付け替え）--- */
  function showBackpack(returnToBattle) {
    shopReturnsToBattle = !!returnToBattle;
    backpackFilter = "all"; // 開くたびに「全部」表示にもどす
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    renderBackpack();
  }

  // リュック上部の「振り分け」タブ（スロット別フィルタ）
  function renderBackpackFilter() {
    const bar = document.createElement("div");
    bar.className = "backpack-filter";
    const tabs = [{ id: "all", icon: "📦", name: "All" }].concat(
      SLOTS.map((s) => ({ id: s.id, icon: s.icon, name: s.name })),
    );
    tabs.forEach((t) => {
      const count = t.id === "all" ? backpack.length : backpack.filter((it) => it.slot === t.id).length;
      const b = document.createElement("button");
      b.className = "bp-tab" + (backpackFilter === t.id ? " active" : "");
      b.innerHTML = `${t.icon} ${t.name}<span class="bp-count">${count}</span>`;
      b.addEventListener("click", () => {
        backpackFilter = t.id;
        renderBackpack();
      });
      bar.appendChild(b);
    });
    rewardGrid.appendChild(bar);
  }

  function renderBackpack() {
    rewardTitle.textContent = `🎒 Backpack (${backpack.length} stored)`;
    battleMessage.textContent = "Tap equipped gear to remove it / tap a backpack item to swap it in";
    rewardGrid.innerHTML = "";

    // 振り分け（スロット別フィルタ）
    renderBackpackFilter();

    // 装備中（タップで外せる）
    const equippedNow = SLOTS.filter((s) => equipment[s.id]);
    if (equippedNow.length) {
      shopSection("🧷 Equipped (tap to remove)");
      equippedNow.forEach((s) => {
        const it = equipment[s.id];
        shopButton(s.icon, it.name, `[${it.rarityName}] Tap to remove`, false, () => unequip(s.id), it.color);
      });
    }

    // リュックの中身：スロットごと → レア度の高い順に並べる
    if (backpack.length === 0) {
      shopSection("Your backpack is empty");
    } else {
      let shown = 0;
      SLOTS.forEach((slot) => {
        if (backpackFilter !== "all" && backpackFilter !== slot.id) return;
        const inSlot = backpack
          .map((item, idx) => ({ item, idx }))
          .filter((x) => x.item.slot === slot.id)
          .sort((a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity));
        if (!inSlot.length) return;
        shown += inSlot.length;
        shopSection(`${slot.icon} ${slot.name} (${inSlot.length})`);
        inSlot.forEach(({ item, idx }) => {
          shopButton(
            SLOT_META[item.slot].icon,
            item.name,
            `[${item.rarityName}] ${item.desc}`,
            false,
            () => equipFromBackpack(idx),
            item.color,
          );
        });
      });
      if (shown === 0) shopSection("No gear of this type");
    }

    if (shopReturnsToBattle) {
      shopButton("⚔️", "Back to battle", "Close the backpack", false, () => resumeFromShop());
    } else {
      shopButton("➡️", "Back to map", "Close the backpack", false, () => advanceFloor("Closed the backpack!"));
    }
    updateBars();
  }

  function equipFromBackpack(i) {
    const item = backpack[i];
    if (!item) return;
    backpack.splice(i, 1); // リュックから取り出す
    equipItem(item); // 今着けている装備はリュックへ（消えない）
    renderBackpack();
  }

  // 装備を外してリュックへ戻す
  function unequip(slotId) {
    const it = equipment[slotId];
    if (!it) return;
    // 破軍の剣など：外したらHPと付与した攻撃を元に戻す
    if (it._sacBonus) {
      bonusAtk = Math.max(0, bonusAtk - it._sacBonus);
      if (it._sacHp) playerHp = Math.min(playerMaxHp || Infinity, playerHp + it._sacHp);
      it._sacBonus = 0;
      it._sacHp = 0;
    }
    equipment[slotId] = null;
    backpack.push(it);
    recomputeMaxHp();
    renderEquipPanel();
    updateBombButton();
    renderBackpack();
  }

  /* --- 5階チェックポイント：武器（装備）かショップを選ぶ --- */
  /* --- 武器ガチャ（5階ごと。1回200ゴールド、レア以上の武器のみ） --- */
  const GACHA_COST = 200;
  function rarityInfo(id) {
    return RARITIES.find((r) => r.id === id) || { name: id, color: "#94a3b8" };
  }
  // 排出確率：レア55% / エピック30% / レジェンダリー10% / ミシック5%
  function rollGachaRarity() {
    const r = Math.random();
    if (r < 0.55) return "rare";
    if (r < 0.85) return "epic";
    if (r < 0.95) return "legendary";
    return "mythic";
  }

  function showGacha(beatenName) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    battleMessage.textContent = beatenName ? `🎉 Defeated ${beatenName}! Try the gear gacha` : "🎲 Try the gear gacha!";
    renderGacha(null);
  }

  const GACHA_MAX_PULLS = 100; // 「最大」で一度に引ける上限
  function renderGacha(results) {
    rewardTitle.textContent = `🎰 Gear Gacha　🪙 ${formatNum(coins)}`;
    rewardGrid.innerHTML = "";

    if (results && results.length) {
      // 複数連は結果サマリー（レア度別の個数）
      if (results.length > 1) {
        const counts = {};
        results.forEach((it) => (counts[it.rarity] = (counts[it.rarity] || 0) + 1));
        const summary = ["mythic", "legendary", "epic", "rare"]
          .filter((r) => counts[r])
          .map((r) => `<span style="color:${rarityInfo(r).color}">${rarityInfo(r).name}×${counts[r]}</span>`)
          .join("　");
        const s = document.createElement("div");
        s.className = "gacha-summary";
        s.innerHTML = `${results.length}-pull result: ${summary}`;
        rewardGrid.appendChild(s);
      }
      // レア度の高い順にカード表示
      results
        .slice()
        .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))
        .forEach((result) => {
          const card = document.createElement("div");
          card.className = "reward-card gacha-result rank-" + rarityRank(result.rarity);
          card.style.borderColor = result.color;
          card.innerHTML =
            `<span class="reward-icon">${SLOT_META[result.slot].icon}</span>` +
            `<span class="reward-name" style="color:${result.color}">${result.name}</span>` +
            `<span class="reward-desc">[${result.rarityName}] ${result.desc}</span>`;
          rewardGrid.appendChild(card);
        });
    }

    // コインに応じて引く回数を選べる
    shopSection(`🎰 How many pulls? (1 pull 🪙${GACHA_COST})`);
    shopButton("🎰", "Pull once", `🪙${GACHA_COST}`, coins < GACHA_COST, () => pullGachaMany(1));
    shopButton("🔟", "Pull 10 times", `🪙${formatNum(GACHA_COST * 10)}`, coins < GACHA_COST * 10, () => pullGachaMany(10));
    const maxN = Math.min(GACHA_MAX_PULLS, Math.floor(coins / GACHA_COST));
    if (maxN >= 1) {
      shopButton("💎", `Pull max ${maxN} times`, `🪙${formatNum(GACHA_COST * maxN)}`, false, () => pullGachaMany(maxN));
    }
    shopButton("➡️", "Back to map", "Leave the gacha", false, () => advanceFloor("Gacha finished!"));
    updateBars();
  }

  // 指定レア度の装備を1つ作る
  function makeGachaItem(rarity) {
    // 全スロットから抽選（剣だけに偏らないように）
    const candidates = EQUIPMENT.filter((e) => e.rarity === rarity);
    const tmpl = randomOf(candidates);
    const info = rarityInfo(rarity);
    return {
      slot: tmpl.slot,
      name: tmpl.name,
      desc: tmpl.desc,
      fx: tmpl.fx,
      rarity,
      rarityName: info.name,
      color: info.color,
    };
  }

  // 複数回まとめて引く（演出 → 結果表示）
  function pullGachaMany(count) {
    const total = GACHA_COST * count;
    if (count < 1 || coins < total) return;
    coins -= total;
    const results = [];
    for (let k = 0; k < count; k++) results.push(makeGachaItem(rollGachaRarity()));
    results.forEach((it) => backpack.push(it)); // 自動装備せずリュックへ
    updateCoinDisplay();
    rewardGrid.innerHTML = "";
    battleMessage.textContent = "🎰 Rolling the gacha…";
    playGachaReveal(results, () => {
      const best = results.reduce((a, b) => (rarityRank(b.rarity) > rarityRank(a.rarity) ? b : a), results[0]);
      const r = rarityRank(best.rarity);
      const flair = r >= 5 ? "🌟Mythic🌟" : r === 4 ? "✨Legendary✨" : r === 3 ? "💜Epic" : "🎉";
      battleMessage.textContent =
        count > 1 ? `${flair} ${count}-pull gacha! 🎒 Added to your backpack` : `${flair} Got "${best.name}"! 🎒 To your backpack`;
      renderGacha(results);
    });
  }

  // ガチャ抽選アニメ：溜め → 弾けて称号 → 結果
  function playGachaReveal(results, done) {
    const best = results.reduce((a, b) => (rarityRank(b.rarity) > rarityRank(a.rarity) ? b : a), results[0]);
    const rank = rarityRank(best.rarity);
    const col = rarityInfo(best.rarity).color;
    const wrap = document.createElement("div");
    wrap.className = "gacha-anim";
    wrap.style.setProperty("--gc", col);
    wrap.innerHTML = `<div class="gacha-orb">🎰</div>`;
    fxLayer.appendChild(wrap);
    const buildMs = rank >= 4 ? 1400 : 800; // 高レアほど溜める
    if (typeof Music !== "undefined") Music.gacha(rank, buildMs); // ガチャ抽選音
    setTimeout(() => {
      wrap.classList.add("burst");
      screenFlash(rank >= 5 ? "rainbow" : "kill", 7);
      screenShake(6);
      // 中央でパーティクル爆散
      for (let i = 0; i < 46; i++) {
        const p = document.createElement("div");
        p.className = "fx-particle";
        const ang = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 130;
        p.style.setProperty("--tx", Math.cos(ang) * dist + "px");
        p.style.setProperty("--ty", Math.sin(ang) * dist + "px");
        p.style.setProperty("--sz", 5 + Math.random() * 8 + "px");
        p.style.setProperty("--dur", 0.6 + Math.random() * 0.5 + "s");
        const c = rank >= 5 ? ["#ff00ff", "#00ffff", "#ffff00", "#ffffff"][i % 4] : col;
        p.style.background = c;
        p.style.color = c;
        p.style.left = "50%";
        p.style.top = "44%";
        wrap.appendChild(p);
      }
      // 称号バナー
      const banner = document.createElement("div");
      banner.className = "gacha-banner" + (rank >= 5 ? " mythic" : "");
      if (rank < 5) banner.style.color = col;
      banner.textContent =
        rank >= 5 ? "🌟 MYTHIC DESCENDS 🌟" : rank === 4 ? "✨ LEGENDARY ✨" : `${rarityInfo(best.rarity).name} GET!`;
      wrap.appendChild(banner);
      setTimeout(() => {
        wrap.remove();
        done();
      }, rank >= 4 ? 1200 : 600);
    }, buildMs);
  }

  /* --- ショップ（コインで購入） --- */
  const SHOP_PRICE = { common: 15, uncommon: 35, rare: 80, epic: 180, legendary: 450 };
  let shopStock = [];
  let shopItems = []; // ショップの道具枠（消費アイテム＋お守り）
  let shopReturnsToBattle = false;

  function shuffled(arr) {
    return arr.slice().sort(() => Math.random() - 0.5);
  }
  function generateShopItems() {
    // 消費アイテム3種＋（未所持の）お守り1〜2種をランダムに陳列
    const cons = shuffled(CONSUMABLES).slice(0, 3);
    const rel = shuffled(RELICS_CATALOG.filter((r) => !hasRelic(r.id))).slice(0, randInt(1, 2));
    shopItems = [
      ...cons.map((c) => ({ data: c, price: c.price, bought: false, isRelic: false })),
      ...rel.map((r) => ({ data: r, price: r.price, bought: false, isRelic: true })),
    ];
  }

  function generateShopStock() {
    generateShopItems();
    shopStock = [makeItem(), makeItem(), makeItem()].map((it) => ({
      item: it,
      price: SHOP_PRICE[it.rarity] || 30,
      bought: false,
    }));
  }

  function showShop(returnToBattle, fresh) {
    shopReturnsToBattle = !!returnToBattle; // バトル中に開いた場合はバトルに戻る
    // 在庫は維持。開き直しでは引き直さない（リロールか新しい階でのみ更新）
    if (fresh || shopStock.length === 0) generateShopStock();
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    renderShop();
  }

  // バトル中に開いたショップを閉じて戦闘に戻る（階は進めない）
  function resumeFromShop() {
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    battleInput.disabled = false;
    battleMessage.textContent = "Answer correctly to attack!";
    updateBars();
    battleInput.focus();
  }

  // 「リュック」ボタン（バトル中でも装備の付け替えは可能）。
  // ※ショップは戦闘中は開けない（マップのショップマスからのみ）ためボタン自体を撤去
  const openBackpackBtn = document.getElementById("open-backpack");
  if (openBackpackBtn) openBackpackBtn.addEventListener("click", () => showBackpack(true));

  // 「🧪 道具」ボタン（バトル中いつでも。所持数をラベルに表示）
  const openItemsBtn = document.getElementById("open-items");
  if (openItemsBtn) openItemsBtn.addEventListener("click", () => showItems("battle"));
  function updateItemsButton() {
    if (openItemsBtn) openItemsBtn.textContent = `🧪 Items${inventory.length ? " (" + inventory.length + ")" : ""}`;
  }

  /* --- 道具メニュー（回復ポーション・巻物を使う／お守りを確認する） --- */
  function showItems(ctx) {
    itemsCtx = ctx; // "battle" or "map"
    battleCard.classList.add("is-hidden");
    if (routeMapEl) routeMapEl.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    battleMessage.textContent = ctx === "battle" ? "In battle: use an item (up to 3 per fight)" : "On the map: you can use healing items";
    renderItems();
  }

  function renderItems() {
    const uses = itemsCtx === "battle" ? `　Used ${itemUsesThisBattle}/${MAX_ITEM_USES}` : "";
    rewardTitle.textContent = `🎒 Items (${inventory.length}/${MAX_INVENTORY})${uses}`;
    rewardGrid.innerHTML = "";

    if (inventory.length === 0) {
      shopSection("You have no items (buy them at the shop)");
    } else {
      shopSection("🧪 Usable items");
      inventory.forEach((it, i) => {
        const battleOnly = !!it.battleOnly;
        const disabled =
          (itemsCtx === "battle" && itemUsesThisBattle >= MAX_ITEM_USES) ||
          (battleOnly && itemsCtx !== "battle");
        const note = battleOnly && itemsCtx !== "battle" ? " (Battle only)" : "";
        shopButton(it.icon, `Use ${it.name}`, `${it.desc}${note}`, disabled, () => useItem(i));
      });
    }
    // お守り（パッシブ・確認だけ）
    if (relics.length) {
      shopSection("🧿 Charms (passive effects while held)");
      relics.forEach((r) => shopButton(r.icon, r.name, r.desc, true, null));
    }
    // 戻る
    if (itemsCtx === "battle") {
      shopButton("⚔️", "Back to battle", "Close the item menu", false, () => resumeFromShop());
    } else {
      shopButton("🗺️", "Back to map", "Close the item menu", false, () => showMap());
    }
    updateBars();
  }

  function useItem(i) {
    const it = inventory[i];
    if (!it) return;
    const inBattle = itemsCtx === "battle";
    if (inBattle && itemUsesThisBattle >= MAX_ITEM_USES) return;
    if (it.battleOnly && !inBattle) return;

    let msg = "";
    if (it.kind === "heal") {
      const amt = Math.round(playerMaxHp * it.hpPct * (1 + relicFx("healBoost")));
      playerHp = Math.min(playerMaxHp, playerHp + amt);
      msg = `🧪 ${it.name}: restored ${formatNum(amt)} HP!`;
    } else if (it.kind === "mp") {
      const amt = Math.round(playerMaxMp * it.mpPct);
      playerMp = Math.min(playerMaxMp, playerMp + amt);
      msg = `🔷 ${it.name}: restored ${amt} MP!`;
    } else if (it.kind === "scroll") {
      msg = applyScroll(it);
    }
    inventory.splice(i, 1);
    if (inBattle) itemUsesThisBattle++;
    updateItemsButton();

    // 巻物で敵を倒した場合は戦闘に戻して撃破処理
    if (it.kind === "scroll" && inBattle && enemyHp <= 0) {
      resumeFromShop();
      battleMessage.textContent = msg;
      onEnemyDefeated();
      return;
    }
    battleMessage.textContent = msg;
    updateBars();
    renderItems(); // メニューに留まって続けて使える
  }

  // 巻物の効果（戦闘中に敵へ作用するものは battleOnly）
  function applyScroll(it) {
    if (it.sc === "shatter") {
      const b = enemyBarrier;
      enemyBarrier = 0;
      renderIntent();
      return b > 0 ? `📜 Break Scroll! Destroyed all ${b} barriers!` : "📜 Break Scroll (there was no barrier)";
    }
    if (it.sc === "bomb") {
      enemyBarrier = 0; // バリア貫通
      const dmg = clampNum(Math.round(enemyMaxHp * 0.6 + effAttack() * 3));
      enemyHp = clampNum(enemyHp - dmg);
      recordDamage(dmg);
      showDamage(dmg, true);
      screenShake(6);
      spawnBurst(30, { colors: ["#fb923c", "#f87171", "#fde68a"] });
      shakeEnemy();
      return `📜 Blast Scroll! ${formatNum(dmg)} huge damage!`;
    }
    if (it.sc === "purify") {
      for (const k in playerStatus) delete playerStatus[k];
      const amt = Math.round(playerMaxHp * 0.3 * (1 + relicFx("healBoost")));
      playerHp = Math.min(playerMaxHp, playerHp + amt);
      return `📜 Purify Scroll! Cured all status effects + restored ${formatNum(amt)} HP!`;
    }
    return "📜 Used a scroll";
  }

  // 「💣 爆弾を放出」ボタン（チンギスの騎馬靴を装備中のみ表示）
  const detonateBtn = document.getElementById("detonate-bomb");
  if (detonateBtn) detonateBtn.addEventListener("click", detonateBomb);
  function updateBombButton() {
    if (!detonateBtn) return;
    if (hasFx("bombStorePct")) {
      detonateBtn.classList.remove("is-hidden");
      detonateBtn.textContent = `💣 Detonate (${formatNum(bombStore)})`;
      detonateBtn.disabled = bombStore <= 0;
    } else {
      detonateBtn.classList.add("is-hidden");
    }
  }
  function detonateBomb() {
    if (bombStore <= 0 || enemyHp <= 0 || battleInput.disabled) return;
    if (enemyBarrier > 0) {
      enemyBarrier--;
      battleMessage.textContent = `💣 The bomb destroyed 1 barrier! (${enemyBarrier} left)`;
      renderIntent();
      updateBars();
      return;
    }
    const dmg = bombStore;
    bombStore = 0;
    enemyHp = clampNum(enemyHp - dmg);
    recordDamage(dmg); // 爆弾ダメージも記録
    showDamage(dmg, true);
    shakeEnemy();
    battleMessage.textContent = `💥 The bomb explodes! ${formatNum(dmg)} damage!`;
    updateBars();
    if (enemyHp <= 0) onEnemyDefeated();
  }

  // 装備アイコンのツールチップ（ホバー/タップで即表示）
  const tipBox = document.createElement("div");
  tipBox.className = "tip-box is-hidden";
  document.body.appendChild(tipBox);
  function showTip(text, x, y) {
    tipBox.textContent = text;
    tipBox.classList.remove("is-hidden");
    const r = tipBox.getBoundingClientRect();
    let left = x + 14;
    let top = y + 16;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
    tipBox.style.left = Math.max(8, left) + "px";
    tipBox.style.top = Math.max(8, top) + "px";
  }
  function hideTip() {
    tipBox.classList.add("is-hidden");
  }
  if (equipPanel) {
    equipPanel.addEventListener("mousemove", (e) => {
      const el = e.target.closest("[data-tip]");
      if (el) showTip(el.dataset.tip, e.clientX, e.clientY);
      else hideTip();
    });
    equipPanel.addEventListener("mouseleave", hideTip);
    // スマホ用：タップで一時表示
    equipPanel.addEventListener("click", (e) => {
      const el = e.target.closest("[data-tip]");
      if (el) {
        const rect = el.getBoundingClientRect();
        showTip(el.dataset.tip, rect.left + rect.width / 2, rect.bottom);
        setTimeout(hideTip, 2500);
      }
    });
  }

  // ショップ用の共通ヘルパー
  function shopSection(label) {
    const d = document.createElement("div");
    d.className = "shop-section";
    d.textContent = label;
    rewardGrid.appendChild(d);
  }
  function shopButton(icon, name, desc, disabled, onClick, color) {
    const btn = document.createElement("button");
    btn.className = "reward-card";
    if (color) btn.style.borderColor = color;
    btn.disabled = !!disabled;
    btn.innerHTML =
      `<span class="reward-icon">${icon}</span>` +
      `<span class="reward-name"${color ? ` style="color:${color}"` : ""}>${name}</span>` +
      `<span class="reward-desc">${desc}</span>`;
    if (!disabled && onClick) btn.addEventListener("click", onClick);
    rewardGrid.appendChild(btn);
  }

  const REROLL_COST = 10;

  function sellValue(item) {
    return Math.max(5, Math.floor((SHOP_PRICE[item.rarity] || 30) * 0.5));
  }

  function renderShop() {
    rewardTitle.textContent = `🏪 Shop　🪙 ${coins}`;
    rewardGrid.innerHTML = "";

    // 装備を買う＋リロール
    shopSection("🛒 Buy gear");
    shopStock.forEach((stock, i) => {
      const { item, price, bought } = stock;
      shopButton(
        SLOT_META[item.slot].icon,
        item.name,
        bought ? "✅Purchased" : `🪙${price} · ${item.desc}`,
        bought || coins < price,
        () => buyEquip(i),
        item.color,
      );
    });
    shopButton("🔄", "Reroll the stock", `🪙${REROLL_COST}`, coins < REROLL_COST, () => reroll());

    // 道具（消費アイテム＆お守り）を買う
    shopSection("🧪 Buy items & charms (items go to your bag)");
    shopItems.forEach((st, i) => {
      const { data, price, bought, isRelic } = st;
      const owned = isRelic && hasRelic(data.id);
      const full = !isRelic && inventory.length >= MAX_INVENTORY;
      const tag = isRelic ? "🧿Charm" : "🎒Item";
      shopButton(
        data.icon,
        `${data.name} (${tag})`,
        bought || owned ? "✅Obtained" : full ? "🎒Bag is full" : `🪙${price} · ${data.desc}`,
        bought || owned || full || coins < price,
        () => buyItem(i),
      );
    });

    // 装備を売る（装備中＋リュックの中身）
    const equipped = SLOTS.filter((s) => equipment[s.id]);
    if (equipped.length || backpack.length) {
      shopSection("💰 Sell gear");
      // リュックのレア以下（コモン/アンコモン/レア）をまとめて売る
      const lowItems = backpack.filter((it) => rarityRank(it.rarity) <= rarityRank("rare"));
      if (lowItems.length) {
        const lowTotal = lowItems.reduce((sum, it) => sum + sellValue(it), 0);
        shopButton(
          "🧹",
          `Sell all rare-and-below (${lowItems.length})`,
          `🪙+${formatNum(lowTotal)}`,
          false,
          () => sellBulkBelowRare(),
        );
      }
      equipped.forEach((s) => {
        const it = equipment[s.id];
        shopButton(s.icon, it.name, `Equipped · sell 🪙+${sellValue(it)}`, false, () => sellEquip(s.id), it.color);
      });
      // リュックの中身はレア度順で並べて売れるように
      backpack
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity))
        .forEach(({ item, idx }) => {
          shopButton(
            SLOT_META[item.slot].icon,
            item.name,
            `🎒Backpack · sell 🪙+${sellValue(item)}`,
            false,
            () => sellFromBackpack(idx),
            item.color,
          );
        });
    }

    // 手持ち道具（その場で使える）
    if (inventory.length || relics.length) {
      shopSection(`🎒 Your items (${inventory.length}/${MAX_INVENTORY}) & charms`);
      shopButton("🎒", "Open item menu", `Use / check`, false, () => showItems(shopReturnsToBattle ? "battle" : "map"));
    }

    // 退店
    shopSection("🛟 Other");
    if (shopReturnsToBattle) {
      shopButton("⚔️", "Back to battle", "Close the shop", false, () => resumeFromShop());
    } else {
      shopButton("➡️", "Back to map", "Leave the shop", false, () => advanceFloor("Left the shop!"));
    }
    updateBars();
  }

  function buyEquip(i) {
    const stock = shopStock[i];
    if (!stock || stock.bought || coins < stock.price) return;
    coins -= stock.price;
    stock.bought = true;
    backpack.push(stock.item); // 自動装備せずリュックへ（リュックから付け替え）
    battleMessage.textContent = `🛒 Bought "${stock.item.name}"! 🎒 Added to your backpack`;
    updateCoinDisplay();
    renderShop();
  }

  // 道具・お守りを買う（道具は手持ちへ、お守りは即パッシブ装備）
  function buyItem(i) {
    const st = shopItems[i];
    if (!st || st.bought || coins < st.price) return;
    if (!st.isRelic && inventory.length >= MAX_INVENTORY) return;
    if (st.isRelic && hasRelic(st.data.id)) return;
    coins -= st.price;
    st.bought = true;
    if (st.isRelic) {
      relics.push({ ...st.data });
      battleMessage.textContent = `🧿 Got the charm "${st.data.name}"! (${st.data.desc})`;
    } else {
      inventory.push({ ...st.data });
      battleMessage.textContent = `🎒 Got "${st.data.name}"! (Items ${inventory.length}/${MAX_INVENTORY})`;
    }
    updateCoinDisplay();
    updateItemsButton();
    renderShop();
  }

  // 在庫を引き直す（手数料。道具枠も引き直す）
  function reroll() {
    if (coins < REROLL_COST) return;
    coins -= REROLL_COST;
    generateShopStock();
    updateCoinDisplay();
    renderShop();
  }

  // 装備を売ってコインにする
  function sellEquip(slotId) {
    const it = equipment[slotId];
    if (!it) return;
    coins += sellValue(it);
    equipment[slotId] = null;
    recomputeMaxHp();
    renderEquipPanel();
    updateCoinDisplay();
    renderShop();
  }

  // リュックの装備を売ってコインにする
  function sellFromBackpack(i) {
    const it = backpack[i];
    if (!it) return;
    coins += sellValue(it);
    backpack.splice(i, 1);
    updateCoinDisplay();
    renderShop();
  }

  // リュックのレア以下（コモン/アンコモン/レア）をまとめて売る
  function sellBulkBelowRare() {
    let gained = 0;
    let n = 0;
    for (let i = backpack.length - 1; i >= 0; i--) {
      if (rarityRank(backpack[i].rarity) <= rarityRank("rare")) {
        gained += sellValue(backpack[i]);
        backpack.splice(i, 1);
        n++;
      }
    }
    if (n > 0) {
      coins += gained;
      battleMessage.textContent = `🧹 Sold ${n} rare-and-below items! 🪙+${formatNum(gained)}`;
      updateCoinDisplay();
      renderShop();
    }
  }

  // 装備パネル用の短い表示（基本ステータスがあれば数値、特殊効果は★）
  function shortTag(item) {
    const f = item.fx;
    if (f.atk) return `⚔${f.atk}`;
    if (f.def) return `🛡${f.def}`;
    if (f.maxHp) return `❤${f.maxHp}`;
    return "★";
  }

  function renderEquipPanel() {
    equipPanel.innerHTML = "";
    SLOTS.forEach((slot) => {
      const item = equipment[slot.id];
      const cell = document.createElement("div");
      cell.className = "equip-slot";
      if (item) {
        cell.style.borderColor = item.color;
        cell.dataset.tip = `${item.name} (${item.rarityName})\n${item.desc}`;
        cell.innerHTML =
          `<span class="equip-icon">${slot.icon}</span>` +
          `<span class="equip-val" style="color:${item.color}">${shortTag(item)}</span>`;
      } else {
        cell.dataset.tip = `${slot.name}: empty`;
        cell.innerHTML =
          `<span class="equip-icon dim">${slot.icon}</span>` +
          `<span class="equip-val dim">—</span>`;
      }
      equipPanel.appendChild(cell);
    });
  }

  /* --- 階を進める（パーク／宝箱のあと共通） --- */
  // マスの用事（ごほうび・ショップ・ガチャなど）が終わったらマップに戻る
  function advanceFloor(prefix) {
    showMap(`${prefix}　🗺️ Choose your next node`);
  }

  function onGameOver() {
    battleInput.disabled = true;
    battleCard.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    if (routeMapEl) routeMapEl.classList.add("is-hidden");
    battleOver.classList.remove("is-hidden");
    battleOver.innerHTML =
      `💀 Game Over<br>${playerChar.emoji} ${playerChar.name}　Reached: <strong>Stage ${stageNum} · Node ${Math.max(1, layerIdx + 1)}</strong>` +
      `<br>Defeated: <strong>${defeated}</strong>　Wrong answers: <strong>${wrongCount}</strong>` +
      `<br><br><button id="battle-restart">Try again</button>`;
    document.getElementById("battle-restart").addEventListener("click", startBattle);
    updateBars();
  }

  function onGameClear() {
    battleInput.disabled = true;
    battleCard.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    if (routeMapEl) routeMapEl.classList.add("is-hidden");
    battleOver.classList.remove("is-hidden");
    battleOver.innerHTML =
      `👑 Stage ${stageNum} conquered! Congrats!<br>${playerChar.emoji} ${playerChar.name} wins!　Defeated: <strong>${defeated}</strong>` +
      `<br>Wrong answers: <strong>${wrongCount}</strong>　🏆Best damage: <strong>${formatNum(maxAttackDamage)}</strong>` +
      `<br><br><button id="battle-restart">Try again</button>`;
    document.getElementById("battle-restart").addEventListener("click", startBattle);
    updateBars();
  }

  /* ---------- 初期化：最初はレベル選択画面 ---------- */
  showView("level-select");
})();
