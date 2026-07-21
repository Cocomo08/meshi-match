"use client";

// アプリ共通の効果音（WebAudio・外部ファイル無し）。
// メシバトルと本体で同じON/OFF状態を共有する（グローバルな消音トグル）。
// AudioContext はユーザー操作（最初のボタン押下）の中で生成・resumeする。

const STORE_KEY = "meshi-sound";

let ctx = null;
let enabled = true;
let hydrated = false;
const listeners = new Set();

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// localStorage から設定を読み込む（クライアントで一度だけ）
export function hydrateSound() {
  if (hydrated || typeof window === "undefined") return enabled;
  hydrated = true;
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    if (v !== null) enabled = v === "1";
  } catch {
    /* localStorage 不可でも無視 */
  }
  return enabled;
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(v) {
  enabled = !!v;
  try {
    window.localStorage.setItem(STORE_KEY, enabled ? "1" : "0");
  } catch {
    /* 無視 */
  }
  listeners.forEach((fn) => fn(enabled));
}

export function toggleSound() {
  setSoundEnabled(!enabled);
  if (enabled) playPush(); // ONにした瞬間フィードバック
  return enabled;
}

// 状態変化を購読（トグルUIの同期用）。解除関数を返す。
export function subscribeSound(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 押して気持ちいい「ポッ」というプッシュ音（ピッチダウン＋上物のパリッ）
export function playPush() {
  const c = ac();
  if (!c || !enabled) return;
  const t = c.currentTime;

  // メイン：素早いピッチダウンでタクタイルなポップ感
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(700, t);
  o.frequency.exponentialRampToValueAtTime(330, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.24, t + 0.008); // 立ち上がり速め
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.15);

  // 上物：パリッとした高音クリックで輪郭を出す
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = "square";
  o2.frequency.setValueAtTime(1500, t);
  g2.gain.setValueAtTime(0.09, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o2.connect(g2).connect(c.destination);
  o2.start(t);
  o2.stop(t + 0.06);
}

// 「アリ／行きたい」ときの、少し嬉しい上向き2音ポップ
export function playLike() {
  const c = ac();
  if (!c || !enabled) return;
  const t = c.currentTime;
  [660, 990].forEach((f, i) => {
    const at = t + i * 0.06;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.2, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    o.connect(g).connect(c.destination);
    o.start(at);
    o.stop(at + 0.14);
  });
}

// 「パス」ときの軽い下向きスワイプ音
export function playNope() {
  const c = ac();
  if (!c || !enabled) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(210, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.18);
}
