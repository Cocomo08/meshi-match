"use client";

import { useEffect, useReducer, useRef } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSound, playPush, playTick, playFanfare } from "@/components/sound";
import { mulberry32, seedFrom } from "@/lib/rng";

const W = 300, H = 384;
const LANE_X = [55, 150, 245];
const Y_TOP = 22, ROWS = 7, Y_BOTTOM = 322;
const ROW_Y = (r) => 64 + r * 38;

const CONFETTI_COLORS = ["#ffd400", "#ff6b6f", "#5b8bff", "#22c55e", "#f97316", "#ffffff"];
function makeConfetti(rng) {
  const p = [];
  for (let i = 0; i < 72; i++)
    p.push({
      left: Math.round(rng() * 100),
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: (1.6 + rng() * 1.5).toFixed(2),
      delay: (rng() * 0.5).toFixed(2),
    });
  return p;
}

function trace(start, rungs) {
  let lane = start;
  const pts = [{ x: LANE_X[lane], y: Y_TOP }];
  for (let r = 0; r < ROWS; r++) {
    const y = ROW_Y(r);
    pts.push({ x: LANE_X[lane], y });
    const rr = rungs[r];
    let nl = lane;
    if (rr === "L") nl = lane === 0 ? 1 : lane === 1 ? 0 : lane;
    else if (rr === "R") nl = lane === 1 ? 2 : lane === 2 ? 1 : lane;
    if (nl !== lane) {
      lane = nl;
      pts.push({ x: LANE_X[lane], y });
    }
  }
  pts.push({ x: LANE_X[lane], y: Y_BOTTOM });
  return { end: lane, pts };
}

// seed から決定的にあみだを構築（lane0=host / lane2=guest）
function buildLadder(seed) {
  const rng = mulberry32(seedFrom(seed));
  let rungs, host, guest;
  for (let i = 0; i < 20; i++) {
    rungs = Array.from({ length: ROWS }, () => {
      const p = rng();
      return p < 0.34 ? "L" : p < 0.68 ? "R" : "none";
    });
    host = trace(0, rungs);
    guest = trace(2, rungs);
    if (host.end !== guest.end) break;
  }
  const crownLane = rng() < 0.5 ? host.end : guest.end;
  const winner = crownLane === host.end ? "host" : "guest";
  return { rungs, hostPts: host.pts, guestPts: guest.pts, crownLane, winner, confetti: makeConfetti(rng) };
}

// あみだくじ（2台同期・seed駆動）。lane0=host / lane2=guest で両端末とも同一。
export function MeshiAmidaNet({ hostGenre, guestGenre, myRole, seed, started, onStart, onRematch, onChangeGame, onLeave, onDecided }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const timersRef = useRef([]);
  const gRef = useRef({ seed: null, phase: "ready", step: 0, ladder: null });
  const g = gRef.current;
  const soundOn = isSoundEnabled();

  // seed が変わったら組み直し
  if (g.seed !== seed) {
    g.seed = seed;
    g.ladder = buildLadder(seed);
    g.phase = "ready";
    g.step = 0;
  }
  const L = g.ladder;
  const maxLen = Math.max(L.hostPts.length, L.guestPts.length);

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
  }, []);

  // started が true になったらトレース開始（両端末で独立に同じ結果へ）
  useEffect(() => {
    if (started && g.phase === "ready") {
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
          addTimer(() => {
            g.phase = "done";
            playFanfare();
            force();
          }, 400);
        }
      };
      addTimer(stepFn, 350);
    }
    if (!started && g.phase !== "ready") {
      clearTimers();
      g.phase = "ready";
      g.step = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, seed]);

  const toggleSound = () => {
    setSoundEnabled(!isSoundEnabled());
    if (isSoundEnabled()) playPush();
    force();
  };

  // 表示ヘルパ：side('host'|'guest') → きみ/あいて・色
  const genreOf = (side) => (side === "host" ? hostGenre : guestGenre);
  const isMine = (side) => side === myRole;
  const sideLabel = (side) => (isMine(side) ? "きみ" : "あいて");
  const sideCls = (side) => (isMine(side) ? "you" : "opp");

  const posOf = (pts) => pts[Math.min(g.step, pts.length - 1)];
  const pct = (v, t) => (v / t) * 100 + "%";
  const showDots = g.phase !== "ready";
  const revealed = g.phase === "done";
  const winSide = L.winner;
  const winGenre = genreOf(winSide);

  return (
    <div className="mb-root">
      <button className={`mb-sound ${soundOn ? "" : "off"}`} onClick={toggleSound} aria-label="サウンド切り替え">
        {soundOn ? "🔊" : "🔇"}
      </button>
      <button className="mb-quit" onClick={onLeave} aria-label="退出">✕</button>

      <div className="mb-app amida-app">
        <div className="mb-title">運命のあみだ <small>AMIDA</small></div>
        <div className="slot-vs">
          <span className={`slot-vs-tag ${sideCls("host")}`}>{sideLabel("host")} {hostGenre.emoji}</span>
          <span className="slot-vs-x">VS</span>
          <span className={`slot-vs-tag ${sideCls("guest")}`}>{sideLabel("guest")} {guestGenre.emoji}</span>
        </div>

        <div className="amida-canvas">
          <svg viewBox={`0 0 ${W} ${H}`} className="amida-svg" preserveAspectRatio="xMidYMid meet">
            {LANE_X.map((x, i) => (
              <line key={`v${i}`} x1={x} y1={Y_TOP} x2={x} y2={Y_BOTTOM} className="amida-vline" />
            ))}
            {L.rungs.map((rr, r) => {
              if (rr === "none") return null;
              const a = rr === "L" ? 0 : 1;
              const y = ROW_Y(r);
              return <line key={`h${r}`} x1={LANE_X[a]} y1={y} x2={LANE_X[a + 1]} y2={y} className="amida-rung" />;
            })}
            <text x={LANE_X[0]} y={Y_TOP - 4} className="amida-token">{hostGenre.emoji}</text>
            <text x={LANE_X[1]} y={Y_TOP - 4} className="amida-token dice">🎲</text>
            <text x={LANE_X[2]} y={Y_TOP - 4} className="amida-token">{guestGenre.emoji}</text>
            {LANE_X.map((x, i) => {
              const isCrown = i === L.crownLane;
              return (
                <g key={`b${i}`}>
                  <rect x={x - 22} y={Y_BOTTOM + 8} width="44" height="34" rx="7" className={`amida-box ${revealed && isCrown ? "win" : ""}`} />
                  <text x={x} y={Y_BOTTOM + 31} className="amida-boxtext">{revealed ? (isCrown ? "👑" : "✕") : "?"}</text>
                </g>
              );
            })}
          </svg>
          {showDots && (
            <>
              <span className={`amida-dot ${sideCls("host")}`} style={{ left: pct(posOf(L.hostPts).x, W), top: pct(posOf(L.hostPts).y, H) }}>{hostGenre.emoji}</span>
              <span className={`amida-dot ${sideCls("guest")}`} style={{ left: pct(posOf(L.guestPts).x, W), top: pct(posOf(L.guestPts).y, H) }}>{guestGenre.emoji}</span>
            </>
          )}
        </div>

        <div className="slot-msg">
          {g.phase === "ready" && "スタートで運命をたどる！"}
          {g.phase === "tracing" && "どこに着く…？"}
          {g.phase === "done" && "👑にたどり着いた方の勝ち！"}
        </div>

        {g.phase === "ready" && (
          <button className="mb-tap you" onClick={() => { playPush(); onStart(); }}>スタート！</button>
        )}
        <div className="mb-hint">👑にたどり着いた食べ物が今日のごはん🍽️</div>
      </div>

      {g.phase === "done" && (
        <div className="mb-overlay">
          <div className="mb-confetti">
            {L.confetti.map((c, i) => (
              <span key={i} className="mb-confetti-piece" style={{ left: c.left + "%", background: c.bg, animationDuration: c.dur + "s", animationDelay: c.delay + "s" }} />
            ))}
          </div>
          <div className="mb-win-emoji">{winGenre.emoji}</div>
          <div className="mb-win-label">今日のごはんは…</div>
          <div className="mb-win-name">{winGenre.label}！</div>
          <div className="mb-win-sub">{sideLabel(winSide)}の{winGenre.label}が勝利！</div>
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
