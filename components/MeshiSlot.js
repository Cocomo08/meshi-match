"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  isSoundEnabled,
  setSoundEnabled,
  subscribeSound,
  playPush,
  playTick,
  playFanfare,
} from "@/components/sound";

const CONFETTI_COLORS = ["#ffd400", "#ff6b6f", "#5b8bff", "#22c55e", "#f97316", "#ffffff"];
function makeConfetti() {
  const pieces = [];
  for (let i = 0; i < 72; i++) {
    pieces.push({
      left: Math.round(Math.random() * 100),
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: (1.6 + Math.random() * 1.5).toFixed(2),
      delay: (Math.random() * 0.5).toFixed(2),
    });
  }
  return pieces;
}

// 2品のどちらかが各リールに出る3連スロット。多数決で勝者を決める運ゲー。
// you / opp は GENRES の要素（{ id, label, emoji }）。
export function MeshiSlot({ you, opp, onDecided, onQuit, onPickAgain }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const reelRefs = [useRef(null), useRef(null), useRef(null)];
  const rafRef = useRef(0);
  const timersRef = useRef([]);

  const gRef = useRef(null);
  if (gRef.current === null) {
    gRef.current = {
      fighters: {
        you: { side: "きみ", cls: "you", ...you },
        opp: { side: "あいて", cls: "opp", ...opp },
      },
      phase: "ready", // ready | spinning | done
      reels: [
        { spinning: false, sym: null },
        { spinning: false, sym: null },
        { spinning: false, sym: null },
      ],
      winner: null,
      jackpot: false,
      confetti: [],
    };
  }
  const g = gRef.current;
  const F = g.fighters;
  const soundOn = isSoundEnabled();

  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const emojiOf = (sym) => (sym === "you" ? F.you.emoji : F.opp.emoji);

  // 回転中のリールは絵文字を高速で切り替え（refに直接書き込み）
  useEffect(() => {
    const loop = (now) => {
      g.reels.forEach((r, i) => {
        if (r.spinning && reelRefs[i].current) {
          const which = Math.floor(now / 80 + i * 3) % 2;
          reelRefs[i].current.textContent = which === 0 ? F.you.emoji : F.opp.emoji;
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    const unsub = subscribeSound(() => force());
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = () => {
    playPush();
    g.phase = "spinning";
    g.winner = null;
    g.jackpot = false;
    g.confetti = [];
    g.reels = g.reels.map(() => ({ spinning: true, sym: null }));
    force();
  };

  const stopNext = () => {
    const idx = g.reels.findIndex((r) => r.spinning);
    if (idx === -1) return;
    const sym = Math.random() < 0.5 ? "you" : "opp";
    g.reels[idx] = { spinning: false, sym };
    if (reelRefs[idx].current) reelRefs[idx].current.textContent = emojiOf(sym);
    playTick();
    force();
    if (!g.reels.some((r) => r.spinning)) addTimer(evaluate, 450);
  };

  const evaluate = () => {
    const youCount = g.reels.filter((r) => r.sym === "you").length;
    const wKey = youCount >= 2 ? "you" : "opp";
    g.winner = wKey;
    g.jackpot = youCount === 3 || youCount === 0; // 3つ揃い
    g.phase = "done";
    g.confetti = makeConfetti();
    playFanfare();
    force();
  };

  const reset = () => {
    clearTimers();
    g.phase = "ready";
    g.winner = null;
    g.jackpot = false;
    g.confetti = [];
    g.reels = g.reels.map(() => ({ spinning: false, sym: null }));
    force();
  };

  const toggleSound = () => {
    setSoundEnabled(!isSoundEnabled());
    if (isSoundEnabled()) playPush();
    force();
  };

  // 停止済みリールで2つ揃っていれば残りをリーチ表示
  const stoppedSyms = g.reels.filter((r) => !r.spinning && r.sym).map((r) => r.sym);
  const reach =
    g.phase === "spinning" &&
    stoppedSyms.length === 2 &&
    stoppedSyms[0] === stoppedSyms[1];

  const spinning = g.reels.some((r) => r.spinning);
  const btnLabel = g.phase === "ready" ? "スピン！" : "ストップ！";

  return (
    <div className="mb-root">
      <button className={`mb-sound ${soundOn ? "" : "off"}`} onClick={toggleSound} aria-label="サウンド切り替え">
        {soundOn ? "🔊" : "🔇"}
      </button>
      {onQuit && (
        <button className="mb-quit" onClick={onQuit} aria-label="ゲーム選択にもどる">
          ✕
        </button>
      )}

      <div className="mb-app slot-app">
        <div className="mb-title">
          メシスロット <small>SLOT</small>
        </div>

        <div className="slot-vs">
          <span className="slot-vs-tag you">
            きみ {F.you.emoji}
            {F.you.label}
          </span>
          <span className="slot-vs-x">VS</span>
          <span className="slot-vs-tag opp">
            あいて {F.opp.emoji}
            {F.opp.label}
          </span>
        </div>

        <div className="slot-machine">
          <div className={`slot-reels ${reach ? "reach" : ""}`}>
            {g.reels.map((r, i) => (
              <div key={i} className={`slot-reel ${r.spinning ? "spin" : "stopped"}`}>
                <span className="slot-sym" ref={reelRefs[i]}>
                  {r.sym ? emojiOf(r.sym) : F.you.emoji}
                </span>
              </div>
            ))}
          </div>
          <div className="slot-payline" aria-hidden />
        </div>

        <div className="slot-msg">
          {g.phase === "ready" && "レバーを回して勝負！"}
          {g.phase === "spinning" && (reach ? "リーチ…！" : "ストップで止めていこう")}
          {g.phase === "done" && "そろった！"}
        </div>

        {g.phase !== "done" && (
          <button className={`mb-tap ${spinning ? "opp" : "you"}`} onClick={g.phase === "ready" ? spin : stopNext}>
            {btnLabel}
          </button>
        )}
        <div className="mb-hint">同じ絵柄が2つ以上そろった方が今日のごはん🍽️</div>
      </div>

      {/* 勝敗オーバーレイ */}
      {g.phase === "done" && g.winner && (
        <div className="mb-overlay">
          <div className="mb-confetti">
            {g.confetti.map((c, i) => (
              <span
                key={i}
                className="mb-confetti-piece"
                style={{ left: c.left + "%", background: c.bg, animationDuration: c.dur + "s", animationDelay: c.delay + "s" }}
              />
            ))}
          </div>
          {g.jackpot && <div className="slot-jackpot">🎉 大当たり！ 🎉</div>}
          <div className="mb-win-emoji">{F[g.winner].emoji}</div>
          <div className="mb-win-label">今日のごはんは…</div>
          <div className="mb-win-name">{F[g.winner].label}！</div>
          <div className="mb-win-sub">
            {F[g.winner].side}の{F[g.winner].label}が勝利！
          </div>
          <button className="mb-decide" onClick={() => { playPush(); onDecided(F[g.winner].id); }}>
            このジャンルでお店を探す
          </button>
          <div className="mb-overbtns">
            <button className="mb-ghost" onClick={() => { playPush(); reset(); }}>
              もう一回
            </button>
            {onPickAgain && (
              <button className="mb-ghost" onClick={() => { playPush(); onPickAgain(); }}>
                ゲームを変える
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
