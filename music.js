/**
 * バトル用BGM（Web Audio API で生成するチップチューン風ループ）。
 * 外部ファイル不要。ブラウザだけで鳴る。
 *   Music.start()  ... 再生開始（バトル画面で呼ぶ）
 *   Music.stop()   ... 停止（バトルを離れたら呼ぶ）
 *   Music.toggle() ... ミュートのオン/オフ（設定は localStorage に保存）
 *   Music.isMuted()... 現在ミュートか
 */
const Music = (function () {
  let ctx = null;
  let masterGain = null;
  let timer = null;
  let playing = false;
  let muted = false;
  try {
    muted = localStorage.getItem("idiomMusicMuted") === "1";
  } catch (e) {}

  // A4=440Hz からの半音オフセットで音程を指定
  function freq(semi) {
    return 440 * Math.pow(2, semi / 12);
  }

  // メロディ（square）とベース（triangle）。null は休符。
  const MELODY = [0, 3, 7, 3, 5, 3, 0, -2, 0, 3, 7, 12, 10, 7, 3, 5];
  const BASS = [-12, null, null, null, -5, null, null, null, -7, null, null, null, -5, null, null, null];
  const STEP = 0.19; // 1ステップの秒数
  let step = 0;
  let nextTime = 0;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.12;
    masterGain.connect(ctx.destination);
    return true;
  }

  function tone(f, t, dur, type, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(masterGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % MELODY.length;
      const m = MELODY[i];
      if (m !== null) tone(freq(m), nextTime, STEP * 0.9, "square", 0.16);
      const b = BASS[i];
      if (b !== null && b !== undefined) tone(freq(b - 12), nextTime, STEP * 1.8, "triangle", 0.22);
      nextTime += STEP;
      step++;
    }
  }

  function start() {
    try {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
      if (playing) return;
      playing = true;
      step = 0;
      nextTime = ctx.currentTime + 0.05;
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
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.12;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return { start, stop, toggle, isMuted };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Music };
}
