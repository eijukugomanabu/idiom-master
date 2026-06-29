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
  { slot: "weapon", name: "鉄の剣", rarity: "common", desc: "攻撃+80", fx: { atk: 80 } },
  { slot: "weapon", name: "重い剣", rarity: "common", desc: "攻撃+120", fx: { atk: 120 } },
  { slot: "head", name: "革の帽子", rarity: "common", desc: "最大HP+240", fx: { maxHp: 240 } },
  { slot: "head", name: "鉄兜", rarity: "common", desc: "防御+80", fx: { def: 80 } },
  { slot: "body", name: "厚革の鎧", rarity: "common", desc: "最大HP+400", fx: { maxHp: 400 } },
  { slot: "body", name: "鉄の鎧", rarity: "common", desc: "防御+120", fx: { def: 120 } },
  { slot: "legs", name: "作業ズボン", rarity: "common", desc: "最大HP+160", fx: { maxHp: 160 } },
  { slot: "legs", name: "鉄脚甲", rarity: "common", desc: "防御+80", fx: { def: 80 } },
  { slot: "shoes", name: "革靴", rarity: "common", desc: "最大HP+120", fx: { maxHp: 120 } },
  { slot: "shoes", name: "軍靴", rarity: "common", desc: "防御+40", fx: { def: 40 } },

  // ===== アンコモン =====
  { slot: "weapon", name: "狂戦士の剣", rarity: "uncommon", desc: "HP半分以下で攻撃+50%", fx: { lowHpAtk: { th: 0.5, pct: 0.5 } } },
  { slot: "weapon", name: "守護者の剣", rarity: "uncommon", desc: "防御の20%を攻撃に変換", fx: { convDefToAtk: 0.2 } },
  { slot: "weapon", name: "成長の剣", rarity: "uncommon", desc: "階を進むごとに攻撃+10", fx: { floorAtk: 10 } },
  { slot: "head", name: "狼王の冠", rarity: "uncommon", desc: "最大HP+800", fx: { maxHp: 800 } },
  { slot: "head", name: "鉄壁の兜", rarity: "uncommon", desc: "防御+240", fx: { def: 240 } },
  { slot: "body", name: "闘士の鎧", rarity: "uncommon", desc: "攻撃+160", fx: { atk: 160 } },
  { slot: "body", name: "不死者の鎧", rarity: "uncommon", desc: "最大HP+1200", fx: { maxHp: 1200 } },
  { slot: "legs", name: "成長の脚衣", rarity: "uncommon", desc: "階を進むごとに最大HP+30", fx: { floorMaxHp: 30 } },
  { slot: "legs", name: "重騎士の脚甲", rarity: "uncommon", desc: "防御+200", fx: { def: 200 } },
  { slot: "shoes", name: "守護者の軍靴", rarity: "uncommon", desc: "防御+160", fx: { def: 160 } },

  // ===== レア =====
  { slot: "weapon", name: "首狩りの大剣", rarity: "rare", desc: "HP半分以下の敵へ攻撃+200%", fx: { lowEnemyAtk: { th: 0.5, pct: 2.0 } } },
  { slot: "weapon", name: "魂喰いの剣", rarity: "rare", desc: "敵撃破ごとに攻撃+50", fx: { killAtk: 50 } },
  { slot: "weapon", name: "修羅刀", rarity: "rare", desc: "HPが低いほど攻撃上昇(最大+200%)", fx: { scalingLowHpAtk: 2.0 } },
  { slot: "head", name: "死神の仮面", rarity: "rare", desc: "攻撃+640 / 最大HP-80", fx: { atk: 640, maxHp: -80 } },
  { slot: "body", name: "吸血鬼の外套", rarity: "rare", desc: "防御-160 / 最大HP+2400", fx: { maxHp: 2400, def: -160 } },
  { slot: "body", name: "修羅の鎧", rarity: "rare", desc: "HP半分以下で攻撃+100%", fx: { lowHpAtk: { th: 0.5, pct: 1.0 } } },
  { slot: "legs", name: "冥王の脚甲", rarity: "rare", desc: "敵撃破ごとにHP+10", fx: { killHeal: 10 } },
  { slot: "legs", name: "英雄の脚衣", rarity: "rare", desc: "階を進むごとに防御+5", fx: { floorDef: 5 } },
  { slot: "shoes", name: "王の軍靴", rarity: "rare", desc: "攻撃+120 / 防御+120 / 最大HP+120", fx: { atk: 120, def: 120, maxHp: 120 } },

  // ===== エピック =====
  { slot: "weapon", name: "奈落の大剣", rarity: "epic", desc: "攻撃+1600", fx: { atk: 1600 } },
  { slot: "weapon", name: "魂喰らい", rarity: "epic", desc: "敵撃破ごとに攻撃+150(上限なし)", fx: { killAtk: 150 } },
  { slot: "weapon", name: "断罪の剣", rarity: "epic", desc: "ボスへ攻撃+300%", fx: { bossAtk: 3.0 } },
  { slot: "weapon", name: "破軍の剣", rarity: "epic", desc: "装備時にHPを99%削り、失ったHPの3倍を攻撃力に変換（外すとHPは戻る）", fx: { hpSacrificeToAtk: 3 } },
  { slot: "head", name: "不滅の王冠", rarity: "epic", desc: "最大HP+4000", fx: { maxHp: 4000 } },
  { slot: "head", name: "暴君の冠", rarity: "epic", desc: "攻撃+2400 / 防御-400", fx: { atk: 2400, def: -400 } },
  { slot: "body", name: "深淵の胸甲", rarity: "epic", desc: "防御+800 / 最大HP+2400", fx: { def: 800, maxHp: 2400 } },
  { slot: "body", name: "征服王の鎧", rarity: "epic", desc: "敵撃破ごとに全能力+2", fx: { killAll: 2 } },
  { slot: "legs", name: "巨人の脚衣", rarity: "epic", desc: "最大HP+4000", fx: { maxHp: 4000 } },
  { slot: "legs", name: "終焉脚甲", rarity: "epic", desc: "敵撃破ごとに攻撃+100", fx: { killAtk: 100 } },
  { slot: "shoes", name: "鉄城の軍靴", rarity: "epic", desc: "防御+800", fx: { def: 800 } },

  // ===== レジェンダリー =====
  { slot: "weapon", name: "徳川家康の太刀", rarity: "legendary", desc: "【天下統一】防具（頭/胸/脚/靴）の効果を2倍にする", fx: { doubleArmor: true } },
  { slot: "weapon", name: "宮本武蔵の木刀", rarity: "legendary", desc: "攻撃が150回判定される", fx: { hitCount: 150 } },
  { slot: "weapon", name: "因果律の剣", rarity: "legendary", desc: "与ダメージの100%を永続的に攻撃へ（外すと効果は消える）", fx: { damageToAtkPct: 1.0 } },
  { slot: "weapon", name: "神殺しの刃", rarity: "legendary", desc: "ボスへの攻撃力+100000%", fx: { bossAtk: 1000 } },
  { slot: "weapon", name: "巨人殺しの剣", rarity: "legendary", desc: "防御の20倍を攻撃に変換", fx: { convDefToAtk: 20 } },
  { slot: "weapon", name: "血月の剣", rarity: "legendary", desc: "撃破した敵のHPをすべて自分のHPにする", fx: { killHealEnemyMaxHp: true } },
  { slot: "head", name: "世界喰らいの王冠", rarity: "legendary", desc: "敵撃破ごとに最大HP+30%", fx: { killMaxHpPct: 0.3 } },
  { slot: "head", name: "真田幸村の六文銭兜", rarity: "legendary", desc: "HP30%以下で攻撃+300%", fx: { lowHpAtk: { th: 0.3, pct: 3.0 } } },
  { slot: "head", name: "ナポレオンの帽子", rarity: "legendary", desc: "【アウステルリッツの記憶】後ろの敵への範囲ダメージ+70%", fx: { splashBonusPct: 0.7 } },
  { slot: "head", name: "世界樹の冠", rarity: "legendary", desc: "防御の300%を最大HPに変換", fx: { convDefToHp: 3.0 } },
  { slot: "body", name: "創世神鎧", rarity: "legendary", desc: "防御+1600 / 最大HP+8000", fx: { maxHp: 8000, def: 1600 } },
  { slot: "body", name: "ラスプーチンの法衣", rarity: "legendary", desc: "死亡時1度だけHP50%で復活", fx: { revive: 0.5 } },
  { slot: "body", name: "トゲトゲすぎる胸甲", rarity: "legendary", desc: "被ダメージの60%を反射", fx: { reflect: 0.6 } },
  { slot: "body", name: "要塞の鎧", rarity: "legendary", desc: "攻撃の50%を防御に変換", fx: { convAtkToDef: 0.5 } },
  { slot: "legs", name: "終焉の脚甲・極", rarity: "legendary", desc: "敵撃破ごとに攻撃+300000", fx: { killAtk: 300000 } },
  { slot: "shoes", name: "源義経の草履", rarity: "legendary", desc: "50%で敵の反撃を回避", fx: { dodge: 0.5 } },
  { slot: "shoes", name: "チンギス・ハンの騎馬靴", rarity: "legendary", desc: "【火薬の使い手】与えたダメージを💣爆弾として貯め、好きな時に放出できる", fx: { bombStorePct: 1 } },

  // ===== 高HP対策の強力な武器（割合ダメージ・処刑・即死・ボス特効）=====
  { slot: "weapon", name: "削岩の刃", rarity: "epic", desc: "敵の最大HPの3%を追加ダメージ", fx: { enemyMaxHpPct: 0.03, atk: 60 } },
  { slot: "weapon", name: "山割りの大剣", rarity: "epic", desc: "敵の最大HPの5%を追加ダメージ", fx: { enemyMaxHpPct: 0.05 } },
  { slot: "weapon", name: "竜殺しの剣", rarity: "epic", desc: "ボスへの攻撃力+5000%", fx: { bossAtk: 50 } },
  { slot: "weapon", name: "処刑人の斧", rarity: "legendary", desc: "HP60%以下の敵を即死", fx: { execute: 0.6 } },
  { slot: "weapon", name: "世界喰らいの剣", rarity: "legendary", desc: "攻撃力+100万", fx: { atk: 1000000 } },

  // ========== 追加ラインナップ（剣）==========
  { slot: "weapon", name: "鋼の長剣", rarity: "common", desc: "攻撃力+50", fx: { atk: 50 } },
  { slot: "weapon", name: "疾風の刃", rarity: "common", desc: "攻撃力+5%", fx: { atkPct: 0.05 } },
  { slot: "weapon", name: "鋭刃のダガー", rarity: "common", desc: "会心率+5%", fx: { crit: 0.05 } },
  { slot: "weapon", name: "切先の剣", rarity: "common", desc: "会心率+3%", fx: { crit: 0.03 } },
  { slot: "weapon", name: "練達の剣", rarity: "common", desc: "攻撃力+30 / 会心率+2%", fx: { atk: 30, crit: 0.02 } },
  { slot: "weapon", name: "狂気の刃", rarity: "uncommon", desc: "会心率100%以上で攻撃力+50%", fx: { critOverAtk: 0.5 } },
  { slot: "weapon", name: "巨重の大剣", rarity: "uncommon", desc: "攻撃力+150", fx: { atk: 150 } },
  { slot: "weapon", name: "影縫いの刃", rarity: "uncommon", desc: "会心率+15%", fx: { crit: 0.15 } },
  { slot: "weapon", name: "守攻の剣", rarity: "uncommon", desc: "防御力+50 / 攻撃力+50", fx: { def: 50, atk: 50 } },
  { slot: "weapon", name: "竜狩りの太刀", rarity: "rare", desc: "ボス戦中、攻撃力4倍(乗算)", fx: { bossMult: 4 } },
  { slot: "weapon", name: "蒐集者の剣", rarity: "rare", desc: "装備中のコモン1つにつき攻撃力+100%(乗算)", fx: { commonCountAtkPct: 1.0 } },
  { slot: "weapon", name: "一長一短の剣", rarity: "rare", desc: "100階に到達した瞬間、攻撃力10000倍(乗算)", fx: { floor100Mult: 10000 } },
  { slot: "weapon", name: "鉄壁返しの剣", rarity: "epic", desc: "現在の防御力の5倍を攻撃力に加算", fx: { convDefToAtk: 5 } },
  { slot: "weapon", name: "覇王の大剣", rarity: "epic", desc: "攻撃力+1,000 / 会心率+150%", fx: { atk: 1000, crit: 1.5 } },
  { slot: "weapon", name: "生命喰らいの剣", rarity: "epic", desc: "最大HPの10倍を基礎攻撃力に上乗せ", fx: { convMaxHpToAtk: 10 } },

  // ========== 追加ラインナップ（頭）==========
  { slot: "head", name: "守りの帽子", rarity: "common", desc: "最大HP+100", fx: { maxHp: 100 } },
  { slot: "head", name: "鉄の額当て", rarity: "common", desc: "防御力+10", fx: { def: 10 } },
  { slot: "head", name: "眼力の兜", rarity: "common", desc: "会心率+4%", fx: { crit: 0.04 } },
  { slot: "head", name: "軽鉄兜", rarity: "common", desc: "最大HP+50 / 防御力+5", fx: { maxHp: 50, def: 5 } },
  { slot: "head", name: "攻めの兜", rarity: "common", desc: "攻撃力+20", fx: { atk: 20 } },
  { slot: "head", name: "厚鉄兜", rarity: "common", desc: "防御力+12", fx: { def: 12 } },
  { slot: "head", name: "背水の兜", rarity: "uncommon", desc: "HP50%以下で攻撃力+30%", fx: { lowHpAtk: { th: 0.5, pct: 0.3 } } },
  { slot: "head", name: "慧眼の兜", rarity: "uncommon", desc: "会心率+12%", fx: { crit: 0.12 } },
  { slot: "head", name: "重装の兜", rarity: "uncommon", desc: "防御力+40", fx: { def: 40 } },
  { slot: "head", name: "巨人の兜", rarity: "uncommon", desc: "最大HP+300", fx: { maxHp: 300 } },
  { slot: "head", name: "一騎打ちの兜", rarity: "rare", desc: "敵がボス1体の時、会心率+100%", fx: { bossCrit: 1 } },
  { slot: "head", name: "鉄壁眼の兜", rarity: "rare", desc: "防御力の数値分、会心率を(%)加算", fx: { convDefToCrit: 0.01 } },
  { slot: "head", name: "鉄壁倍化の兜", rarity: "rare", desc: "防御力5倍(乗算)", fx: { defMult: 4 } },
  { slot: "head", name: "削りの仮面", rarity: "epic", desc: "攻撃時、ボス現在HPの0.5%を攻撃力に加算して攻撃", fx: { enemyCurHpPct: 0.005 } },
  { slot: "head", name: "死線の兜", rarity: "epic", desc: "最大HPが10%減るごとに会心率+20%", fx: { scalingLowHpCrit: 2 } },
  { slot: "head", name: "無防備崩しの兜", rarity: "epic", desc: "防御力+2000", fx: { def: 2000 } },
  { slot: "head", name: "神威の王冠", rarity: "legendary", desc: "ボス戦中、攻撃力と会心率が100倍(乗算)", fx: { bossMult: 100, bossCritMult: 100 } },
  { slot: "head", name: "桁断ちの冠", rarity: "legendary", desc: "ボス戦中、会心ダメージ倍率が1000倍", fx: { bossDigitsCrit: true } },
  { slot: "head", name: "超会心の冠", rarity: "legendary", desc: "会心率100%超過1%につき会心ダメ×10(乗算累積)", fx: { critOverDmgMult: 10 } },

  // ========== 追加ラインナップ（胸）==========
  { slot: "body", name: "守りの胴着", rarity: "common", desc: "最大HP+150", fx: { maxHp: 150 } },
  { slot: "body", name: "鉄の胸当て", rarity: "common", desc: "防御力+15", fx: { def: 15 } },
  { slot: "body", name: "軽鉄の鎧", rarity: "common", desc: "最大HP+80 / 防御力+8", fx: { maxHp: 80, def: 8 } },
  { slot: "body", name: "攻めの胸当て", rarity: "common", desc: "攻撃力+15", fx: { atk: 15 } },
  { slot: "body", name: "厚鉄の鎧", rarity: "common", desc: "防御力+20", fx: { def: 20 } },
  { slot: "body", name: "守護の胴着", rarity: "common", desc: "最大HP+120", fx: { maxHp: 120 } },
  { slot: "body", name: "反撃の鎧", rarity: "uncommon", desc: "被ダメージ時、次の攻撃力+20%", fx: { onHitBuffAtkPct: 0.2 } },
  { slot: "body", name: "万全の鎧", rarity: "uncommon", desc: "HPが最大の時、攻撃力+20%", fx: { highHpAtk: 0.2 } },
  { slot: "body", name: "重甲冑", rarity: "uncommon", desc: "防御力+60", fx: { def: 60 } },
  { slot: "body", name: "巨人の鎧", rarity: "uncommon", desc: "最大HP+700", fx: { maxHp: 700 } },
  { slot: "body", name: "対ボスの鎧", rarity: "rare", desc: "受けるダメージを30%カット", fx: { damageReducePct: 0.3 } },
  { slot: "body", name: "力変換の鎧", rarity: "rare", desc: "防御力の100%を攻撃力に加算", fx: { convDefToAtk: 1 } },
  { slot: "body", name: "生命倍化の鎧", rarity: "rare", desc: "最大HP2倍(乗算)", fx: { maxHpMult: 1 } },
  { slot: "body", name: "背水の胸甲", rarity: "epic", desc: "残りHPが少ないほど攻撃力上昇(最大+500%)", fx: { missingHpAtk: 5 } },
  { slot: "body", name: "城塞の鎧", rarity: "epic", desc: "防御力+1,000 / 最大HP+5,000", fx: { def: 1000, maxHp: 5000 } },
  { slot: "body", name: "無限蓄積の鎧", rarity: "epic", desc: "攻撃時、最大HPと同値の攻撃力を永久に累積", fx: { maxHpToAtkEach: 1 } },
  { slot: "body", name: "無限増幅の鎧", rarity: "legendary", desc: "攻撃するたび、攻撃力が1%(乗算)で無限に上昇", fx: { atkStackPerAttack: 0.01 } },
  { slot: "body", name: "鉄壁変換の鎧", rarity: "legendary", desc: "防御力をそのまま与ダメージの乗算倍率に変換", fx: { defAsDamageMult: true } },
  { slot: "body", name: "一の鎧", rarity: "legendary", desc: "HPが1の時、攻撃力が100億倍(乗算)", fx: { hp1Mult: 10000000000 } },

  // ========== 追加ラインナップ（脚）==========
  { slot: "legs", name: "守りのズボン", rarity: "common", desc: "最大HP+100", fx: { maxHp: 100 } },
  { slot: "legs", name: "鉄の脚当て", rarity: "common", desc: "防御力+12", fx: { def: 12 } },
  { slot: "legs", name: "攻めの脚当て", rarity: "common", desc: "攻撃力+20", fx: { atk: 20 } },
  { slot: "legs", name: "鋭脚甲", rarity: "common", desc: "会心率+3%", fx: { crit: 0.03 } },
  { slot: "legs", name: "軽鉄脚甲", rarity: "common", desc: "最大HP+60 / 防御力+6", fx: { maxHp: 60, def: 6 } },
  { slot: "legs", name: "厚鉄脚甲", rarity: "common", desc: "防御力+15", fx: { def: 15 } },
  { slot: "legs", name: "会心の脚衣", rarity: "uncommon", desc: "会心率+10%", fx: { crit: 0.1 } },
  { slot: "legs", name: "剛脚甲", rarity: "uncommon", desc: "攻撃力+80", fx: { atk: 80 } },
  { slot: "legs", name: "重脚甲", rarity: "uncommon", desc: "防御力+50", fx: { def: 50 } },
  { slot: "legs", name: "巨脚甲", rarity: "uncommon", desc: "最大HP+350", fx: { maxHp: 350 } },
  { slot: "legs", name: "強襲の脚甲", rarity: "rare", desc: "ボスの現在HPが50%以上の時、攻撃力2倍(乗算)", fx: { highEnemyAtk: { th: 0.5, pct: 1 } } },
  { slot: "legs", name: "攻防の脚衣", rarity: "rare", desc: "攻撃力の5%を防御力に加算", fx: { convAtkToDef: 0.05 } },
  { slot: "legs", name: "常会心の脚衣", rarity: "rare", desc: "会心率が常時1.5倍(乗算)", fx: { critMult: 0.5 } },
  { slot: "legs", name: "連撃の脚甲", rarity: "epic", desc: "攻撃時、30%でその攻撃が2倍で再発生", fx: { extraHitChance: 0.3 } },
  { slot: "legs", name: "対ボス増幅の脚甲", rarity: "epic", desc: "敵にダメージを与えるたび攻撃力1%(乗算)無限上昇", fx: { atkStackPerAttack: 0.01 } },
  { slot: "legs", name: "鉄壁会心の脚甲", rarity: "epic", desc: "防御力1につき会心率+5%", fx: { convDefToCrit: 0.05 } },
  { slot: "legs", name: "蒐集の脚衣", rarity: "legendary", desc: "装備中のコモン合計数×1000%分、攻撃力を乗算で上昇", fx: { commonCountAtkPct: 10 } },
  { slot: "legs", name: "累積の脚甲", rarity: "legendary", desc: "ボス戦開始時、これまでの累計総ダメージを基礎攻撃力に上乗せ", fx: { totalDmgToAtkOnBoss: true } },

  // ========== 追加ラインナップ（靴）==========
  { slot: "shoes", name: "会心の靴", rarity: "common", desc: "会心率+5%", fx: { crit: 0.05 } },
  { slot: "shoes", name: "守りの靴", rarity: "common", desc: "最大HP+80", fx: { maxHp: 80 } },
  { slot: "shoes", name: "鉄の靴", rarity: "common", desc: "防御力+10", fx: { def: 10 } },
  { slot: "shoes", name: "攻めの靴", rarity: "common", desc: "攻撃力+25", fx: { atk: 25 } },
  { slot: "shoes", name: "軽会心の靴", rarity: "common", desc: "最大HP+40 / 会心率+2%", fx: { maxHp: 40, crit: 0.02 } },
  { slot: "shoes", name: "厚鉄の靴", rarity: "common", desc: "防御力+8", fx: { def: 8 } },
  { slot: "shoes", name: "突撃の靴", rarity: "common", desc: "攻撃力+15", fx: { atk: 15 } },
  { slot: "shoes", name: "慧眼の靴", rarity: "uncommon", desc: "会心率+12%", fx: { crit: 0.12 } },
  { slot: "shoes", name: "剛脚の靴", rarity: "uncommon", desc: "攻撃力+100", fx: { atk: 100 } },
  { slot: "shoes", name: "重装の靴", rarity: "uncommon", desc: "防御力+45", fx: { def: 45 } },
  { slot: "shoes", name: "巨人の靴", rarity: "uncommon", desc: "最大HP+300", fx: { maxHp: 300 } },
  { slot: "shoes", name: "生命変換の靴", rarity: "rare", desc: "最大HPの1%を攻撃力に加算", fx: { convMaxHpToAtk: 0.01 } },
  { slot: "shoes", name: "超会心の靴", rarity: "rare", desc: "会心率100%超で攻撃力1.4倍(乗算)", fx: { critOverAtk: 0.4 } },
  { slot: "shoes", name: "守攻の軍靴", rarity: "rare", desc: "防御力+200 / 会心率+15%", fx: { def: 200, crit: 0.15 } },
  { slot: "shoes", name: "攻防合一の靴", rarity: "epic", desc: "攻撃力と防御力を合算して基礎攻撃力にする", fx: { convDefToAtk: 1 } },
  { slot: "shoes", name: "背水の軍靴", rarity: "epic", desc: "残りHP20%以下で会心率+100%・攻撃力5倍", fx: { lowHpCrit: { th: 0.2, pct: 1 }, lowHpAtk: { th: 0.2, pct: 4 } } },
  { slot: "shoes", name: "反逆の軍靴", rarity: "epic", desc: "ボスへの攻撃力+5000%", fx: { bossAtk: 50 } },
  { slot: "shoes", name: "処刑の軍靴", rarity: "legendary", desc: "敵のHPが30%以下で即死させる", fx: { execute: 0.3 } },
  { slot: "shoes", name: "不抜の軍靴", rarity: "legendary", desc: "被弾せず耐えるほど、1ターンごと攻撃力×100(乗算)", fx: { noHitStreakMult: 100 } },

  // ========== ✨ ミシック（ガチャ限定・最高レア）==========
  // ⚔️ 武器
  {
    slot: "weapon", name: "創世神剣 ジェネシス", rarity: "mythic",
    desc: "戦闘開始時に攻撃力×1000 / 与えたダメージ分だけ攻撃力が永続増加 / 敵を倒すたび攻撃力×20 / ボス戦ではさらに攻撃力×100",
    fx: { startAtkMult: 1000, damageToAtkPct: 1, atkMultPerKill: 20, bossMult: 100 },
  },
  {
    slot: "weapon", name: "星界終焉剣 アポカリオン", rarity: "mythic",
    desc: "毎ターン攻撃力×10 / 与えるダメージに敵HPの5%を追加 / オーバーキル分を次の敵へ100%持ち越す / 敵を倒すたび攻撃力×2",
    fx: { atkMultPerTurn: 10, enemyCurHpPct: 0.05, overkillCarry: 1, atkMultPerKill: 2 },
  },
  // 👑 頭
  {
    slot: "head", name: "神王の冠", rarity: "mythic",
    desc: "全ステータス×5（攻撃+400% / 防御×5 / 最大HP×5）/ ボス戦ではさらに攻撃×3",
    fx: { atkPct: 4, defMult: 4, maxHpMult: 4, bossMult: 3 },
  },
  {
    slot: "head", name: "虚無王の王冠", rarity: "mythic",
    desc: "HP50%以下で攻撃力×100 / HP50%以下で被ダメージを98%軽減",
    fx: { lowHpAtk: { th: 0.5, pct: 99 }, damageReduceLowHp: { th: 0.5, pct: 0.98 } },
  },
  // 🛡️ 胸
  {
    slot: "body", name: "世界樹の鎧", rarity: "mythic",
    desc: "毎ターン最大HPを100%回復 / 最大HPの100%を攻撃力に加算 / 防御力をHPに加算",
    fx: { turnHealPct: 1, convMaxHpToAtk: 1, convDefToHp: 1 },
  },
  {
    slot: "body", name: "神核装甲 Ω", rarity: "mythic",
    desc: "最初の10回の被ダメージを無効化 / 無効化するたび攻撃力×3 / ボス戦では攻撃力×5",
    fx: { immuneHits: 10, immuneAtkMult: 3, bossMult: 5 },
  },
  // 🦵 ズボン
  {
    slot: "legs", name: "天界守護脚甲", rarity: "mythic",
    desc: "攻撃力と防御力をそのままHPにも加算（元のステータスは下がらない）",
    fx: { convAtkToHp: 1, convDefToHp: 1 },
  },
  {
    slot: "legs", name: "混沌の脚衣", rarity: "mythic",
    desc: "毎ターン攻撃力が100〜3000倍になる（毎ターンランダム）",
    fx: { turnRandomMult: { lo: 100, hi: 3000 } },
  },
  // 👢 靴
  {
    slot: "shoes", name: "神速の靴 アストラ", rarity: "mythic",
    desc: "毎ターン15000回攻撃 / 敵を倒すたび攻撃回数+1（永続）",
    fx: { extraHits: 14999, killExtraHit: 1 },
  },
  {
    slot: "shoes", name: "星渡りの靴", rarity: "mythic",
    desc: "敵の攻撃を90%の確率で回避 / 回避するたび攻撃力×2（永続で累積）",
    fx: { dodge: 0.9, dodgeAtkStack: 2 },
  },
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EQUIPMENT };
}
