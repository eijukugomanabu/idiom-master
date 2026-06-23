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

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle("is-hidden", key !== name);
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
    btn.addEventListener("click", () => selectLevel(level));
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
    btn.addEventListener("click", () => enterMode(btn.dataset.go));
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
    if (isCorrect(quizInput.value, card.phrase)) {
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

  // 装備スロット（各スロットは1つのステータスを強化する）
  const SLOTS = [
    { id: "weapon", icon: "⚔️", name: "剣", stat: "attack" },
    { id: "head", icon: "🪖", name: "兜", stat: "defense" },
    { id: "body", icon: "👕", name: "鎧", stat: "maxHp" },
    { id: "legs", icon: "👖", name: "ズボン", stat: "maxHp" },
    { id: "shoes", icon: "👟", name: "靴", stat: "crit" },
  ];
  // スロットごとの基準値（レア度倍率を掛けて最終値にする）
  const SLOT_BASE = { weapon: 4, head: 2, body: 12, legs: 8, shoes: 0.03 };
  // レア度（5段階。高いほど効果が大きい）
  const RARITIES = [
    { id: "common", name: "コモン", color: "#94a3b8", mult: 1 },
    { id: "uncommon", name: "アンコモン", color: "#4ade80", mult: 1.7 },
    { id: "rare", name: "レア", color: "#38bdf8", mult: 2.5 },
    { id: "epic", name: "エピック", color: "#a78bfa", mult: 3.5 },
    { id: "legendary", name: "レジェンダリー", color: "#fbbf24", mult: 5 },
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

  let pool = [];
  let playerHp = BASE_MAX_HP;
  let playerMaxHp = BASE_MAX_HP;
  let floor = 1;
  let defeated = 0;
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

  // 装備の合計ステータス
  function sumEquip(stat) {
    let total = 0;
    for (const id in equipment) {
      const it = equipment[id];
      if (it && it.stat === stat) total += it.value;
    }
    return total;
  }
  function effAttack() {
    return attackBonus + sumEquip("attack");
  }
  function effDefense() {
    return damageReduction + sumEquip("defense");
  }
  function effCrit() {
    return critChance + sumEquip("crit");
  }
  // 最大HP（基本＋パーク＋装備）を再計算し、増えた分は回復する
  function recomputeMaxHp() {
    const newMax = BASE_MAX_HP + perkMaxHpBonus + sumEquip("maxHp");
    const delta = newMax - playerMaxHp;
    playerMaxHp = newMax;
    if (delta > 0) playerHp = Math.min(playerMaxHp, playerHp + delta);
    else playerHp = Math.min(playerHp, playerMaxHp);
  }

  function startBattle() {
    pool = filterByLevel(IDIOMS, currentLevel);
    floor = 1;
    defeated = 0;
    attackBonus = 0;
    critChance = 0;
    damageReduction = 0;
    lifesteal = 0;
    perkMaxHpBonus = 0;
    for (const id in equipment) equipment[id] = null;
    playerMaxHp = BASE_MAX_HP;
    playerHp = BASE_MAX_HP;
    battleOver.classList.add("is-hidden");
    battleReward.classList.add("is-hidden");
    battleCard.classList.remove("is-hidden");
    battleMessage.textContent = "クイズに正解して攻撃しよう！";
    renderEquipPanel();
    spawnEnemy();
    nextBattleQuestion();
    updateBars();
  }

  function spawnEnemy() {
    const isFinal = floor >= MAX_FLOOR;
    const isBoss = floor % 10 === 0;
    currentEnemy = isFinal ? FINAL_BOSS : isBoss ? BOSS : randomOf(ENEMIES);
    const base = isFinal ? 140 : isBoss ? 70 : 22;
    enemyMaxHp = Math.round((base + floor * 6) * (isBoss || isFinal ? 1.4 : 1));
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

  battleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (battleInput.disabled) return;
    if (isCorrect(battleInput.value, battleIdiom.phrase)) {
      let dmg = randInt(16, 24) + effAttack();
      const crit = Math.random() < effCrit();
      if (crit) dmg *= 2;
      enemyHp -= dmg;
      if (lifesteal > 0) playerHp = Math.min(playerMaxHp, playerHp + lifesteal);
      const critText = crit ? "💥会心の一撃！ " : "";
      battleMessage.textContent = `⚔️ ${critText}正解！「${battleIdiom.phrase}」で ${dmg} のダメージ！`;
      updateBars();
      if (enemyHp <= 0) {
        onEnemyDefeated();
      } else {
        nextBattleQuestion();
      }
    } else {
      const dmg = Math.max(1, 8 + floor - effDefense());
      playerHp -= dmg;
      battleMessage.textContent = `❌ 正解は「${battleIdiom.phrase}」。${currentEnemy.name}の反撃で ${dmg} のダメージ！`;
      updateBars();
      if (playerHp <= 0) {
        onGameOver();
      } else {
        nextBattleQuestion();
      }
    }
  });

  function onEnemyDefeated() {
    defeated++;
    const beatenName = currentEnemy.name;
    battleInput.disabled = true;
    if (floor >= MAX_FLOOR) {
      onGameClear();
    } else if (floor % 5 === 0) {
      showTreasure(beatenName); // 5階ごとは宝箱（装備）
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
    const slot = randomOf(SLOTS);
    const rarity = RARITIES[rollRarityIndex()];
    const base = SLOT_BASE[slot.id];
    const value =
      slot.stat === "crit"
        ? Math.round(base * rarity.mult * 100) / 100
        : Math.round(base * rarity.mult);
    return {
      slot: slot.id,
      slotIcon: slot.icon,
      slotName: slot.name,
      stat: slot.stat,
      value,
      rarityName: rarity.name,
      color: rarity.color,
    };
  }

  function statLabel(item) {
    if (item.stat === "attack") return `攻撃 +${item.value}`;
    if (item.stat === "defense") return `防御 +${item.value}`;
    if (item.stat === "maxHp") return `最大HP +${item.value}`;
    if (item.stat === "crit") return `会心 +${Math.round(item.value * 100)}%`;
    return "";
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
        `<span class="reward-icon">${item.slotIcon}</span>` +
        `<span class="reward-name" style="color:${item.color}">${item.rarityName}の${item.slotName}</span>` +
        `<span class="reward-desc">${statLabel(item)}</span>`;
      btn.addEventListener("click", () => chooseEquip(item));
      rewardGrid.appendChild(btn);
    });
    updateBars();
  }

  function chooseEquip(item) {
    equipment[item.slot] = item; // 同じスロットは新しい装備に置き換わる
    recomputeMaxHp();
    renderEquipPanel();
    advanceFloor(`${item.rarityName}の${item.slotName}を装備！`);
  }

  function renderEquipPanel() {
    equipPanel.innerHTML = "";
    SLOTS.forEach((slot) => {
      const item = equipment[slot.id];
      const cell = document.createElement("div");
      cell.className = "equip-slot";
      if (item) {
        cell.style.borderColor = item.color;
        const v = item.stat === "crit" ? `${Math.round(item.value * 100)}%` : `${item.value}`;
        cell.innerHTML =
          `<span class="equip-icon">${slot.icon}</span>` +
          `<span class="equip-val" style="color:${item.color}">+${v}</span>`;
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
      `<br><br><button id="battle-restart">もう一度挑戦</button>`;
    document.getElementById("battle-restart").addEventListener("click", startBattle);
    updateBars();
  }

  /* ---------- 初期化：最初はレベル選択画面 ---------- */
  showView("level-select");
})();
