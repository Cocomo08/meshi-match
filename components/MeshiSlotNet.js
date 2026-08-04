"use client";

import { useEffect, useReducer, useRef } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSound, playPush, playTick, playFanfare } from "@/components/sound";
import { mulberry32, seedFrom } from "@/lib/rng";

const CONFETTI_COLORS = ["#ffd400", "#ff6b6f", "#5b8bff", "#22c55e", "#f97316", "#ffffff"];
const STOP_MS = [900, 1350, 1800]; // 各リールの停止タイミング

// seed から決定的にスロット結果を作る（symbols は 'host'|'guest' の絶対表現）
function buildSlot(seed) {
  const rng = mulberry32(seedFrom(seed));
  const symbols = [0, 1, 2].map(() => (rng() < 0.5 ? "host" : "guest"));
  const hostCount = symbols.filter((s) => s === "host").length;
  const winner = hostCount >= 2 ? "host" : "guest";
  const jackpot = hostCount === 3 || hostCount === 0;
  const confetti = [];
  for (let i = 0; i < 72; i++)
    confetti.push({
      left: Math.round(rng() * 100),
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: (1.6 + rng() * 1.5).toFixed(2),
      delay: (rng() * 0.5).toFixed(2),
    });
  return { symbols, winner, jackpot, confetti };
}

// メシスロット（2台同期・seed駆動）。symbols は host/guest の絶対表現で両端末とも同一。
export function MeshiSlotNet({ hostGenre, guestGenre, myRole, seed, started, onStart, onRematch, onChangeGame, onLeave, onDecided }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const reelRefs = [useRef(null), useRef(null), useRef(null)];
  const rafRef = useRef(0);
  const timersRef = useRef([]);
  const gRef = useRef({ seed: null, phase: "ready", spinning: [false, false, false], stopped: [null, null, null], slot: null });
  const g = gRef.current;
  const soundOn = isSoundEnabled();

  if (g.seed !== seed) {
    g.seed = seed;
    g.slot = buildSlot(seed);
    g.phase = "ready";
    g.spinning = [false, false, false];
    g.stopped = [null, null, null];
  }
  const S = g.slot;

  const emojiOf = (side) => (side === "host" ? hostGenre.emoji : guestGenre.emoji);
  const genreOf = (side) => (side === "host" ? hostGenre : guestGenre);
  const isMine = (side) => side === myRole;
  const sideLabel = (side) => (isMine(side) ? "きみ" : "あいて");
  const sideCls = (side) => (isMine(side) ? "you" : "opp");

  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // 回転中リールの絵文字を高速で切り替え
  useEffect(() => {
    const loop = (now) => {
      g.spinning.forEach((sp, i) => {
        if (sp && reelRefs[i].current) {
          const which = Math.floor(now / 80 + i * 3) % 2;
          reelRefs[i].current.textContent = which === 0 ? hostGenre.emoji : guestGenre.emoji;
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
  }, [hostGenre.emoji, guestGenre.emoji]);

  // started で自動スピン→seedの結果へ順次停止
  useEffect(() => {
    if (started && g.phase === "ready") {
      g.phase = "spinning";
      g.spinning = [true, true, true];
      g.stopped = [null, null, null];
      force();
      STOP_MS.forEach((ms, i) => {
        addTimer(() => {
          g.spinning[i] = false;
          g.stopped[i] = S.symbols[i];
          if (reelRefs[i].current) reelRefs[i].current.textContent = emojiOf(S.symbols[i]);
          playTick();
          force();
          if (i === STOP_MS.length - 1) {
            addTimer(() => {
              g.phase = "done";
              playFanfare();
              force();
            }, 450);
          }
        }, ms);
      });
    }
    if (!started && g.phase !== "ready") {
      clearTimers();
      g.phase = "ready";
      g.spinning = [false, false, false];
      g.stopped = [null, null, null];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, seed]);

  const toggleSound = () => {
    setSoundEnabled(!isSoundEnabled());
    if (isSoundEnabled()) playPush();
    force();
  };

  const stoppedSyms = g.stopped.filter(Boolean);
  const reach = g.phase === "spinning" && stoppedSyms.length === 2 && stoppedSyms[0] === stoppedSyms[1];
  const winGenre = genreOf(S.winner);

  return (
    <div className="mb-root">
      <button className={`mb-sound ${soundOn ? "" : "off"}`} onClick={toggleSound} aria-label="サウンド切り替え">
        {soundOn ? "🔊" : "🔇"}
      </button>
      <button className="mb-quit" onClick={onLeave} aria-label="退出">✕</button>

      <div className="mb-app slot-app">
        <div className="mb-title">メシスロット <small>SLOT</small></div>
        <div className="slot-vs">
          <span className={`slot-vs-tag ${sideCls("host")}`}>{sideLabel("host")} {hostGenre.emoji}</span>
          <span className="slot-vs-x">VS</span>
          <span className={`slot-vs-tag ${sideCls("guest")}`}>{sideLabel("guest")} {guestGenre.emoji}</span>
        </div>

        <div className="slot-machine">
          <div className={`slot-reels ${reach ? "reach" : ""}`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`slot-reel ${g.spinning[i] ? "spin" : "stopped"}`}>
                <span className="slot-sym" ref={reelRefs[i]}>{g.stopped[i] ? emojiOf(g.stopped[i]) : hostGenre.emoji}</span>
              </div>
            ))}
          </div>
          <div className="slot-payline" aria-hidden />
        </div>

        <div className="slot-msg">
          {g.phase === "ready" && "スピンで勝負！"}
          {g.phase === "spinning" && (reach ? "リーチ…！" : "止まるのを待とう")}
          {g.phase === "done" && "そろった！"}
        </div>

        {g.phase === "ready" && (
          <button className="mb-tap you" onClick={() => { playPush(); onStart(); }}>スピン！</button>
        )}
        <div className="mb-hint">同じ絵柄が2つ以上そろった方が今日のごはん🍽️</div>
      </div>

      {g.phase === "done" && (
        <div className="mb-overlay">
          <div className="mb-confetti">
            {S.confetti.map((c, i) => (
              <span key={i} className="mb-confetti-piece" style={{ left: c.left + "%", background: c.bg, animationDuration: c.dur + "s", animationDelay: c.delay + "s" }} />
            ))}
          </div>
          {S.jackpot && <div className="slot-jackpot">🎉 大当たり！ 🎉</div>}
          <div className="mb-win-emoji">{winGenre.emoji}</div>
          <div className="mb-win-label">今日のごはんは…</div>
          <div className="mb-win-name">{winGenre.label}！</div>
          <div className="mb-win-sub">{sideLabel(S.winner)}の{winGenre.label}が勝利！</div>
          <button className="mb-decide" onClick={() => { playPush(); onDecided(winGenre.id); }}>このジャンルで店を決める</button>
          <div className="mb-overbtns">
            <button className="mb-ghost" onClick={() => { playPush(); onRematch(); }}>もう一回</button>
            <button className="mb-ghost" onClick={() => { playPush(); onChangeGame(); }}>ゲームを変える</button>
          </div>
        </div>
      )}
    </div>
  );
}
