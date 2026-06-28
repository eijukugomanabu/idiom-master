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
  const damageStats = document.getElementById("damage-stats");

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
  let maxAttackDamage = Number(localStorage.getItem("idiomMaxDamage")) || 0; // 過去最高ダメージ（保存）
  let peakTier = 0; // この戦闘で到達したダメージ演出の最大ランク
  let enemyHp = 0;
  let enemyMaxHp = 0;
  let currentEnemy = null;
  let battleIdiom = null;
  let answerPeekOn = false; // テストモード：答えをのぞき見表示中か

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
  // 巨大数を日本語の単位（万・億・兆・京…無量大数）で短く表示する
  const BIG_UNITS = [
    [1e68, "無量大数"], [1e64, "不可思議"], [1e60, "那由他"], [1e56, "阿僧祇"],
    [1e52, "恒河沙"], [1e48, "極"], [1e44, "載"], [1e40, "正"], [1e36, "澗"],
    [1e32, "溝"], [1e28, "穣"], [1e24, "𥝱"], [1e20, "垓"], [1e16, "京"],
  ];
  function formatNum(n) {
    if (!isFinite(n)) return "∞";
    n = Math.round(n);
    const abs = Math.abs(n);
    if (abs < 1e16) return n.toLocaleString("en-US"); // 1京未満は今まで通りカンマ区切り
    if (abs >= 1e72) return n.toExponential(2); // 無量大数を超えたら指数表記
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
    if (enemyIsBoss && hasFx("bossDigitsCrit")) m *= 1000;
    return m;
  }
  // 最大HPを再計算（基本＋パーク＋装備＋累積＋変換＋乗算）。増えた分は回復する。
  function recomputeMaxHp() {
    let m = BASE_MAX_HP + perkMaxHpBonus + sumFx("maxHp") + bonusMaxHp;
    m += baseDef() * sumFx("convDefToHp");
    m += baseAtk() * sumFx("convAtkToHp"); // 天界守護脚甲：攻撃力をHPにも加算
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
    causalAtk = 0;
    bombStore = 0;
    lastAttackDamage = 0;
    peakTier = 0;
    document.body.classList.remove("combo-hot-1", "combo-hot-2", "combo-hot-3");
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
    // 20階ごとに敵の数が増える（最大 +4体）
    const extra = Math.min(4, Math.floor(floor / 20));
    enemiesRemaining = isBossFloor ? 1 : randInt(1 + extra, 3 + extra);
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
    renderAnswerPeek(); // 答え表示中なら新しい問題の答えに更新
  }

  /* --- テストモード：答えをのぞき見＆ワンタップでコピー＆入力 --- */
  const peekBtn = document.getElementById("peek-answer");
  const answerChip = document.getElementById("answer-chip");
  const peekFeedback = document.getElementById("peek-feedback");

  function renderAnswerPeek() {
    if (!answerChip) return;
    if (answerPeekOn && battleIdiom) {
      answerChip.textContent = `📋 ${battleIdiom.phrase}`;
      answerChip.classList.remove("is-hidden");
      if (peekBtn) peekBtn.textContent = "🙈 答えをかくす";
    } else {
      answerChip.classList.add("is-hidden");
      if (peekFeedback) peekFeedback.classList.add("is-hidden");
      if (peekBtn) peekBtn.textContent = "🔑 答えを見る";
    }
  }

  // クリップボードにコピー（失敗時はテキストエリア経由でフォールバック）
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        return;
      }
    } catch (e) {}
    fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  function flashPeekFeedback() {
    if (!peekFeedback) return;
    peekFeedback.classList.remove("is-hidden");
    clearTimeout(flashPeekFeedback._t);
    flashPeekFeedback._t = setTimeout(() => peekFeedback.classList.add("is-hidden"), 1500);
  }

  if (peekBtn) {
    peekBtn.addEventListener("click", () => {
      answerPeekOn = !answerPeekOn;
      renderAnswerPeek();
    });
  }
  if (answerChip) {
    // タップで答えをコピー＆入力欄へ自動入力（すぐ攻撃できる）
    answerChip.addEventListener("click", () => {
      if (!battleIdiom) return;
      copyText(battleIdiom.phrase);
      battleInput.value = battleIdiom.phrase;
      battleInput.focus();
      flashPeekFeedback();
    });
  }

  function updateBars() {
    enemyHpFill.style.width = Math.max(0, (enemyHp / enemyMaxHp) * 100) + "%";
    enemyHpText.textContent = `${Math.max(0, enemyHp)} / ${enemyMaxHp}`;
    playerHpFill.style.width = Math.max(0, (playerHp / playerMaxHp) * 100) + "%";
    playerHpText.textContent = `${formatNum(Math.max(0, playerHp))} / ${formatNum(playerMaxHp)}`;
    renderStats();
    updateBombButton();
  }

  // 今の自分のステータス（攻撃/防御/最大HP/会心）を表示
  function renderStats() {
    if (!playerStats) return;
    playerStats.innerHTML =
      `<span title="攻撃力">⚔️ ${formatNum(effAttack())}</span>` +
      `<span title="防御力">🛡️ ${formatNum(effDefense())}</span>` +
      `<span title="最大HP">❤️ ${formatNum(playerMaxHp)}</span>` +
      `<span title="会心率">💥 ${Math.round(critTotal() * 100)}%</span>`;
    if (damageStats) {
      damageStats.innerHTML =
        `<span title="直近の攻撃で与えたダメージ">💢 攻撃 ${formatNum(lastAttackDamage)}</span>` +
        `<span title="今までに出した最大ダメージ">🏆 最大 ${formatNum(maxAttackDamage)}</span>`;
    }
  }

  // ダメージ記録を更新する（直近ダメージ＋過去最高を保存）
  function recordDamage(d) {
    if (!(d > 0)) return;
    lastAttackDamage = d;
    if (d > maxAttackDamage) {
      maxAttackDamage = d;
      try { localStorage.setItem("idiomMaxDamage", String(maxAttackDamage)); } catch (e) {}
    }
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
    3: "GREAT!!", 4: "EXCELLENT!!", 5: "INSANE!!!", 6: "GODLIKE!!!", 7: "💥脳が溶ける💥",
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
      comboBadge.textContent = `🔥 ${combo} コンボ`;
      comboBadge.classList.remove("fx-combo-pop");
      void comboBadge.offsetWidth;
      comboBadge.classList.add("fx-combo-pop");
    } else {
      comboBadge.classList.add("is-hidden");
    }
    // コンボが伸びるほど画面全体が熱くなる（縁が脈打つ）
    const ct = combo >= 15 ? 3 : combo >= 8 ? 2 : combo >= 4 ? 1 : 0;
    document.body.classList.toggle("combo-hot-1", ct === 1);
    document.body.classList.toggle("combo-hot-2", ct === 2);
    document.body.classList.toggle("combo-hot-3", ct >= 3);
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
    hits = Math.max(hits, maxFx("hitCount")); // 宮本武蔵の木刀：固定の多段攻撃

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

    const flair =
      (combo >= 2 ? `🔥${combo}コンボ ` : "") + (crit ? "💥会心！ " : "") + (hits > 1 ? `${hits}回攻撃！ ` : "");
    battleMessage.textContent = note
      ? `${note}「${phrase}」で敵を倒した！`
      : `⚔️ ${flair}「${phrase}」で ${formatNum(dealt)} のダメージ！`;
    updateBars();
    shakeEnemy();
    showDamage(dealt > 0 ? dealt : "⚡", crit);
    juiceHit(crit, dealt);
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
    if (hasFx("killHealEnemyMaxHp")) heal = clampNum(heal + enemyMaxHp); // 血月の剣：撃破した敵のHPを丸ごと回復
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
          enemyHp = clampNum(enemyHp - splashDamage); // 0以下まで削れる（1で止めない）
          splashDamage = 0;
          if (before > enemyHp) {
            const dealtSplash = before - Math.max(0, enemyHp);
            showDamage(clampNum(dealtSplash), false);
            // 範囲ダメージで次の敵も倒した → 連鎖撃破
            if (enemyHp <= 0) {
              battleMessage.textContent = `🌪️ 範囲ダメージで ${currentEnemy.name} も撃破！`;
              updateBars();
              onEnemyDefeated();
              return;
            }
            splashNote = ` 🌪️範囲ダメージ ${formatNum(dealtSplash)}！`;
          }
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
    advanceFloor(`${item.name}を装備！`);
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
    const tabs = [{ id: "all", icon: "📦", name: "全部" }].concat(
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
    rewardTitle.textContent = `🎒 リュック（保管中：${backpack.length}個）`;
    battleMessage.textContent = "装備中をタップで外す／リュックの装備をタップで付け替え";
    rewardGrid.innerHTML = "";

    // 振り分け（スロット別フィルタ）
    renderBackpackFilter();

    // 装備中（タップで外せる）
    const equippedNow = SLOTS.filter((s) => equipment[s.id]);
    if (equippedNow.length) {
      shopSection("🧷 装備中（タップで外す）");
      equippedNow.forEach((s) => {
        const it = equipment[s.id];
        shopButton(s.icon, it.name, `【${it.rarityName}】タップで外す`, false, () => unequip(s.id), it.color);
      });
    }

    // リュックの中身：スロットごと → レア度の高い順に並べる
    if (backpack.length === 0) {
      shopSection("リュックは空です");
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
        shopSection(`${slot.icon} ${slot.name}（${inSlot.length}）`);
        inSlot.forEach(({ item, idx }) => {
          shopButton(
            SLOT_META[item.slot].icon,
            item.name,
            `【${item.rarityName}】${item.desc}`,
            false,
            () => equipFromBackpack(idx),
            item.color,
          );
        });
      });
      if (shown === 0) shopSection("この種類の装備はありません");
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
    battleMessage.textContent = `🎉 ${beatenName}を倒した！武器ガチャを引こう`;
    renderGacha(null);
  }

  const GACHA_MAX_PULLS = 100; // 「最大」で一度に引ける上限
  function renderGacha(results) {
    rewardTitle.textContent = `🎰 武器ガチャ　🪙 ${formatNum(coins)}`;
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
        s.innerHTML = `${results.length}連の結果：${summary}`;
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
            `<span class="reward-desc">【${result.rarityName}】${result.desc}</span>`;
          rewardGrid.appendChild(card);
        });
    }

    // コインに応じて引く回数を選べる
    shopSection(`🎰 何回引く？（1回 🪙${GACHA_COST}）`);
    shopButton("🎰", "1回を引く", `🪙${GACHA_COST}`, coins < GACHA_COST, () => pullGachaMany(1));
    shopButton("🔟", "10回を引く", `🪙${formatNum(GACHA_COST * 10)}`, coins < GACHA_COST * 10, () => pullGachaMany(10));
    const maxN = Math.min(GACHA_MAX_PULLS, Math.floor(coins / GACHA_COST));
    if (maxN >= 1) {
      shopButton("💎", `最大 ${maxN}回を引く`, `🪙${formatNum(GACHA_COST * maxN)}`, false, () => pullGachaMany(maxN));
    }
    shopButton("➡️", "次の階へ進む", "ガチャを終える", false, () => advanceFloor("ガチャ終了！"));
    updateBars();
  }

  // 指定レア度の装備を1つ作る
  function makeGachaItem(rarity) {
    const candidates =
      rarity === "mythic"
        ? EQUIPMENT.filter((e) => e.rarity === "mythic")
        : EQUIPMENT.filter((e) => e.slot === "weapon" && e.rarity === rarity);
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
    battleMessage.textContent = "🎰 ガチャ抽選中…";
    playGachaReveal(results, () => {
      const best = results.reduce((a, b) => (rarityRank(b.rarity) > rarityRank(a.rarity) ? b : a), results[0]);
      const r = rarityRank(best.rarity);
      const flair = r >= 5 ? "🌟ミシック🌟" : r === 4 ? "✨レジェンダリー✨" : r === 3 ? "💜エピック" : "🎉";
      battleMessage.textContent =
        count > 1 ? `${flair} ${count}連ガチャ！🎒リュックに入れたよ` : `${flair}「${best.name}」をゲット！🎒リュックへ`;
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
        rank >= 5 ? "🌟 ミシック 降臨 🌟" : rank === 4 ? "✨ レジェンダリー ✨" : `${rarityInfo(best.rarity).name} GET!`;
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

  // 「💣 爆弾を放出」ボタン（チンギスの騎馬靴を装備中のみ表示）
  const detonateBtn = document.getElementById("detonate-bomb");
  if (detonateBtn) detonateBtn.addEventListener("click", detonateBomb);
  function updateBombButton() {
    if (!detonateBtn) return;
    if (hasFx("bombStorePct")) {
      detonateBtn.classList.remove("is-hidden");
      detonateBtn.textContent = `💣 爆弾を放出（${formatNum(bombStore)}）`;
      detonateBtn.disabled = bombStore <= 0;
    } else {
      detonateBtn.classList.add("is-hidden");
    }
  }
  function detonateBomb() {
    if (bombStore <= 0 || enemyHp <= 0 || battleInput.disabled) return;
    const dmg = bombStore;
    bombStore = 0;
    enemyHp = clampNum(enemyHp - dmg);
    recordDamage(dmg); // 爆弾ダメージも記録
    showDamage(dmg, true);
    shakeEnemy();
    battleMessage.textContent = `💥 爆弾炸裂！ ${formatNum(dmg)} のダメージ！`;
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

    // 装備を売る（装備中＋リュックの中身）
    const equipped = SLOTS.filter((s) => equipment[s.id]);
    if (equipped.length || backpack.length) {
      shopSection("💰 装備を売る");
      equipped.forEach((s) => {
        const it = equipment[s.id];
        shopButton(s.icon, it.name, `装備中・売る 🪙+${sellValue(it)}`, false, () => sellEquip(s.id), it.color);
      });
      // リュックの中身はレア度順で並べて売れるように
      backpack
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity))
        .forEach(({ item, idx }) => {
          shopButton(
            SLOT_META[item.slot].icon,
            item.name,
            `🎒リュック・売る 🪙+${sellValue(item)}`,
            false,
            () => sellFromBackpack(idx),
            item.color,
          );
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
    backpack.push(stock.item); // 自動装備せずリュックへ（リュックから付け替え）
    battleMessage.textContent = `🛒 「${stock.item.name}」を購入！🎒リュックに入れたよ`;
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

  // リュックの装備を売ってコインにする
  function sellFromBackpack(i) {
    const it = backpack[i];
    if (!it) return;
    coins += sellValue(it);
    backpack.splice(i, 1);
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
