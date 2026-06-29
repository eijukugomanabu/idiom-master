/**
 * バトル用BGM＆SFX（Web Audio API で生成。外部ファイル不要）。
 * 「脳が溶ける」系のドリーミー／サイケなループ。
 *   Music.start()      ... 再生開始（バトル画面で呼ぶ）
 *   Music.stop()       ... 停止（バトルを離れたら呼ぶ）
 *   Music.toggle()     ... ミュートのオン/オフ（localStorage に保存）
 *   Music.isMuted()    ... 現在ミュートか
 *   Music.hit(tier,crit) ... 敵にダメージを与えた時の効果音（脳が溶ける系）
 *   Music.kill()       ... 撃破した時の効果音（大きめ）
 */
const Music = (function () {
  let ctx = null;
  let masterGain = null;
  let musicBus = null; // 音楽ソースの集約
  let musicLP = null; // 音楽のローパス（カットオフをLFOでうねらせる＝溶ける）
  let musicTrem = null; // 音楽のトレモロ（呼吸するような揺れ）
  let musicGain = null;
  let musicSend = null; // 音楽 → ディレイ送り
  let sfxGain = null; // 効果音の出力
  let sfxSend = null; // 効果音 → ディレイ送り
  let delay = null; // シマー（やまびこ）
  let timer = null;
  let playing = false;
  let muted = false;
  try {
    muted = localStorage.getItem("idiomMusicMuted") === "1";
  } catch (e) {}

  // A4=440Hz からの半音オフセットで音程
  function freq(semi) {
    return 440 * Math.pow(2, semi / 12);
  }

  // 切ない・多幸感のある定番進行 Am – F – C – G（vi–IV–I–V）
  // tones: A4基準の和音構成音 / bass: 低音のルート
  const PROG = [
    { bass: -24, tones: [0, 3, 7] }, // Am  (A C E)
    { bass: -28, tones: [-4, 0, 3] }, // F   (F A C)
    { bass: -21, tones: [3, 7, 10] }, // C   (C E G)
    { bass: -26, tones: [-2, 2, 5] }, // G   (G B D)
  ];
  const STEP = 0.16; // アルペジオ1ステップの秒数
  const CHORD_STEPS = 12; // 1コードの長さ（ステップ数）
  let step = 0;
  let nextTime = 0;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      return false;
    }
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);

    // シマー・ディレイ（やまびこ）。暗めに繰り返して幻想的に
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const dlp = ctx.createBiquadFilter();
    dlp.type = "lowpass";
    dlp.frequency.value = 2000;
    delay.connect(dlp);
    dlp.connect(fb);
    fb.connect(delay);
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.5;
    delay.connect(delayWet);
    delayWet.connect(masterGain);

    // 音楽チェーン： bus → ローパス(うねる) → トレモロ → 音量 → master
    musicBus = ctx.createGain();
    musicLP = ctx.createBiquadFilter();
    musicLP.type = "lowpass";
    musicLP.frequency.value = 1300;
    musicLP.Q.value = 6;
    musicTrem = ctx.createGain();
    musicTrem.gain.value = 0.85;
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.1;
    musicBus.connect(musicLP);
    musicLP.connect(musicTrem);
    musicTrem.connect(musicGain);
    musicGain.connect(masterGain);
    musicSend = ctx.createGain();
    musicSend.gain.value = 0.35;
    musicSend.connect(delay);

    // 効果音チェーン
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(masterGain);
    sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.4;
    sfxSend.connect(delay);

    // フィルターをゆっくりうねらせる（脳が溶ける感）
    const filterLFO = ctx.createOscillator();
    filterLFO.frequency.value = 0.06;
    const filterAmt = ctx.createGain();
    filterAmt.gain.value = 850;
    filterLFO.connect(filterAmt);
    filterAmt.connect(musicLP.frequency);
    filterLFO.start();

    // 音量をゆっくり揺らす（呼吸するような揺れ）
    const tremLFO = ctx.createOscillator();
    tremLFO.frequency.value = 0.5;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.18;
    tremLFO.connect(tremAmt);
    tremAmt.connect(musicTrem.gain);
    tremLFO.start();

    return true;
  }

  function resumeCtx() {
    if (ctx && ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (e) {}
    }
  }

  // デチューンしたノコギリ波を重ねた「とろける」パッド
  function padChord(chord, t, dur) {
    chord.tones.forEach((s) => {
      [0, 12].forEach((oct) => {
        const f = freq(s + oct);
        [-8, 0, 8].forEach((cents) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = f;
          o.detune.value = cents;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.018, t + 0.5); // ゆっくり立ち上がる
          g.gain.setValueAtTime(0.018, t + dur - 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g);
          g.connect(musicBus);
          o.start(t);
          o.stop(t + dur + 0.05);
        });
      });
    });
  }

  // キラキラしたアルペジオ（ディレイ送りで尾を引く）
  function arpNote(f, t, dur) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(musicBus);
    g.connect(musicSend);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // 深いサブベース
  function subNote(f, t, dur) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.06);
    g.gain.setValueAtTime(0.13, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.3) {
      const chord = PROG[Math.floor(step / CHORD_STEPS) % PROG.length];
      const inChord = step % CHORD_STEPS;
      if (inChord === 0) {
        const dur = STEP * CHORD_STEPS * 1.05;
        padChord(chord, nextTime, dur);
        subNote(freq(chord.bass), nextTime, dur);
      }
      // アルペジオ：和音構成音を2オクターブにまたいでなぞる
      const arpTones = [];
      chord.tones.forEach((t) => {
        arpTones.push(t);
        arpTones.push(t + 12);
      });
      const note = arpTones[inChord % arpTones.length];
      arpNote(freq(note + 12), nextTime, STEP * 1.9);
      nextTime += STEP;
      step++;
    }
  }

  function start() {
    try {
      if (!ensure()) return;
      resumeCtx();
      if (playing) return;
      playing = true;
      step = 0;
      nextTime = ctx.currentTime + 0.06;
      timer = setInterval(schedule, 40);
    } catch (e) {}
  }

  function stop() {
    if (!playing) return;
    playing = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function toggle() {
    muted = !muted;
    try {
      localStorage.setItem("idiomMusicMuted", muted ? "1" : "0");
    } catch (e) {}
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  // 敵にダメージ：脳が溶ける系のうねる電子音（ダメージが大きいほど派手）
  function hit(tier, crit) {
    try {
      if (!ensure()) return;
      resumeCtx();
      tier = Math.max(1, Math.min(7, tier || 1));
      const t = ctx.currentTime;
      const baseF = 180 + tier * 80 + (crit ? 160 : 0);
      const dur = 0.18 + tier * 0.03;

      // 共鳴ローパス＋速いワブル（うねり）＝溶ける質感
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 8 + tier;
      lp.frequency.setValueAtTime(2600 + tier * 220, t);
      lp.frequency.exponentialRampToValueAtTime(420, t + dur);
      const wob = ctx.createOscillator();
      wob.type = "sine";
      wob.frequency.value = 16 + tier * 5;
      const wobAmt = ctx.createGain();
      wobAmt.gain.value = 500 + tier * 130;
      wob.connect(wobAmt);
      wobAmt.connect(lp.frequency);
      wob.start(t);
      wob.stop(t + dur + 0.1);

      // メインのダイブ音（高→低）＋デチューンした重なり
      [
        ["sawtooth", 4, 0],
        ["square", 6, 14],
      ].forEach(([type, mul, det]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.detune.value = det;
        o.frequency.setValueAtTime(baseF * mul, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(40, baseF * 0.5), t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(crit ? 0.55 : 0.42, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
        o.connect(lp);
        lp.connect(g);
        g.connect(sfxGain);
        g.connect(sfxSend);
        o.start(t);
        o.stop(t + dur + 0.06);
      });

      // 高レア・会心はキラッと上昇するシマーを足す
      if (crit || tier >= 4) {
        const sh = ctx.createOscillator();
        sh.type = "triangle";
        sh.frequency.setValueAtTime(baseF * 3, t);
        sh.frequency.exponentialRampToValueAtTime(baseF * 8, t + 0.18);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0.0001, t);
        sg.gain.linearRampToValueAtTime(0.2, t + 0.02);
        sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        sh.connect(sg);
        sg.connect(sfxGain);
        sg.connect(sfxSend);
        sh.start(t);
        sh.stop(t + 0.34);
      }
    } catch (e) {}
  }

  // 撃破：ノイズ爆発＋深いサブ＋多幸感のあるコード（脳が溶ける大きめSE）
  function kill() {
    try {
      if (!ensure()) return;
      resumeCtx();
      const t = ctx.currentTime;

      // ノイズの爆発
      const ndur = 0.6;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * ndur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const nlp = ctx.createBiquadFilter();
      nlp.type = "lowpass";
      nlp.frequency.setValueAtTime(4500, t);
      nlp.frequency.exponentialRampToValueAtTime(220, t + 0.5);
      const ng = ctx.createGain();
      ng.gain.value = 0.5;
      noise.connect(nlp);
      nlp.connect(ng);
      ng.connect(sfxGain);
      ng.connect(sfxSend);
      noise.start(t);
      noise.stop(t + ndur);

      // 深いサブのドゥーン
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(170, t);
      sub.frequency.exponentialRampToValueAtTime(32, t + 0.45);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.7, t);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      sub.connect(sg);
      sg.connect(sfxGain);
      sub.start(t);
      sub.stop(t + 0.55);

      // 多幸感のある上昇コード（脳が溶ける）
      [0, 7, 12, 16, 19].forEach((s, i) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = freq(s + 12);
        const g = ctx.createGain();
        const st = t + i * 0.045;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.17, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.7);
        o.connect(g);
        g.connect(sfxGain);
        g.connect(sfxSend);
        o.start(st);
        o.stop(st + 0.75);
      });
    } catch (e) {}
  }

  // ガチャ：溜める上昇音 → レア度に応じたきらびやかなリビール
  function gacha(rank, buildMs) {
    try {
      if (!ensure()) return;
      resumeCtx();
      rank = Math.max(2, Math.min(5, rank || 2));
      const t = ctx.currentTime;
      const build = Math.max(0.3, (buildMs || 900) / 1000);

      // チャージ：ピッチとフィルターが上がり、トレモロが速くなる（ドキドキ）
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(700 + rank * 130, t + build);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 7;
      lp.frequency.setValueAtTime(280, t);
      lp.frequency.exponentialRampToValueAtTime(4200, t + build);
      const trem = ctx.createGain();
      trem.gain.value = 0.55;
      const tl = ctx.createOscillator();
      tl.type = "square";
      tl.frequency.setValueAtTime(6, t);
      tl.frequency.exponentialRampToValueAtTime(42, t + build);
      const tla = ctx.createGain();
      tla.gain.value = 0.45;
      tl.connect(tla);
      tla.connect(trem.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.12);
      g.gain.setValueAtTime(0.2, t + build - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + build + 0.06);
      o.connect(lp);
      lp.connect(trem);
      trem.connect(g);
      g.connect(sfxGain);
      g.connect(sfxSend);
      o.start(t);
      tl.start(t);
      o.stop(t + build + 0.1);
      tl.stop(t + build + 0.1);

      // リビール：当たりが豪華なほど厚いコード
      const rt = t + build;
      const chord =
        rank >= 5 ? [0, 4, 7, 11, 14, 19] : rank >= 4 ? [0, 4, 7, 11, 16] : rank >= 3 ? [0, 4, 7, 12] : [0, 7, 12];
      chord.forEach((s, i) => {
        const oo = ctx.createOscillator();
        oo.type = "triangle";
        oo.frequency.value = freq(s + 12);
        const gg = ctx.createGain();
        const st = rt + i * 0.04;
        gg.gain.setValueAtTime(0.0001, st);
        gg.gain.linearRampToValueAtTime(0.16, st + 0.02);
        gg.gain.exponentialRampToValueAtTime(0.0001, st + 0.95);
        oo.connect(gg);
        gg.connect(sfxGain);
        gg.connect(sfxSend);
        oo.start(st);
        oo.stop(st + 1.05);
      });
      // 高レアはサブの「ドゥン」を足す
      if (rank >= 4) {
        const sub = ctx.createOscillator();
        sub.type = "sine";
        sub.frequency.setValueAtTime(120, rt);
        sub.frequency.exponentialRampToValueAtTime(45, rt + 0.5);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0.5, rt);
        sg.gain.exponentialRampToValueAtTime(0.0001, rt + 0.6);
        sub.connect(sg);
        sg.connect(sfxGain);
        sub.start(rt);
        sub.stop(rt + 0.65);
      }
    } catch (e) {}
  }

  return { start, stop, toggle, isMuted, hit, kill, gacha };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Music };
}
