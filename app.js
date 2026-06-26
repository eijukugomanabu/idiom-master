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
  LEVELS.forEach((level) => {
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
    } else {
      sets = chunk(filterByLevel(IDIOMS, currentLevel), CARDS_PER_SET);
      setIndex = 0;
      loadSet();
      if (mode === "flashcards") {
        renderCard();
      } else {
        startQuiz();
      }
    }
    showView(mode);
  }

  function loadSet() {
    cards = sets[setIndex] || [];
  }

  // もう一段先のセットがあるか
  function hasNextSet() {
    return setIndex < sets.length - 1;
  }

  function goNextSet() {
    if (!hasNextSet()) return;
    setIndex++;
    loadSet();
    if (currentMode === "flashcards") {
      index = 0;
      renderCard();
    } else {
      startQuiz();
    }
  }

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

  function renderCard() {
    const card = cards[index];
    cardEl.classList.remove("is-flipped");
    setImage(imageEl, card);
    phraseEl.textContent = card.phrase;
    meaningEl.textContent = card.meaning;
    exampleEl.textContent = card.example;
    exampleJaEl.textContent = card.exampleJa;
    setProgressLabel(progressEl, `${index + 1} / ${cards.length}`);
    cardNextSet.classList.toggle("is-hidden", !hasNextSet());
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
  cardNextSet.addEventListener("click", goNextSet);

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

  // クイズを（現在のセットで）最初から始める
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
    setProgressLabel(quizProgress, `${qIndex + 1} / ${cards.length}　スコア: ${score}`);
    quizInput.focus();
  }

  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered) return;
    const card = cards[qIndex];
    answered = true;
    quizInput.disabled = true;
    if (matchesIdiom(quizInput.value, card)) {
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

  function showResult() {
    quizCard.classList.add("is-hidden");
    quizProgress.classList.add("is-hidden");
    quizResult.classList.remove("is-hidden");
    const nextSetButton = hasNextSet()
      ? `<button id="quiz-next-set">次の10問へ →</button>`
      : "";
    quizResult.innerHTML =
      `🎉 セット${setIndex + 1}終了！<br>スコア: <strong>${score} / ${cards.length}</strong>` +
      `<br><br><button id="quiz-restart">もう一度</button> ${nextSetButton}`;
    document.getElementById("quiz-restart").addEventListener("click", startQuiz);
    const nextBtn = document.getElementById("quiz-next-set");
    if (nextBtn) nextBtn.addEventListener("click", goNextSet);
  }

  /* ---------- 英熟語バトル（ローグライク） ---------- */
  const BASE_MAX_HP = 100;
  const MAX_FLOOR = 100;
  const ENEMIES = [
    { emoji: "🐀", name: "ねずみ" },
    { emoji: "🦇", name: "こうもり" },
    { emoji: "🕷️", name: "クモ" },
    { emoji: "🐍", name: "ヘビ" },
    { emoji: "🦂", name: "サソリ" },
    { emoji: "🐺", name: "おおかみ" },
    { emoji: "👻", name: "ゆうれい" },
    { emoji: "🧟", name: "ゾンビ" },
    { emoji: "👹", name: "おに" },
    { emoji: "👺", name: "てんぐ" },
    { emoji: "🦈", name: "サメ" },
  ];
  const BOSS = { emoji: "🐉", name: "ドラゴン" };
  const FINAL_BOSS = { emoji: "🐲", name: "魔王" };

  // 装備スロット
  const SLOTS = [
    { id: "weapon", icon: "⚔️", name: "剣" },
    { id: "head", icon: "🪖", name: "兜" },
    { id: "body", icon: "👕", name: "鎧" },
    { id: "legs", icon: "👖", name: "ズボン" },
    { id: "shoes", icon: "👟", name: "靴" },
  ];
  const SLOT_META = {};
  SLOTS.forEach((s) => (SLOT_META[s.id] = s));
  // レア度（5段階。深い階ほど高レアが出やすい）
  const RARITIES = [
    { id: "common", name: "コモン", color: "#94a3b8" },
    { id: "uncommon", name: "アンコモン", color: "#4ade80" },
    { id: "rare", name: "レア", color: "#38bdf8" },
    { id: "epic", name: "エピック", color: "#a78bfa" },
    { id: "legendary", name: "レジェンダリー", color: "#fbbf24" },
  ];

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

  let pool = [];
  let playerHp = BASE_MAX_HP;
  let playerMaxHp = BASE_MAX_HP;
  let floor = 1;
  let defeated = 0;
  let wrongCount = 0; // 間違えた回数（バトル中）
  let combo = 0; // 連続正解数（コンボ。1問でも間違えると0に戻る）
  let coins = 0; // 所持コイン（敵撃破でランダム入手、ショップで使う）
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
    { icon: "⚔️", name: "攻撃アップ", desc: "攻撃ダメージ +6", apply: () => (attackBonus += 6) },
    { icon: "💥", name: "会心の一撃", desc: "25%の確率でダメージ2倍", apply: () => (critChance += 0.25) },
    { icon: "🛡️", name: "防御", desc: "受けるダメージ -4", apply: () => (damageReduction += 4) },
    { icon: "❤️", name: "最大HP+25", desc: "最大HPが25増えて回復", apply: () => (perkMaxHpBonus += 25) },
    { icon: "✨", name: "回復", desc: "HPを40回復", apply: () => (playerHp = Math.min(playerMaxHp, playerHp + 40)) },
    { icon: "🩸", name: "吸収", desc: "攻撃するたびHP+4", apply: () => (lifesteal += 4) },
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
  function sumFx(key) {
    let t = 0;
    for (const it of equippedItems()) if (typeof it.fx[key] === "number") t += it.fx[key];
    return t;
  }
  function maxFx(key) {
    let m = 0;
    for (const it of equippedItems()) if (typeof it.fx[key] === "number") m = Math.max(m, it.fx[key]);
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

  function baseAtk() {
    return attackBonus + sumFx("atk") + bonusAtk;
  }
  function baseDef() {
    return damageReduction + sumFx("def") + bonusDef;
  }
  function critTotal() {
    return critChance + sumFx("crit") + bonusCrit;
  }
  function effAttack() {
    let a = baseAtk();
    a += baseDef() * sumFx("convDefToAtk");
    a += playerHp * sumFx("convCurHpToAtk");
    return Math.max(0, Math.round(a));
  }
  function effDefense() {
    let d = baseDef();
    d += baseAtk() * sumFx("convAtkToDef");
    return Math.max(0, Math.round(d));
  }
  // 攻撃の倍率（HP割合・ボス・敵HPなどの条件）
  function attackMultiplier() {
    let mult = 1;
    const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 1;
    for (const c of condList("lowHpAtk")) if (hpRatio <= c.th) mult += c.pct;
    const scaleMax = maxFx("scalingLowHpAtk");
    if (scaleMax > 0) mult += (1 - hpRatio) * scaleMax;
    if (enemyIsBoss) mult += sumFx("bossAtk");
    const enemyRatio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1;
    for (const c of condList("lowEnemyAtk")) if (enemyRatio <= c.th) mult += c.pct;
    return mult;
  }
  // 最大HPを再計算（基本＋パーク＋装備＋累積＋変換）。増えた分は回復する。
  function recomputeMaxHp() {
    let m = BASE_MAX_HP + perkMaxHpBonus + sumFx("maxHp") + bonusMaxHp;
    m += baseDef() * sumFx("convDefToHp");
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
    playerMaxHp = BASE_MAX_HP;
    playerHp = BASE_MAX_HP;
    battleOver.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    battleMessage.textContent = "クイズに正解して攻撃しよう！";
    renderEquipPanel();
    updateComboDisplay();
    updateCoinDisplay();
    spawnEnemy();
    nextBattleQuestion();
    updateBars();
  }

  function spawnEnemy() {
    const isFinal = floor >= MAX_FLOOR;
    const isBoss = floor % 10 === 0;
    enemyIsBoss = isFinal || isBoss;
    currentEnemy = isFinal ? FINAL_BOSS : isBoss ? BOSS : randomOf(ENEMIES);
    const base = isFinal ? 140 : isBoss ? 70 : 22;
    // 10階上がるごとに敵HPを10倍にする（1〜10階は×1、11〜20階は×10、…91〜100階は×10^9）
    const hpScale = Math.pow(10, Math.floor((floor - 1) / 10));
    enemyMaxHp = Math.round((base + floor * 6) * (isBoss || isFinal ? 1.4 : 1) * hpScale);
    enemyHp = enemyMaxHp;
    floorLabel.textContent =
      `${floor}/${MAX_FLOOR}階` + (isFinal ? "（最終ボス）" : isBoss ? "（ボス）" : "");
    enemyEmoji.textContent = currentEnemy.emoji;
    enemyName.textContent = currentEnemy.name;
  }

  function nextBattleQuestion() {
    battleIdiom = randomOf(pool);
    battleHint.textContent = `ヒント: ${battleIdiom.meaning}`;
    battleSentence.textContent = makeBlank(battleIdiom.example, battleIdiom.phrase);
    battleInput.value = "";
    battleInput.disabled = false;
    battleInput.focus();
  }

  function updateBars() {
    enemyHpFill.style.width = Math.max(0, (enemyHp / enemyMaxHp) * 100) + "%";
    enemyHpText.textContent = `${Math.max(0, enemyHp)} / ${enemyMaxHp}`;
    playerHpFill.style.width = Math.max(0, (playerHp / playerMaxHp) * 100) + "%";
    playerHpText.textContent = `${Math.max(0, playerHp)} / ${playerMaxHp}`;
  }

  // 与えたダメージ数を敵の上にポップ表示する
  function showDamage(amount, crit) {
    if (!battleStage) return;
    const el = document.createElement("div");
    el.className = "dmg-float" + (crit ? " crit" : "");
    el.textContent = typeof amount === "number" ? amount.toLocaleString("en-US") : amount;
    battleStage.appendChild(el);
    setTimeout(() => el.remove(), 850);
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
      comboBadge.textContent = `🔥 ${combo} コンボ`;
    } else {
      comboBadge.classList.add("is-hidden");
    }
  }

  battleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (battleInput.disabled) return;
    const phrase = battleIdiom.phrase;
    if (matchesIdiom(battleInput.value, battleIdiom)) {
      attackEnemy(phrase);
    } else {
      enemyAttack(phrase);
    }
  });

  // 正解 → 敵を攻撃
  function attackEnemy(phrase) {
    combo++; // 連続正解でコンボが伸びる
    updateComboDisplay();
    // 1コンボごとに攻撃力 ×1.1（コンボ数の累乗）
    const comboMult = Math.pow(1.1, combo);
    let hit = Math.round((randInt(16, 24) + effAttack()) * attackMultiplier() * comboMult);
    const crit = Math.random() < critTotal();
    if (crit) hit *= 2;
    const hits = hasFx("extraHit") ? 2 : 1;
    let dealt = 0;
    let note = "";
    if (hasFx("instakill") && Math.random() < sumFx("instakill")) {
      enemyHp = 0;
      note = "⚡即死！ ";
    } else {
      for (let h = 0; h < hits; h++) {
        enemyHp -= hit;
        dealt += hit;
      }
      const execTh = maxFx("execute");
      if (execTh > 0 && enemyHp > 0 && enemyHp <= enemyMaxHp * execTh) {
        enemyHp = 0;
        note = "☠️処刑！ ";
      }
    }
    const dToAtk = sumFx("damageToAtkPct");
    if (dToAtk > 0) bonusAtk += Math.floor(dealt * dToAtk);
    if (lifesteal > 0) playerHp = Math.min(playerMaxHp, playerHp + lifesteal);
    const flair =
      (combo >= 2 ? `🔥${combo}コンボ ` : "") + (crit ? "💥会心！ " : "") + (hits > 1 ? "2回攻撃！ " : "");
    battleMessage.textContent = note
      ? `${note}「${phrase}」で敵を倒した！`
      : `⚔️ ${flair}「${phrase}」で ${dealt} のダメージ！`;
    updateBars();
    shakeEnemy();
    showDamage(dealt > 0 ? dealt : "⚡", crit);
    if (enemyHp <= 0) onEnemyDefeated();
    else nextBattleQuestion();
  }

  // 不正解 → 敵の反撃
  function enemyAttack(phrase) {
    wrongCount++;
    combo = 0; // 間違えるとコンボはリセット
    updateComboDisplay();
    let incoming = Math.max(1, 8 + floor - effDefense());
    const dodgeP = Math.min(0.9, sumFx("dodge"));
    if (dodgeP > 0 && Math.random() < dodgeP) {
      battleMessage.textContent = `❌ 正解は「${phrase}」。でも回避！ ダメージ0`;
      updateBars();
      nextBattleQuestion();
      return;
    }
    let reduce = sumFx("damageReducePct");
    for (const c of condList("damageReduceLowHp")) {
      if (playerHp / playerMaxHp <= c.th) reduce += c.pct;
    }
    reduce = Math.min(0.95, reduce);
    const reflectDmg = Math.round(incoming * sumFx("reflect"));
    incoming = Math.max(0, Math.round(incoming * (1 - reduce)));
    playerHp -= incoming;
    if (reflectDmg > 0) enemyHp -= reflectDmg;
    battleMessage.textContent =
      `❌ 正解は「${phrase}」。${currentEnemy.name}の反撃で ${incoming} のダメージ！` +
      (reflectDmg > 0 ? `（${reflectDmg} 反射）` : "");
    updateBars();
    if (enemyHp <= 0) {
      onEnemyDefeated();
      return;
    }
    if (playerHp <= 0) {
      const revivePct = maxFx("revive");
      if (revivePct > 0 && !reviveUsed) {
        reviveUsed = true;
        playerHp = Math.max(1, Math.round(playerMaxHp * revivePct));
        battleMessage.textContent = `💫 復活！ HP ${playerHp} で立ち上がった！`;
        updateBars();
        nextBattleQuestion();
      } else {
        onGameOver();
      }
    } else {
      nextBattleQuestion();
    }
  }

  function onEnemyDefeated() {
    defeated++;
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
    const healPct = sumFx("killHealPct");
    if (healPct) heal += Math.round(playerMaxHp * healPct);
    if (heal) playerHp = Math.min(playerMaxHp, playerHp + heal);

    // コインをランダム入手（階が上がるほど増える）
    const coinGain = randInt(3, 7) + Math.floor(floor * 1.5);
    coins += coinGain;
    updateCoinDisplay();

    const beatenName = currentEnemy.name;
    battleInput.disabled = true;
    if (floor >= MAX_FLOOR) {
      onGameClear();
    } else if (floor % 5 === 0) {
      showCheckpoint(beatenName, coinGain); // 5階ごとは「武器 or ショップ」
    } else {
      showPerks(beatenName); // それ以外はパーク
    }
  }

  /* --- 撃破後その1：パーク3択 --- */
  function showPerks(beatenName) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    battleMessage.textContent = `🎉 ${beatenName}を倒した！ごほうびを選ぼう`;
    rewardTitle.textContent = "🎁 ごほうびを1つ選ぼう";
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
    advanceFloor(`${perk.icon} ${perk.name}を獲得！`);
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
    battleMessage.textContent = `🎁 ${beatenName}を倒した！宝箱を発見！`;
    rewardTitle.textContent = "🎁 宝箱！装備を1つ選ぼう";
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

  function chooseEquip(item) {
    equipment[item.slot] = item; // 同じスロットは新しい装備に置き換わる
    recomputeMaxHp();
    renderEquipPanel();
    advanceFloor(`${item.name}を装備！`);
  }

  /* --- 5階チェックポイント：武器（装備）かショップを選ぶ --- */
  function showCheckpoint(beatenName, coinGain) {
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    battleMessage.textContent = `🏁 ${beatenName}を倒した！ 🪙+${coinGain}`;
    rewardTitle.textContent = `🏁 どちらにする？（🪙 ${coins}）`;
    rewardGrid.innerHTML = "";
    const opt = (icon, name, desc, onClick) => {
      const btn = document.createElement("button");
      btn.className = "reward-card";
      btn.innerHTML =
        `<span class="reward-icon">${icon}</span>` +
        `<span class="reward-name">${name}</span>` +
        `<span class="reward-desc">${desc}</span>`;
      btn.addEventListener("click", onClick);
      rewardGrid.appendChild(btn);
    };
    opt("🎁", "武器を得る", "装備を3択から1つ無料でゲット", () => showTreasure(beatenName));
    opt("🏪", "ショップ", `コインで装備や回復を買う（🪙 ${coins}）`, () => showShop());
    updateBars();
  }

  /* --- ショップ（コインで購入） --- */
  const SHOP_PRICE = { common: 15, uncommon: 35, rare: 80, epic: 180, legendary: 450 };
  let shopStock = [];

  function showShop() {
    // 在庫を3つ生成（ショップにいる間は固定）
    shopStock = [makeItem(), makeItem(), makeItem()].map((it) => ({
      item: it,
      price: SHOP_PRICE[it.rarity] || 30,
      bought: false,
    }));
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    renderShop();
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
  const STAT_UPGRADES = [
    { icon: "⚔️", name: "攻撃 +10", price: 30, apply: () => (bonusAtk += 10) },
    { icon: "❤️", name: "最大HP +50", price: 30, apply: () => (perkMaxHpBonus += 50) },
    { icon: "🛡️", name: "防御 +5", price: 30, apply: () => (bonusDef += 5) },
    { icon: "💥", name: "会心 +5%", price: 40, apply: () => (bonusCrit += 0.05) },
  ];

  function sellValue(item) {
    return Math.max(5, Math.floor((SHOP_PRICE[item.rarity] || 30) * 0.5));
  }

  function renderShop() {
    rewardTitle.textContent = `🏪 ショップ　🪙 ${coins}`;
    rewardGrid.innerHTML = "";

    // 装備を買う＋リロール
    shopSection("🛒 装備を買う");
    shopStock.forEach((stock, i) => {
      const { item, price, bought } = stock;
      shopButton(
        SLOT_META[item.slot].icon,
        item.name,
        bought ? "✅購入済み" : `🪙${price}・${item.desc}`,
        bought || coins < price,
        () => buyEquip(i),
        item.color,
      );
    });
    shopButton("🔄", "在庫を引き直す", `🪙${REROLL_COST}`, coins < REROLL_COST, () => reroll());

    // ステータス強化（永続）
    shopSection("💪 ステータス強化（このプレイ中ずっと有効）");
    STAT_UPGRADES.forEach((u) => {
      shopButton(u.icon, u.name, `🪙${u.price}`, coins < u.price, () => buyUpgrade(u));
    });

    // 装備を売る
    const equipped = SLOTS.filter((s) => equipment[s.id]);
    if (equipped.length) {
      shopSection("💰 装備を売る");
      equipped.forEach((s) => {
        const it = equipment[s.id];
        shopButton(s.icon, it.name, `売る 🪙+${sellValue(it)}`, false, () => sellEquip(s.id), it.color);
      });
    }

    // その他（回復・退店）
    shopSection("🛟 その他");
    const healPrice = Math.max(20, floor * 4);
    shopButton(
      "🍖",
      "HP全回復",
      `🪙${healPrice}`,
      coins < healPrice || playerHp >= playerMaxHp,
      () => buyHeal(healPrice),
    );
    shopButton("➡️", "次の階へ進む", "ショップを出る", false, () => advanceFloor("ショップを出た！"));
    updateBars();
  }

  function buyEquip(i) {
    const stock = shopStock[i];
    if (!stock || stock.bought || coins < stock.price) return;
    coins -= stock.price;
    stock.bought = true;
    equipment[stock.item.slot] = stock.item;
    recomputeMaxHp();
    renderEquipPanel();
    updateCoinDisplay();
    renderShop();
  }

  function buyHeal(price) {
    if (coins < price) return;
    coins -= price;
    playerHp = playerMaxHp;
    updateCoinDisplay();
    updateBars();
    renderShop();
  }

  // 在庫を引き直す（手数料）
  function reroll() {
    if (coins < REROLL_COST) return;
    coins -= REROLL_COST;
    shopStock = [makeItem(), makeItem(), makeItem()].map((it) => ({
      item: it,
      price: SHOP_PRICE[it.rarity] || 30,
      bought: false,
    }));
    updateCoinDisplay();
    renderShop();
  }

  // コインでステータスを永続強化
  function buyUpgrade(u) {
    if (coins < u.price) return;
    coins -= u.price;
    u.apply();
    recomputeMaxHp();
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
        cell.title = `${item.name}：${item.desc}`;
        cell.innerHTML =
          `<span class="equip-icon">${slot.icon}</span>` +
          `<span class="equip-val" style="color:${item.color}">${shortTag(item)}</span>`;
      } else {
        cell.innerHTML =
          `<span class="equip-icon dim">${slot.icon}</span>` +
          `<span class="equip-val dim">—</span>`;
      }
      equipPanel.appendChild(cell);
    });
  }

  /* --- 階を進める（パーク／宝箱のあと共通） --- */
  function advanceFloor(prefix) {
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    floor++;
    // 階を進む（＝レベルアップ）効果
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
    spawnEnemy();
    nextBattleQuestion();
    battleMessage.textContent = `${prefix} 次は${floor}階（${currentEnemy.name}）！`;
    updateBars();
  }

  function onGameOver() {
    battleInput.disabled = true;
    battleCard.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleOver.classList.remove("is-hidden");
    battleOver.innerHTML =
      `💀 ゲームオーバー<br>到達: <strong>${floor}/${MAX_FLOOR}階</strong>　撃破: <strong>${defeated}体</strong>` +
      `<br>間違えた回数: <strong>${wrongCount}回</strong>` +
      `<br><br><button id="battle-restart">もう一度挑戦</button>`;
    document.getElementById("battle-restart").addEventListener("click", startBattle);
    updateBars();
  }

  function onGameClear() {
    battleInput.disabled = true;
    battleCard.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleOver.classList.remove("is-hidden");
    battleOver.innerHTML =
      `👑 全${MAX_FLOOR}階クリア！おめでとう！<br>魔王を倒した！　撃破: <strong>${defeated}体</strong>` +
      `<br>間違えた回数: <strong>${wrongCount}回</strong>` +
      `<br><br><button id="battle-restart">もう一度挑戦</button>`;
    document.getElementById("battle-restart").addEventListener("click", startBattle);
    updateBars();
  }

  /* ---------- 初期化：最初はレベル選択画面 ---------- */
  showView("level-select");
})();
