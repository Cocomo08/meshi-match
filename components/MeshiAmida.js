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

// ── あみだくじの座標系（viewBox 300 x 384）──
const W = 300;
const H = 384;
const LANE_X = [55, 150, 245];
const Y_TOP = 22;
const ROWS = 7;
const ROW_Y = (r) => 64 + r * 38; // r0=64 .. r6=292
const Y_BOTTOM = 322;

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

// 横木をランダム生成（各段 なし / 左(0-1) / 右(1-2)）
function makeRungs() {
  const rungs = [];
  for (let r = 0; r < ROWS; r++) {
    const p = Math.random();
    rungs.push(p < 0.34 ? "L" : p < 0.68 ? "R" : "none");
  }
  return rungs;
}

// スタートlaneからの経路（点列）と到達laneを返す
function trace(start, rungs) {
  let lane = start;
  const pts = [{ x: LANE_X[lane], y: Y_TOP }];
  for (let r = 0; r < ROWS; r++) {
    const y = ROW_Y(r);
    pts.push({ x: LANE_X[lane], y }); // 下へ
    const rr = rungs[r];
    let nl = lane;
    if (rr === "L") nl = lane === 0 ? 1 : lane === 1 ? 0 : lane;
    else if (rr === "R") nl = lane === 1 ? 2 : lane === 2 ? 1 : lane;
    if (nl !== lane) {
      lane = nl;
      pts.push({ x: LANE_X[lane], y }); // 横へ
    }
  }
  pts.push({ x: LANE_X[lane], y: Y_BOTTOM });
  return { end: lane, pts };
}

// 2品が別々の下端に着くあみだを生成（勝者は運で決まる）
function buildLadder() {
  let rungs, you, opp;
  for (let i = 0; i < 20; i++) {
    rungs = makeRungs();
    you = trace(0, rungs);
    opp = trace(2, rungs);
    if (you.end !== opp.end) break;
  }
  const crownLane = Math.random() < 0.5 ? you.end : opp.end;
  const winner = crownLane === you.end ? "you" : "opp";
  return { rungs, youPts: you.pts, oppPts: opp.pts, crownLane, winner };
}

// あみだくじで今日のごはんを決める運ゲー。
export function MeshiAmida({ you, opp, onDecided, onQuit, onPickAgain }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const timersRef = useRef([]);

  const gRef = useRef(null);
  if (gRef.current === null) {
    const ladder = buildLadder();
    gRef.current = {
      fighters: {
        you: { side: "きみ", cls: "you", ...you },
        opp: { side: "あいて", cls: "opp", ...opp },
      },
      phase: "ready", // ready | tracing | done
      step: 0,
      confetti: [],
      ...ladder,
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

  useEffect(() => {
    const unsub = subscribeSound(() => force());
    return () => {
      clearTimers();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxLen = Math.max(g.youPts.length, g.oppPts.length);

  const start = () => {
    playPush();
    g.phase = "tracing";
    g.step = 0;
    force();
    const stepFn = () => {
      g.step += 1;
      if (g.step < maxLen - 1) {
        playTick();
        force();
        addTimer(stepFn, 300);
      } else {
        g.step = maxLen - 1;
        playTick();
        force();
        addTimer(finish, 400);
      }
    };
    addTimer(stepFn, 350);
  };

  const finish = () => {
    g.phase = "done";
    g.confetti = makeConfetti();
    playFanfare();
    force();
  };

  const reset = () => {
    clearTimers();
    Object.assign(g, buildLadder());
    g.phase = "ready";
    g.step = 0;
    g.confetti = [];
    force();
  };

  const toggleSound = () => {
    setSoundEnabled(!isSoundEnabled());
    if (isSoundEnabled()) playPush();
    force();
  };

  const posOf = (pts) => pts[Math.min(g.step, pts.length - 1)];
  const pct = (v, total) => (v / total) * 100 + "%";
  const showDots = g.phase !== "ready";
  const revealed = g.phase === "done";

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

      <div className="mb-app amida-app">
        <div className="mb-title">
          運命のあみだ <small>AMIDA</small>
        </div>

        <div className="slot-vs">
          <span className="slot-vs-tag you">きみ {F.you.emoji}</span>
          <span className="slot-vs-x">VS</span>
          <span className="slot-vs-tag opp">あいて {F.opp.emoji}</span>
        </div>

        <div className="amida-canvas">
          <svg viewBox={`0 0 ${W} ${H}`} className="amida-svg" preserveAspectRatio="xMidYMid meet">
            {/* 縦の柱 */}
            {LANE_X.map((x, i) => (
              <line key={`v${i}`} x1={x} y1={Y_TOP} x2={x} y2={Y_BOTTOM} className="amida-vline" />
            ))}
            {/* 横木 */}
            {g.rungs.map((rr, r) => {
              if (rr === "none") return null;
              const a = rr === "L" ? 0 : 1;
              const b = a + 1;
              const y = ROW_Y(r);
              return <line key={`h${r}`} x1={LANE_X[a]} y1={y} x2={LANE_X[b]} y2={y} className="amida-rung" />;
            })}
            {/* 上のトークン */}
            <text x={LANE_X[0]} y={Y_TOP - 4} className="amida-token">{F.you.emoji}</text>
            <text x={LANE_X[1]} y={Y_TOP - 4} className="amida-token dice">🎲</text>
            <text x={LANE_X[2]} y={Y_TOP - 4} className="amida-token">{F.opp.emoji}</text>
            {/* 下の結果ボックス */}
            {LANE_X.map((x, i) => {
              const isCrown = i === g.crownLane;
              return (
                <g key={`b${i}`}>
                  <rect x={x - 22} y={Y_BOTTOM + 8} width="44" height="34" rx="7"
                    className={`amida-box ${revealed && isCrown ? "win" : ""}`} />
                  <text x={x} y={Y_BOTTOM + 31} className="amida-boxtext">
                    {revealed ? (isCrown ? "👑" : "✕") : "?"}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* トレース中の玉（HTMLオーバーレイ） */}
          {showDots && (
            <>
              <span
                className="amida-dot you"
                style={{ left: pct(posOf(g.youPts).x, W), top: pct(posOf(g.youPts).y, H) }}
              >
                {F.you.emoji}
              </span>
              <span
                className="amida-dot opp"
                style={{ left: pct(posOf(g.oppPts).x, W), top: pct(posOf(g.oppPts).y, H) }}
              >
                {F.opp.emoji}
              </span>
            </>
          )}
        </div>

        <div className="slot-msg">
          {g.phase === "ready" && "スタートで運命をたどる！"}
          {g.phase === "tracing" && "どこに着く…？"}
          {g.phase === "done" && "👑にたどり着いた方の勝ち！"}
        </div>

        {g.phase === "ready" && (
          <button className="mb-tap you" onClick={start}>
            スタート！
          </button>
        )}
        <div className="mb-hint">👑にたどり着いた食べ物が今日のごはん🍽️</div>
      </div>

      {/* 勝敗オーバーレイ */}
      {g.phase === "done" && (
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
