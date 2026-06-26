/**
 * 装備カタログ（英熟語バトルのローグライク用）
 *
 * 各装備: { slot, name, rarity, desc, fx }
 *   slot   ... "weapon" | "head" | "body" | "legs" | "shoes"
 *   rarity ... "common" | "uncommon" | "rare" | "epic" | "legendary"
 *   desc   ... 画面に出す効果の説明
 *   fx     ... 効果（app.js の効果エンジンが解釈する）
 *
 * fx で使えるキー（読み替え: 「レベルアップ」＝階を進む / 「ターン」＝1問）:
 *   atk, def, maxHp, crit        ... 常時加算ステータス（マイナス可。crit は割合 0.05=5%）
 *   killAtk/killDef/killMaxHp/killAll/killHeal ... 敵撃破ごとに加算/回復
 *   killHealPct, killMaxHpPct    ... 撃破ごとに最大HPの割合で回復/最大HP増加
 *   floorAtk/floorDef/floorMaxHp/floorAll ... 階を進むごとに加算
 *   lowHpAtk:{th,pct}            ... 自分HPが th 以下で攻撃 ×(1+pct)
 *   scalingLowHpAtk: maxPct      ... HPが低いほど攻撃up（最大 +maxPct）
 *   bossAtk: pct                 ... ボスへ攻撃 ×(1+pct)
 *   lowEnemyAtk:{th,pct}         ... 敵HPが th 以下で攻撃 ×(1+pct)
 *   convDefToAtk/convAtkToDef/convDefToHp/convCurHpToAtk ... 変換（割合）
 *   damageReducePct              ... 被ダメージ割合減
 *   damageReduceLowHp:{th,pct}   ... 自分HP th 以下で被ダメージ pct 減
 *   dodge                        ... 反撃を回避する確率
 *   reflect                      ... 被ダメージの割合を敵に反射
 *   revive: pct                  ... 死亡時1度だけ最大HPの pct で復活
 *   extraHit: true               ... 攻撃が2回判定
 *   instakill: pct               ... 確率で敵を即死
 *   execute: th                  ... 敵HPが th 以下なら即死
 *   damageToAtkPct               ... 与ダメージの割合を永続的に攻撃へ加算
 */
const EQUIPMENT = [
  // ===== コモン（基本ステータス）=====
  { slot: "weapon", name: "鉄の剣", rarity: "common", desc: "攻撃 +10", fx: { atk: 10 } },
  { slot: "weapon", name: "重い剣", rarity: "common", desc: "攻撃 +15", fx: { atk: 15 } },
  { slot: "head", name: "革の帽子", rarity: "common", desc: "最大HP +30", fx: { maxHp: 30 } },
  { slot: "head", name: "鉄兜", rarity: "common", desc: "防御 +10", fx: { def: 10 } },
  { slot: "body", name: "厚革の鎧", rarity: "common", desc: "最大HP +50", fx: { maxHp: 50 } },
  { slot: "body", name: "鉄の鎧", rarity: "common", desc: "防御 +15", fx: { def: 15 } },
  { slot: "legs", name: "作業ズボン", rarity: "common", desc: "最大HP +20", fx: { maxHp: 20 } },
  { slot: "legs", name: "鉄脚甲", rarity: "common", desc: "防御 +10", fx: { def: 10 } },
  { slot: "shoes", name: "革靴", rarity: "common", desc: "最大HP +15", fx: { maxHp: 15 } },
  { slot: "shoes", name: "軍靴", rarity: "common", desc: "防御 +5", fx: { def: 5 } },

  // ===== アンコモン =====
  { slot: "weapon", name: "狂戦士の剣", rarity: "uncommon", desc: "HP半分以下で攻撃+50%", fx: { lowHpAtk: { th: 0.5, pct: 0.5 } } },
  { slot: "weapon", name: "守護者の剣", rarity: "uncommon", desc: "防御の20%を攻撃に変換", fx: { convDefToAtk: 0.2 } },
  { slot: "weapon", name: "成長の剣", rarity: "uncommon", desc: "階を進むごとに攻撃+10", fx: { floorAtk: 10 } },
  { slot: "head", name: "狼王の冠", rarity: "uncommon", desc: "最大HP +100", fx: { maxHp: 100 } },
  { slot: "head", name: "鉄壁の兜", rarity: "uncommon", desc: "防御 +30", fx: { def: 30 } },
  { slot: "body", name: "闘士の鎧", rarity: "uncommon", desc: "攻撃 +20", fx: { atk: 20 } },
  { slot: "body", name: "不死者の鎧", rarity: "uncommon", desc: "最大HP +150", fx: { maxHp: 150 } },
  { slot: "legs", name: "成長の脚衣", rarity: "uncommon", desc: "階を進むごとに最大HP+30", fx: { floorMaxHp: 30 } },
  { slot: "legs", name: "重騎士の脚甲", rarity: "uncommon", desc: "防御 +25", fx: { def: 25 } },
  { slot: "shoes", name: "守護者の軍靴", rarity: "uncommon", desc: "防御 +20", fx: { def: 20 } },

  // ===== レア =====
  { slot: "weapon", name: "首狩りの大剣", rarity: "rare", desc: "HP半分以下の敵へ攻撃+100%", fx: { lowEnemyAtk: { th: 0.5, pct: 1.0 } } },
  { slot: "weapon", name: "魂喰いの剣", rarity: "rare", desc: "敵撃破ごとに攻撃+5", fx: { killAtk: 5 } },
  { slot: "weapon", name: "修羅刀", rarity: "rare", desc: "HPが低いほど攻撃上昇(最大+200%)", fx: { scalingLowHpAtk: 2.0 } },
  { slot: "head", name: "英雄王の冠", rarity: "rare", desc: "階を進むごとに全能力+3", fx: { floorAll: 3 } },
  { slot: "head", name: "死神の仮面", rarity: "rare", desc: "攻撃+80 / 最大HP-100", fx: { atk: 80, maxHp: -100 } },
  { slot: "body", name: "吸血鬼の外套", rarity: "rare", desc: "最大HP+300 / 防御-20", fx: { maxHp: 300, def: -20 } },
  { slot: "body", name: "修羅の鎧", rarity: "rare", desc: "HP半分以下で攻撃+100%", fx: { lowHpAtk: { th: 0.5, pct: 1.0 } } },
  { slot: "legs", name: "冥王の脚甲", rarity: "rare", desc: "敵撃破ごとにHP+10", fx: { killHeal: 10 } },
  { slot: "legs", name: "英雄の脚衣", rarity: "rare", desc: "階を進むごとに防御+5", fx: { floorDef: 5 } },
  { slot: "shoes", name: "王の軍靴", rarity: "rare", desc: "全能力+15", fx: { atk: 15, def: 15, maxHp: 15 } },

  // ===== エピック =====
  { slot: "weapon", name: "奈落の大剣", rarity: "epic", desc: "攻撃 +200", fx: { atk: 200 } },
  { slot: "weapon", name: "魂喰らい", rarity: "epic", desc: "敵撃破ごとに攻撃+15(上限なし)", fx: { killAtk: 15 } },
  { slot: "weapon", name: "断罪の剣", rarity: "epic", desc: "ボスへ攻撃+300%", fx: { bossAtk: 3.0 } },
  { slot: "weapon", name: "破軍の剣", rarity: "epic", desc: "現在HPの20%を攻撃に変換", fx: { convCurHpToAtk: 0.2 } },
  { slot: "head", name: "不滅の王冠", rarity: "epic", desc: "最大HP +500", fx: { maxHp: 500 } },
  { slot: "head", name: "暴君の冠", rarity: "epic", desc: "攻撃+300 / 防御-50", fx: { atk: 300, def: -50 } },
  { slot: "body", name: "深淵の胸甲", rarity: "epic", desc: "防御+100 / 最大HP+300", fx: { def: 100, maxHp: 300 } },
  { slot: "body", name: "征服王の鎧", rarity: "epic", desc: "敵撃破ごとに全能力+2", fx: { killAll: 2 } },
  { slot: "legs", name: "巨人の脚衣", rarity: "epic", desc: "最大HP +500", fx: { maxHp: 500 } },
  { slot: "legs", name: "終焉脚甲", rarity: "epic", desc: "敵撃破ごとに攻撃+10", fx: { killAtk: 10 } },
  { slot: "shoes", name: "鉄城の軍靴", rarity: "epic", desc: "防御 +100", fx: { def: 100 } },

  // ===== レジェンダリー =====
  { slot: "weapon", name: "徳川家康の太刀", rarity: "legendary", desc: "階を進むごとに攻撃+20(上限なし)", fx: { floorAtk: 20 } },
  { slot: "weapon", name: "宮本武蔵の木刀", rarity: "legendary", desc: "攻撃が2回判定される", fx: { extraHit: true } },
  { slot: "weapon", name: "因果律の剣", rarity: "legendary", desc: "与ダメージの1%を永続的に攻撃へ", fx: { damageToAtkPct: 0.01 } },
  { slot: "weapon", name: "終焉の大鎌", rarity: "legendary", desc: "HP30%以下の敵を即死", fx: { execute: 0.3 } },
  { slot: "weapon", name: "神殺しの刃", rarity: "legendary", desc: "ボスへの攻撃力+10000%", fx: { bossAtk: 100 } },
  { slot: "weapon", name: "巨人殺しの剣", rarity: "legendary", desc: "防御の100%を攻撃に変換", fx: { convDefToAtk: 1.0 } },
  { slot: "weapon", name: "血月の剣", rarity: "legendary", desc: "敵撃破でHP30%回復", fx: { killHealPct: 0.3 } },
  { slot: "head", name: "世界喰らいの王冠", rarity: "legendary", desc: "敵撃破ごとに最大HP+30%", fx: { killMaxHpPct: 0.3 } },
  { slot: "head", name: "真田幸村の六文銭兜", rarity: "legendary", desc: "HP30%以下で攻撃+300%", fx: { lowHpAtk: { th: 0.3, pct: 3.0 } } },
  { slot: "head", name: "ナポレオンの帽子", rarity: "legendary", desc: "5%で相手を即死", fx: { instakill: 0.05 } },
  { slot: "head", name: "世界樹の冠", rarity: "legendary", desc: "防御の300%を最大HPに変換", fx: { convDefToHp: 3.0 } },
  { slot: "body", name: "創世神鎧", rarity: "legendary", desc: "最大HP+1000 / 防御+200", fx: { maxHp: 1000, def: 200 } },
  { slot: "body", name: "ラスプーチンの法衣", rarity: "legendary", desc: "死亡時1度だけHP50%で復活", fx: { revive: 0.5 } },
  { slot: "body", name: "トゲトゲすぎる胸甲", rarity: "legendary", desc: "被ダメージの60%を反射", fx: { reflect: 0.6 } },
  { slot: "body", name: "要塞の鎧", rarity: "legendary", desc: "攻撃の50%を防御に変換", fx: { convAtkToDef: 0.5 } },
  { slot: "legs", name: "終焉の脚甲・極", rarity: "legendary", desc: "敵撃破ごとに攻撃+30", fx: { killAtk: 30 } },
  { slot: "shoes", name: "神速の軍靴", rarity: "legendary", desc: "攻撃+150 / 防御+150", fx: { atk: 150, def: 150 } },
  { slot: "shoes", name: "源義経の草履", rarity: "legendary", desc: "50%で敵の反撃を回避", fx: { dodge: 0.5 } },
  { slot: "shoes", name: "チンギス・ハンの騎馬靴", rarity: "legendary", desc: "25%で相手を即死", fx: { instakill: 0.25 } },

  // ===== 高HP対策の強力な武器（割合ダメージ・処刑・即死・ボス特効）=====
  { slot: "weapon", name: "削岩の刃", rarity: "epic", desc: "敵の最大HPの3%を追加ダメージ", fx: { enemyMaxHpPct: 0.03, atk: 60 } },
  { slot: "weapon", name: "山割りの大剣", rarity: "epic", desc: "敵の最大HPの5%を追加ダメージ", fx: { enemyMaxHpPct: 0.05 } },
  { slot: "weapon", name: "竜殺しの剣", rarity: "epic", desc: "ボスへの攻撃力+5000%", fx: { bossAtk: 50 } },
  { slot: "weapon", name: "終滅の大鎌", rarity: "legendary", desc: "敵の最大HPの10%を追加ダメージ", fx: { enemyMaxHpPct: 0.1 } },
  { slot: "weapon", name: "天穿つ一閃", rarity: "legendary", desc: "敵の最大HPの15%を追加ダメージ", fx: { enemyMaxHpPct: 0.15 } },
  { slot: "weapon", name: "神殺しの槍", rarity: "legendary", desc: "ボスへの攻撃力+20000%", fx: { bossAtk: 200 } },
  { slot: "weapon", name: "処刑人の斧", rarity: "legendary", desc: "HP50%以下の敵を即死", fx: { execute: 0.5 } },
  { slot: "weapon", name: "断罪の処刑剣", rarity: "legendary", desc: "HP60%以下の敵を即死", fx: { execute: 0.6 } },
  { slot: "weapon", name: "運命の天秤", rarity: "legendary", desc: "40%で相手を即死", fx: { instakill: 0.4 } },
  { slot: "weapon", name: "終焉の宣告", rarity: "legendary", desc: "敵の最大HPの8%＋HP40%以下で即死", fx: { enemyMaxHpPct: 0.08, execute: 0.4 } },
  { slot: "weapon", name: "真・因果律の剣", rarity: "legendary", desc: "与ダメージの5%を永続的に攻撃へ", fx: { damageToAtkPct: 0.05 } },
  { slot: "weapon", name: "世界喰らいの剣", rarity: "legendary", desc: "敵の最大HPの6%＋撃破で攻撃+50", fx: { enemyMaxHpPct: 0.06, killAtk: 50 } },
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EQUIPMENT };
}
