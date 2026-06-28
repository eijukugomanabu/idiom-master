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
    { id: "mythic", name: "ミシック", color: "#f43f5e" }, // ガチャ限定
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
  const playerStats = document.getElementById("player-stats");

  let pool = [];
  let playerHp = BASE_MAX_HP;
  let playerMaxHp = BASE_MAX_HP;
  let floor = 1;
  let defeated = 0;
  let wrongCount = 0; // 間違えた回数（バトル中）
  let combo = 0; // 連続正解数（コンボ。1問でも間違えると0に戻る）
  let coins = 0; // 所持コイン（敵撃破でランダム入手、ショップで使う）
  let enemiesRemaining = 1; // この階に残っている敵の数
  let splashDamage = 0; // 後ろの敵に蓄積する範囲ダメージ
  const backpack = []; // 外した装備を保管するリュック
  let perkPicksLeft = 0; // 残りのパーク選択回数（妖精で2回になる）
  let bonusActive = false; // ステータスの妖精による2回選択中か
  let atkStackMult = 1; // 攻撃ごとに乗算で増える倍率（一部装備）
  let noHitStreak = 0; // 被弾せずに連続攻撃した回数
  let tempAtkBuffPct = 0; // 被弾後の一時攻撃バフ（次の攻撃で消費）
  let totalDamageDealt = 0; // これまでに与えた累計ダメージ
  let immuneLeft = 0; // 残りダメージ無効回数（神核装甲など）
  let bonusHits = 0; // 追加攻撃回数（撃破で増える）
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
    { icon: "⚔️", name: "攻撃アップ", desc: "攻撃ダメージ +8", apply: () => (attackBonus += 8) },
    { icon: "🔥", name: "渾身の一撃", desc: "攻撃ダメージ +15", apply: () => (attackBonus += 15) },
    { icon: "💥", name: "会心の一撃", desc: "25%の確率でダメージ2倍", apply: () => (critChance += 0.25) },
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

  // 装備中の指定レア度の数
  function countRarity(r) {
    return equippedItems().filter((it) => it.rarity === r).length;
  }
  // 大きな数を読みやすく
  function formatNum(n) {
    if (!isFinite(n)) return "∞";
    return Math.round(n).toLocaleString("en-US");
  }
  function clampNum(n) {
    if (!isFinite(n) || n > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
    return n;
  }

  function baseAtk() {
    return attackBonus + sumFx("atk") + bonusAtk;
  }
  function baseDef() {
    return damageReduction + sumFx("def") + bonusDef;
  }
  // 会心率（基本＋装備＋変換＋条件）
  function critTotal() {
    let c = critChance + sumFx("crit") + bonusCrit;
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
    if (enemyIsBoss && hasFx("bossDigitsCrit")) m *= 14;
    return m;
  }
  // 最大HPを再計算（基本＋パーク＋装備＋累積＋変換＋乗算）。増えた分は回復する。
  function recomputeMaxHp() {
    let m = BASE_MAX_HP + perkMaxHpBonus + sumFx("maxHp") + bonusMaxHp;
    m += baseDef() * sumFx("convDefToHp");
    m *= 1 + sumFx("maxHpMult"); // 最大HPの乗算（例 2倍）
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
    shopStock = [];
    splashDamage = 0;
    playerMaxHp = BASE_MAX_HP;
    playerHp = BASE_MAX_HP;
    battleOver.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    battleMessage.textContent = "クイズに正解して攻撃しよう！";
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
    if (hasFx("startAtkMult")) atkStackMult = clampNum(atkStackMult * Math.max(1, sumFx("startAtkMult"))); // ミシック：戦闘開始時に攻撃倍率（ジェネシス）
    beginFloorEnemies();
    nextBattleQuestion();
    updateBars();
  }

  function spawnEnemy() {
    const isFinal = floor >= MAX_FLOOR;
    const isBoss = floor % 10 === 0;
    enemyIsBoss = isFinal || isBoss;
    if (enemyIsBoss && hasFx("totalDmgToAtkOnBoss")) {
      bonusAtk = clampNum(bonusAtk + totalDamageDealt); // ボス戦開始時、累計ダメージを攻撃へ
    }
    currentEnemy = isFinal ? FINAL_BOSS : isBoss ? BOSS : randomOf(ENEMIES);
    const base = isFinal ? 140 : isBoss ? 70 : 22;
    // 10階上がるごとに敵HPを10倍にする（1〜10階は×1、11〜20階は×10、…91〜100階は×10^9）
    const hpScale = Math.pow(10, Math.floor((floor - 1) / 10));
    enemyMaxHp = Math.round((base + floor * 6) * (isBoss || isFinal ? 1.4 : 1) * hpScale);
    enemyHp = enemyMaxHp;
    floorLabel.textContent =
      `${floor}/${MAX_FLOOR}階` + (isFinal ? "（最終ボス）" : isBoss ? "（ボス）" : "");
    enemyEmoji.classList.remove("defeated", "shake");
    enemyEmoji.textContent = currentEnemy.emoji;
    enemyName.textContent =
      currentEnemy.name + (enemiesRemaining > 1 ? `（この階 残り${enemiesRemaining}体）` : "");
  }

  // 1つの階の敵をまとめてセットアップ（通常は複数体、ボス階は1体）
  function beginFloorEnemies() {
    const isBossFloor = floor % 10 === 0 || floor >= MAX_FLOOR;
    enemiesRemaining = isBossFloor ? 1 : randInt(1, 3);
    splashDamage = 0; // 階が変わったら範囲ダメージはリセット
    spawnEnemy();
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
    playerHpText.textContent = `${formatNum(Math.max(0, playerHp))} / ${formatNum(playerMaxHp)}`;
    renderStats();
  }

  // 今の自分のステータス（攻撃/防御/最大HP/会心）を表示
  function renderStats() {
    if (!playerStats) return;
    playerStats.innerHTML =
      `<span title="攻撃力">⚔️ ${formatNum(effAttack())}</span>` +
      `<span title="防御力">🛡️ ${formatNum(effDefense())}</span>` +
      `<span title="最大HP">❤️ ${formatNum(playerMaxHp)}</span>` +
      `<span title="会心率">💥 ${Math.round(critTotal() * 100)}%</span>`;
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
    const comboMult = Math.pow(1.1, combo); // 1コンボごと×1.1

    // ミシック：毎ターン攻撃倍率を乗算で増やす
    if (hasFx("atkMultPerTurn")) atkStackMult = clampNum(atkStackMult * Math.max(1, sumFx("atkMultPerTurn")));
    // ミシック：毎ターン最大HPの割合を回復
    const turnHeal = sumFx("turnHealPct");
    if (turnHeal) playerHp = Math.min(playerMaxHp, playerHp + Math.round(playerMaxHp * turnHeal));

    // 基礎攻撃 × 各種倍率（加算式＋乗算式）
    let hit = (randInt(16, 24) + effAttack()) * attackMultiplier() * comboMult * atkStackMult;
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
    hit = clampNum(hit);

    const crit = Math.random() < critTotal();
    if (crit) hit = clampNum(hit * critMultiplier());
    hit = Math.round(hit);

    let hits = hasFx("extraHit") ? 2 : 1;
    if (hasFx("extraHitChance") && Math.random() < sumFx("extraHitChance")) hits += 1;
    hits += sumFx("extraHits") + bonusHits; // ミシック：追加攻撃回数（神速の靴など）

    let dealt = 0;
    let note = "";
    if (hasFx("instakill") && Math.random() < sumFx("instakill")) {
      enemyHp = 0;
      note = "⚡即死！ ";
    } else {
      for (let h = 0; h < hits; h++) {
        enemyHp -= hit;
        dealt = clampNum(dealt + hit);
      }
      const execTh = maxFx("execute");
      if (execTh > 0 && enemyHp > 0 && enemyHp <= enemyMaxHp * execTh) {
        enemyHp = 0;
        note = "☠️処刑！ ";
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
      if (dToAtk > 0) bonusAtk = clampNum(bonusAtk + Math.floor(dealt * dToAtk));
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
      splashDamage = clampNum(splashDamage + Math.round(dealt * 0.3));
    }

    const flair =
      (combo >= 2 ? `🔥${combo}コンボ ` : "") + (crit ? "💥会心！ " : "") + (hits > 1 ? `${hits}回攻撃！ ` : "");
    battleMessage.textContent = note
      ? `${note}「${phrase}」で敵を倒した！`
      : `⚔️ ${flair}「${phrase}」で ${formatNum(dealt)} のダメージ！`;
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
    // ミシック：無敵回数があるとダメージを無効化（虚無王の王冠）
    if (immuneLeft > 0) {
      immuneLeft--;
      const im = sumFx("immuneAtkMult");
      if (im) atkStackMult = clampNum(atkStackMult * Math.max(1, im));
      battleMessage.textContent = `❌ 正解は「${phrase}」。でも無敵！ ダメージ0（残り${immuneLeft}回）`;
      noHitStreak = 0;
      updateBars();
      nextBattleQuestion();
      return;
    }
    let incoming = Math.max(1, 8 + floor - effDefense());
    const dodgeP = Math.min(0.9, sumFx("dodge"));
    if (dodgeP > 0 && Math.random() < dodgeP) {
      const das = sumFx("dodgeAtkStack"); // ミシック：回避するたび攻撃倍率UP（星渡りの靴）
      if (das) atkStackMult = clampNum(atkStackMult * Math.max(1, das));
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
    noHitStreak = 0; // 被弾でストリークが切れる
    tempAtkBuffPct = Math.max(tempAtkBuffPct, sumFx("onHitBuffAtkPct")); // 被弾で次の攻撃にバフ
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
    const healPct = sumFx("killHealPct");
    if (healPct) heal += Math.round(playerMaxHp * healPct);
    if (heal) playerHp = Math.min(playerMaxHp, playerHp + heal);

    // コインをランダム入手（階が上がるほど増える）
    const coinGain = randInt(25, 50) + Math.floor(floor * 10);
    coins += coinGain;
    updateCoinDisplay();

    const beatenName = currentEnemy.name;
    battleInput.disabled = true;
    playDefeatAnim(); // 撃破演出
    enemiesRemaining--;

    // 演出を見せてから次へ
    setTimeout(() => {
      if (enemiesRemaining > 0) {
        // 同じ階にまだ敵がいる
        spawnEnemy();
        // 後ろの敵に蓄積した範囲ダメージを適用
        let splashNote = "";
        if (splashDamage > 0) {
          const before = enemyHp;
          enemyHp = Math.max(1, clampNum(enemyHp - splashDamage));
          if (enemyHp < before) {
            showDamage(clampNum(before - enemyHp), false);
            splashNote = ` 🌪️範囲ダメージ ${formatNum(before - enemyHp)}！`;
          }
          splashDamage = 0;
        }
        battleMessage.textContent =
          `🗡️ ${beatenName}を倒した！次の敵（残り${enemiesRemaining}体）${splashNote}`;
        updateBars();
        nextBattleQuestion();
        return;
      }
      // 階クリア → ごほうび
      if (floor >= MAX_FLOOR) {
        onGameClear();
      } else if (floor % 5 === 0) {
        showGacha(beatenName); // 5階ごとは武器ガチャ
      } else {
        // ランダムで「ステータスの妖精」が出ると2回選べる
        bonusActive = Math.random() < 0.18;
        perkPicksLeft = bonusActive ? 2 : 1;
        showPerks(beatenName);
      }
    }, 480);
  }

  // 撃破演出：敵がはじけて消える＋💥
  function playDefeatAnim() {
    enemyEmoji.classList.remove("shake");
    void enemyEmoji.offsetWidth; // リフローでアニメ再起動
    enemyEmoji.classList.add("defeated");
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
      battleMessage.textContent = `🧚 ステータスの妖精が現れた！ ${perkPicksLeft}回も選べる！`;
      rewardTitle.textContent = `🧚 妖精のごほうび（あと${perkPicksLeft}回）`;
    } else {
      battleMessage.textContent = `🎉 ${beatenName ? beatenName + "を倒した！" : ""}ごほうびを選ぼう`;
      rewardTitle.textContent = "🎁 ごほうびを1つ選ぼう";
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
      advanceFloor(`${perk.icon} ${perk.name}を獲得！`);
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

  // 装備する。すでに着けていた装備はリュックに保管する（消滅させない）。
  function equipItem(item) {
    const old = equipment[item.slot];
    if (old) backpack.push(old);
    equipment[item.slot] = item;
    // ダメージ無効回数を付与（神核装甲など）
    if (item.fx && item.fx.immuneHits) immuneLeft += item.fx.immuneHits;
    recomputeMaxHp();
    renderEquipPanel();
  }

  function chooseEquip(item) {
    equipItem(item);
    advanceFloor(`${item.name}を装備！`);
  }

  /* --- リュック（外した装備の保管＆付け替え）--- */
  function showBackpack(returnToBattle) {
    shopReturnsToBattle = !!returnToBattle;
    battleCard.classList.add("is-hidden");
    battleReward.classList.remove("is-hidden");
    renderBackpack();
  }

  function renderBackpack() {
    rewardTitle.textContent = `🎒 リュック（保管中：${backpack.length}個）`;
    battleMessage.textContent = "装備を選ぶと付け替え（今の装備はリュックへ）";
    rewardGrid.innerHTML = "";
    if (backpack.length === 0) {
      shopSection("リュックは空です");
    } else {
      backpack.forEach((item, i) => {
        shopButton(
          SLOT_META[item.slot].icon,
          item.name,
          `【${item.rarityName}】${item.desc}`,
          false,
          () => equipFromBackpack(i),
          item.color,
        );
      });
    }
    if (shopReturnsToBattle) {
      shopButton("⚔️", "バトルに戻る", "リュックを閉じる", false, () => resumeFromShop());
    } else {
      shopButton("➡️", "次の階へ進む", "リュックを閉じる", false, () => advanceFloor("リュックを閉じた！"));
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
    battleMessage.textContent = `🎉 ${beatenName}を倒した！武器ガチャを引こう`;
    renderGacha(null);
  }

  function renderGacha(result) {
    rewardTitle.textContent = `🎰 武器ガチャ　🪙 ${coins}`;
    rewardGrid.innerHTML = "";
    if (result) {
      const card = document.createElement("button");
      card.className = "reward-card gacha-result";
      card.disabled = true;
      card.style.borderColor = result.color;
      card.innerHTML =
        `<span class="reward-icon">⚔️</span>` +
        `<span class="reward-name" style="color:${result.color}">${result.name}</span>` +
        `<span class="reward-desc">【${result.rarityName}】${result.desc}</span>`;
      rewardGrid.appendChild(card);
    }
    shopButton("🎰", "ガチャを引く", `🪙${GACHA_COST}・レア以上の武器`, coins < GACHA_COST, () => pullGacha());
    shopButton("➡️", "次の階へ進む", "ガチャを終える", false, () => advanceFloor("ガチャ終了！"));
    updateBars();
  }

  function pullGacha() {
    if (coins < GACHA_COST) return;
    coins -= GACHA_COST;
    const rarity = rollGachaRarity();
    // ミシックは全スロットが対象、それ以外は武器のみ
    const candidates =
      rarity === "mythic"
        ? EQUIPMENT.filter((e) => e.rarity === "mythic")
        : EQUIPMENT.filter((e) => e.slot === "weapon" && e.rarity === rarity);
    const tmpl = randomOf(candidates);
    const info = rarityInfo(rarity);
    const item = {
      slot: tmpl.slot,
      name: tmpl.name,
      desc: tmpl.desc,
      fx: tmpl.fx,
      rarity,
      rarityName: info.name,
      color: info.color,
    };
    equipItem(item); // 装備（外した装備はリュックへ）
    updateCoinDisplay();
    const flair =
      rarity === "mythic"
        ? "🌟ミシック🌟 "
        : rarity === "legendary"
          ? "✨レジェンダリー✨ "
          : rarity === "epic"
            ? "💜エピック "
            : "💙レア ";
    battleMessage.textContent = `${flair}「${item.name}」を入手して装備！`;
    renderGacha(item);
  }

  /* --- ショップ（コインで購入） --- */
  const SHOP_PRICE = { common: 15, uncommon: 35, rare: 80, epic: 180, legendary: 450 };
  let shopStock = [];
  let shopReturnsToBattle = false;

  function generateShopStock() {
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
    battleMessage.textContent = "クイズに正解して攻撃しよう！";
    updateBars();
    battleInput.focus();
  }

  // 「ショップ」「リュック」ボタン（バトル中いつでも）
  const openShopBtn = document.getElementById("open-shop");
  if (openShopBtn) openShopBtn.addEventListener("click", () => showShop(true));
  const openBackpackBtn = document.getElementById("open-backpack");
  if (openBackpackBtn) openBackpackBtn.addEventListener("click", () => showBackpack(true));

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
  const STAT_UPGRADES = [
    { icon: "⚔️", name: "攻撃 +15", price: 30, apply: () => (bonusAtk += 15) },
    { icon: "🔥", name: "攻撃 +40", price: 70, apply: () => (bonusAtk += 40) },
    { icon: "❤️", name: "最大HP +50", price: 30, apply: () => (perkMaxHpBonus += 50) },
    { icon: "💥", name: "会心 +5%", price: 40, apply: () => (bonusCrit += 0.05) },
    { icon: "🩸", name: "吸収 +3", price: 35, apply: () => (lifesteal += 3) },
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
    if (shopReturnsToBattle) {
      shopButton("⚔️", "バトルに戻る", "ショップを閉じる", false, () => resumeFromShop());
    } else {
      shopButton("➡️", "次の階へ進む", "ショップを出る", false, () => advanceFloor("ショップを出た！"));
    }
    updateBars();
  }

  function buyEquip(i) {
    const stock = shopStock[i];
    if (!stock || stock.bought || coins < stock.price) return;
    coins -= stock.price;
    stock.bought = true;
    equipItem(stock.item); // 外した装備はリュックへ
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
    generateShopStock();
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
        cell.dataset.tip = `${item.name}（${item.rarityName}）\n${item.desc}`;
        cell.innerHTML =
          `<span class="equip-icon">${slot.icon}</span>` +
          `<span class="equip-val" style="color:${item.color}">${shortTag(item)}</span>`;
      } else {
        cell.dataset.tip = `${slot.name}：未装備`;
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
    shopStock = []; // 階が変わったら次のショップは新しい在庫に
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
    beginFloorEnemies();
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
