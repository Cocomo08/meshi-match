"use client";

import { useEffect, useRef, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 割り箸勝負（タイミングゲーム・2端末同期）
//  ・カーソルがバーを往復。中心の判定帯で止めるほどきれいに割れる
//  ・より中心に近い位置で止めた方が勝ち（同値のみ大将が独断）
//  ・止めた位置をマーカーで残し、ずれの向きを表示して「上達」できるようにする
//  同期：結果は resHost/resGuest に別キーで書き、勝敗は両者から純関数で算出（両端末一致）

// ── 調整用の定数（1箇所で管理／両者で完全に同一）──
const CFG = {
  CYCLE_MS: 1500,      // カーソル1往復の時間（遅めで狙いやすく＝技術介入）
  TIME_LIMIT: 15000,   // 無操作で自動「無残」になるまで（余裕をもって狙える）
  BAND_MIGOTO: 0.06,   // 見事：中心から±(バー幅の)6%
  BAND_MAZU: 0.18,     // まずまず：±18%（これより外は無残）
  YOI_MS: 800,         // よーいの震え
};

const TIER_COMMENT = { 見事: "お見事。いい手つきだ", まずまず: "まあ、悪くないな", 無残: "そりゃないだろ" };

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 止めた位置(pos 0..1)から割れ方を決める
function evalStop(pos, to = false) {
  const offset = pos - 0.5;
  const dist = Math.abs(offset);
  const tier = dist <= CFG.BAND_MIGOTO ? "見事" : dist <= CFG.BAND_MAZU ? "まずまず" : "無残";
  const split = Math.min(0.94, 0.5 + dist * 0.85);   // 太い側の割合（描画用）
  const wide = offset < 0 ? "L" : "R";
  const thinBreak = tier === "無残";
  return { pos, offset, dist, tier, split, wide, thinBreak, to };
}

const missHint = (pos) => {
  const off = pos - 0.5, d = Math.abs(off);
  if (d <= CFG.BAND_MIGOTO) return "ど真ん中！";
  const side = off > 0 ? "右" : "左";
  return d <= CFG.BAND_MAZU ? `惜しい（${side}へ少し）` : `${side}に行き過ぎ`;
};

const CSS = `
.wb { position:fixed; inset:0; z-index:55; overflow:hidden; color:#f0e6d2;
  font-family: var(--font-zen-maru), sans-serif; background-color:#18110d;
  -webkit-tap-highlight-color:transparent; user-select:none; touch-action:manipulation; }
.wb-wall { position:absolute; inset:0; background-color:#18110d;
  background-image: repeating-linear-gradient(90deg, #241a12 0 60px, #20160f 60px 62px, rgba(0,0,0,.5) 62px 63px); }
.wb-light { position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(60% 42% at 50% 34%, rgba(255,200,140,.14), transparent 72%),
    linear-gradient(180deg, rgba(255,186,116,.20) 0%, rgba(255,150,86,.06) 24%, rgba(0,0,0,0) 48%, rgba(0,0,0,.5) 100%); }
.wb-shake { animation: wbShake .22s ease; }
@keyframes wbShake { 0%,100%{ transform:translate(0,0) } 25%{ transform:translate(-3px,2px) } 60%{ transform:translate(3px,-2px) } }

.wb-in { position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; align-items:center;
  padding:14px 16px calc(16px + env(safe-area-inset-bottom)); }

/* 大将の帯 */
.wb-call { position:relative; background:#f0e6d2; color:#2a2520; border-radius:3px; padding:8px 22px; margin-top:30px;
  font-size:14px; font-weight:900; letter-spacing:.06em; min-height:20px; z-index:4;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.wb-call::before { content:""; position:absolute; left:10px; right:10px; top:-3px; height:3px; background:#241f1c; border-radius:2px; }
.wb-call.go { color:#c0301f; }

/* 残り時間の表記 */
.wb-timer { z-index:4; margin-top:8px; font-size:14px; font-weight:900; letter-spacing:.08em; color:#ffd9a0;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-timer b { font-size:20px; color:#ffcf6a; margin:0 2px; }
.wb-timer.hurry b { color:#ff7a5a; }

/* 止めるボタン（木札・赤／操作を明示）*/
.wb-stopbtn { z-index:4; margin-top:4px; padding:13px 46px; border-radius:6px; border:1px solid #241811;
  background:#7a2018; color:#ffe6d8; font-weight:900; font-size:18px; letter-spacing:.18em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 rgba(255,200,170,.35), inset 0 -2px 0 rgba(0,0,0,.5), 0 3px 0 #3a0d08; }
.wb-stopbtn:active { transform:translateY(2px);
  box-shadow: inset 0 1px 0 rgba(0,0,0,.5), inset 0 -1px 0 rgba(255,200,170,.3), 0 1px 0 #3a0d08; }

/* 舞台：相手（奥・小）＋自分（手前・大）。高さでサイズを決めゲージを必ず画面内に収める */
.wb-stage { flex:1 1 auto; min-height:0; position:relative; width:100%; display:flex; flex-direction:column;
  align-items:center; justify-content:center; }
.wb-opp { position:absolute; top:0; left:50%; transform:translateX(-50%); transform-origin:top center;
  display:flex; flex-direction:column; align-items:center; opacity:.72; filter:brightness(.66) blur(.4px); }
.wb-mine { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; }
.wb-svg { display:block; }
.wb-mine .wb-svg { height:clamp(190px, 38vh, 340px); width:auto; filter: drop-shadow(0 10px 14px rgba(0,0,0,.5)); }
.wb-opp .wb-svg { height:clamp(96px, 16vh, 150px); width:auto; }
.wb-tremble { animation: wbTremble .12s linear infinite; transform-origin:50% 8%; }
@keyframes wbTremble { 0%{ transform:rotate(-1.1deg) } 50%{ transform:rotate(1.1deg) } 100%{ transform:rotate(-1.1deg) } }
.wb-plabel { margin-top:6px; font-size:12px; font-weight:900; letter-spacing:.12em; color:#e8dcc4;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-tier { margin-top:2px; font-size:13px; font-weight:900; letter-spacing:.06em;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-tier.見事 { color:#ffd27a; } .wb-tier.まずまず { color:#e8dcc4; } .wb-tier.無残 { color:#c98a7a; }

/* ── ゲージ（木目調・数値なし）── */
.wb-gaugewrap { position:relative; z-index:4; margin-top:12px; display:flex; flex-direction:column; align-items:center; gap:6px; }
.wb-gauge { position:relative; width:min(82vw,330px); height:26px; border-radius:5px; border:2px solid #241811;
  background:#2a1d12; box-shadow: inset 0 2px 5px rgba(0,0,0,.55); overflow:visible; }
.wb-gclip { position:absolute; inset:0; border-radius:3px; overflow:hidden; }
.wb-band { position:absolute; top:0; bottom:0; left:50%; transform:translateX(-50%); }
.wb-band.mazu   { background:#6f4b2a; }
.wb-band.migoto { background:linear-gradient(180deg,#e6c48c,#bd914f); box-shadow:0 0 10px rgba(230,196,140,.55); }
/* 木目 */
.wb-grain { position:absolute; inset:0; pointer-events:none;
  background: repeating-linear-gradient(90deg, rgba(50,32,16,.22) 0 1px, transparent 1px 9px); }
.wb-center { position:absolute; top:-2px; bottom:-2px; left:50%; width:2px; background:rgba(255,248,230,.5); transform:translateX(-50%); }
.wb-cursor { position:absolute; top:-4px; bottom:-4px; left:50%; width:4px; border-radius:2px; background:#fff0cf;
  box-shadow:0 0 9px rgba(255,224,150,.95); transform:translateX(-50%); }
.wb-mark { position:absolute; top:-11px; left:50%; width:0; height:0; transform:translateX(-50%);
  border-left:6px solid transparent; border-right:6px solid transparent; border-top:10px solid #e0483b; }
.wb-mark.opp { border-top-color:#f0e6d2; opacity:.85; top:auto; bottom:-11px; border-top:0; border-bottom:10px solid #f0e6d2; }
.wb-marklbl { position:absolute; top:-26px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:900; color:#ffb3a6; white-space:nowrap; }
.wb-marklbl.opp { top:auto; bottom:-26px; color:#e8dcc4; }
.wb-miss { font-size:13px; font-weight:900; letter-spacing:.04em; min-height:18px;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-miss.見事 { color:#ffd27a; } .wb-miss.near { color:#ffe0a0; } .wb-miss.far { color:#e0a08f; }
.wb-legend { display:flex; gap:14px; font-size:10px; font-weight:800; color:rgba(240,230,210,.6); letter-spacing:.06em; }
.wb-legend b { color:#e6c48c; } .wb-wait { font-size:13px; font-weight:800; color:#e8dcc4; }

/* 飛び散る木片 */
.wb-chips { position:absolute; left:50%; top:46%; pointer-events:none; z-index:4; }
.wb-chip { position:absolute; left:0; top:0; width:7px; height:3px; background:#caa06a; border-radius:1px;
  animation: wbChip .6s ease-out forwards; }
@keyframes wbChip { from{ transform:translate(-50%,0) rotate(0); opacity:1 } to{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)); opacity:0 } }

/* 決着 */
.wb-over { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:6px; padding:18px 18px calc(18px + env(safe-area-inset-bottom)); text-align:center; background:rgba(6,8,16,.92); animation: wbFade .3s; overflow-y:auto; }
@keyframes wbFade { from{opacity:0} to{opacity:1} }
.wb-win-nm { font-size:26px; font-weight:900; color:#f0e6d2; }
.wb-win-sub { font-size:14px; color:#ffe9cf; font-weight:700; margin-bottom:2px; }

/* 箸の比較（半分サイズ・勝者＝明るい＋赤囲み／敗者＝明度40%ダウン）*/
.wb-duel { display:flex; align-items:flex-start; justify-content:center; gap:22px; }
.wb-duel .col { display:flex; flex-direction:column; align-items:center; gap:4px; }
.wb-duelbox { padding:5px; border-radius:9px; border:2px solid transparent; }
.wb-duelbox.win { border-color:#e0483b; box-shadow:0 0 12px rgba(224,72,59,.5); }
.wb-duelbox.win .wb-svg { filter: brightness(1.08); }
.wb-duelbox.lose .wb-svg { filter: brightness(.6); }
.wb-duel .wb-svg { height:150px; width:auto; display:block; }
.wb-tier.big { font-size:26px; margin-top:0; line-height:1; }

/* 比較ゲージ（単独・上下24px余白＋ラベル分の内側余白）*/
.wb-resgauge { margin:24px 0; padding:28px 0; display:flex; justify-content:center; width:100%; }

/* ボタン */
.wb-btn { border-radius:5px; padding:11px 26px; font-weight:800; letter-spacing:.06em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; border:1px solid; }
.wb-btn.prim { background:#ece0bf; color:#2a2520; border-color:#b7ab84; box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d; }
.wb-btn.prim:active { transform:translateY(2px); box-shadow: inset 0 1px 0 #b0a37d, inset 0 -1px 0 #fff6db; }
.wb-btn.prim.wide { width:min(100%,340px); padding:17px; font-size:19px; letter-spacing:.12em; }
.wb-btn.wood { background:#3a2a1b; color:#e8dcc4; border-color:#241811; box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.wb-btn.wood.small { padding:8px 18px; font-size:13px; letter-spacing:.04em; }
.wb-over-row { display:flex; gap:10px; margin-top:2px; }
.wb-quit { position:absolute; top:10px; left:12px; z-index:5; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .wb-shake, .wb-tremble, .wb-chip { animation:none !important; }   /* 震えと画面の揺れは省略。カーソル往復はJSで維持 */
}
`;

// 割り箸の描画（未使用＝上部で連結／割れると2本に分離）
function Chopsticks({ result, tremble = false }) {
  const angle = result ? 7.5 : 0;
  const cx = 40, gap = 1.5, span = 20, topY = 18, pivotY = 20, fullBot = 286;
  let Lw = span, Rw = span, Lbot = fullBot, Rbot = fullBot;
  if (result) {
    const total = span * 2;
    const wideW = Math.max(6, total * result.split);
    const thinW = Math.max(5, total - wideW);
    if (result.wide === "L") { Lw = wideW; Rw = thinW; } else { Lw = thinW; Rw = wideW; }
    if (result.thinBreak) { if (Rw <= Lw) Rbot = 206; else Lbot = 206; }
  }
  const leftPath = `M ${cx - gap} ${topY} L ${cx - gap - Lw} ${topY} L ${cx - gap - Lw * 0.62} ${Lbot} L ${cx - gap} ${Lbot} Z`;
  const rightPath = `M ${cx + gap} ${topY} L ${cx + gap + Rw} ${topY} L ${cx + gap + Rw * 0.62} ${Rbot} L ${cx + gap} ${Rbot} Z`;
  const wood = "#d8b487", edge = "#9c7440", grain = "rgba(120,80,40,.45)";
  return (
    <svg className={`wb-svg ${tremble ? "wb-tremble" : ""}`} viewBox={result ? "-26 0 132 300" : "0 0 80 300"} fill="none" aria-hidden>
      {!result && <rect x={cx - gap - Lw} y="6" width={2 * span + 2 * gap} height="15" rx="3" fill="#e4c491" stroke={edge} strokeWidth="1" />}
      <g transform={`rotate(${angle} ${cx} ${pivotY})`}>
        <path d={leftPath} fill={wood} stroke={edge} strokeWidth="1.1" strokeLinejoin="round" />
        <line x1={cx - gap - Lw * 0.34} y1={topY + 6} x2={cx - gap - Lw * 0.34} y2={Lbot - 8} stroke={grain} strokeWidth="0.9" />
        <line x1={cx - gap - Lw * 0.72} y1={topY + 10} x2={cx - gap - Lw * 0.72} y2={Lbot - 14} stroke={grain} strokeWidth="0.7" opacity=".7" />
        {result?.thinBreak && Lbot < fullBot && <path d={`M ${cx - gap} ${Lbot} l -3 4 l -3 -3 l -3 4`} stroke={edge} strokeWidth="1" />}
      </g>
      <g transform={`rotate(${-angle} ${cx} ${pivotY})`}>
        <path d={rightPath} fill={wood} stroke={edge} strokeWidth="1.1" strokeLinejoin="round" />
        <line x1={cx + gap + Rw * 0.34} y1={topY + 6} x2={cx + gap + Rw * 0.34} y2={Rbot - 8} stroke={grain} strokeWidth="0.9" />
        <line x1={cx + gap + Rw * 0.72} y1={topY + 10} x2={cx + gap + Rw * 0.72} y2={Rbot - 14} stroke={grain} strokeWidth="0.7" opacity=".7" />
        {result?.thinBreak && Rbot < fullBot && <path d={`M ${cx + gap} ${Rbot} l 3 4 l 3 -3 l 3 4`} stroke={edge} strokeWidth="1" />}
      </g>
    </svg>
  );
}

// ゲージの帯（木目調・数値なし）。markers=[{pos,label,opp}]・cursorRefで生きたカーソル
function GaugeBands() {
  return (
    <div className="wb-gclip">
      <div className="wb-band mazu" style={{ width: `${CFG.BAND_MAZU * 200}%` }} />
      <div className="wb-band migoto" style={{ width: `${CFG.BAND_MIGOTO * 200}%` }} />
      <div className="wb-grain" />
    </div>
  );
}

export default function WaribashiNet({
  myRole = "host",
  hostName = "ホスト",
  guestName = "ゲスト",
  hostGenre,
  guestGenre,
  seed,
  resHost,
  resGuest,
  writeRes,
  onRematch,
  onChangeGame,
  onLeave,
  onDecided,
}) {
  const isHost = myRole === "host";
  const [isRed] = useState(() => reduced());
  const [local, setLocal] = useState("yoi");     // yoi → go
  const [fx, setFx] = useState(null);            // {key, chips}
  const [remainSec, setRemainSec] = useState(Math.ceil(CFG.TIME_LIMIT / 1000));

  const cursorRef = useRef(null);
  const rootRef = useRef(null);
  const t0Ref = useRef(0);
  const rafRef = useRef(0);
  const lastPosRef = useRef(0.5);
  const lastSecRef = useRef(-1);
  const doneRef = useRef(false);
  const stopRef = useRef(() => {});

  const myRes = isHost ? resHost : resGuest;
  const oppRes = isHost ? resGuest : resHost;
  const myDone = !!myRes;
  const bothIn = !!resHost && !!resGuest;

  // 新しい番でリセット → よーい → はじめ
  useEffect(() => {
    doneRef.current = false; lastPosRef.current = 0.5; lastSecRef.current = -1;
    setFx(null); setLocal("yoi"); setRemainSec(Math.ceil(CFG.TIME_LIMIT / 1000));
    const t = setTimeout(() => { t0Ref.current = performance.now(); setLocal("go"); }, isRed ? 300 : CFG.YOI_MS);
    return () => clearTimeout(t);
  }, [seed, isRed]);

  // カーソル往復（JSで駆動＝見た目と停止位置が一致。reduced-motionでも維持）＋制限時間
  useEffect(() => {
    if (local !== "go" || myDone) return;
    const loop = () => {
      const el = performance.now() - t0Ref.current;
      if (el >= CFG.TIME_LIMIT) {
        if (!doneRef.current) { doneRef.current = true; writeRes(myRole, evalStop(lastPosRef.current, true)); }
        return;
      }
      const ph = (el % CFG.CYCLE_MS) / CFG.CYCLE_MS;
      const pos = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      lastPosRef.current = pos;
      if (cursorRef.current) cursorRef.current.style.left = pos * 100 + "%";
      const sec = Math.max(0, Math.ceil((CFG.TIME_LIMIT - el) / 1000));
      if (sec !== lastSecRef.current) { lastSecRef.current = sec; setRemainSec(sec); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, myDone]);

  // 停止（タップ／スペース）
  const stop = () => {
    if (local !== "go" || myDone || doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const res = evalStop(lastPosRef.current, false);
    if (!isRed) {
      const chips = Array.from({ length: 6 }, () => ({
        cx: (Math.random() * 2 - 1) * 90 + "px", cy: 60 + Math.random() * 120 + "px",
        cr: (Math.random() * 2 - 1) * 220 + "deg", d: (Math.random() * 0.1).toFixed(2),
      }));
      setFx({ key: (fx?.key || 0) + 1, chips });
    }
    writeRes(myRole, res);
  };
  stopRef.current = stop;

  // キーボード（スペース／Enter）
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " " || e.code === "Enter") { e.preventDefault(); stopRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 割れる瞬間の画面揺れ
  useEffect(() => {
    if (!fx || isRed) return;
    const el = rootRef.current;
    if (el) { el.classList.remove("wb-shake"); void el.offsetWidth; el.classList.add("wb-shake"); }
    const t = setTimeout(() => el && el.classList.remove("wb-shake"), 240);
    return () => clearTimeout(t);
  }, [fx, isRed]);

  const genreOf = (role) => (role === "host" ? hostGenre : guestGenre);
  const nameOf = (role) => (role === "host" ? hostName : guestName);
  const oppRole = isHost ? "guest" : "host";

  // 勝敗（中心に近い＝distが小さい方勝ち・完全同値のみ大将）
  const tie = bothIn && resHost.dist === resGuest.dist;
  const winner = !bothIn ? null
    : tie ? (mulberry32(seedFrom(String(seed) + "waritie"))() < 0.5 ? "host" : "guest")
    : resHost.dist < resGuest.dist ? "host" : "guest";
  const winGenre = winner ? genreOf(winner) : null;

  const canStop = local === "go" && !myDone;
  const call = local === "yoi" ? "よーい…"
    : canStop ? "はじめっ！ ここぞで止めろ"
    : myDone && !bothIn ? (myRes ? TIER_COMMENT[myRes.tier] : "")
    : "";

  const missClass = myRes ? (myRes.tier === "見事" ? "見事" : myRes.dist <= CFG.BAND_MAZU ? "near" : "far") : "";

  return (
    <div className="wb" ref={rootRef} onPointerDown={canStop ? stop : undefined}>
      <style>{CSS}</style>
      <div className="wb-wall" />
      <div className="wb-light" />
      {!(bothIn && winner) && (
        <button className="wb-quit" onClick={onChangeGame} onPointerDown={(e) => e.stopPropagation()}>ゲーム変更</button>
      )}

      <div className="wb-in">
        {!(bothIn && winner) && (
          <>
            <div className={`wb-call ${canStop ? "go" : ""}`}>{call || "割り箸勝負"}</div>
            {canStop && (
              <div className={`wb-timer ${remainSec <= 3 ? "hurry" : ""}`}>のこり<b>{remainSec}</b>秒</div>
            )}
            <div className="wb-stage">
              {/* 相手（奥・小）*/}
              <div className="wb-opp">
                <Chopsticks result={oppRes} />
                <div className="wb-plabel">{nameOf(oppRole)}</div>
                {oppRes && <div className={`wb-tier ${oppRes.tier}`}>{oppRes.tier}</div>}
              </div>

              {/* 自分（手前・大）*/}
              <div className="wb-mine">
                <Chopsticks result={myRes} tremble={local === "yoi" && !isRed} />
                <div className="wb-plabel">{nameOf(myRole)}（きみ）</div>
                {myRes && <div className={`wb-tier ${myRes.tier}`}>{myRes.tier}</div>}
              </div>

              {/* 木片 */}
              {fx && (
                <div className="wb-chips" key={fx.key}>
                  {fx.chips.map((c, k) => (
                    <span key={k} className="wb-chip" style={{ "--cx": c.cx, "--cy": c.cy, "--cr": c.cr, animationDelay: c.d + "s" }} />
                  ))}
                </div>
              )}
            </div>

            {/* ゲージ */}
            <div className="wb-gaugewrap">
              <div className="wb-gauge">
                <GaugeBands />
                <div className="wb-center" />
                {canStop && <div className="wb-cursor" ref={cursorRef} />}
                {myRes && <div className="wb-mark" style={{ left: `${myRes.pos * 100}%` }} />}
              </div>
              {myRes ? (
                <>
                  <div className={`wb-miss ${missClass}`}>{missHint(myRes.pos)}</div>
                  {!bothIn && <div className="wb-wait">相手を待て…</div>}
                </>
              ) : (
                <>
                  {canStop && (
                    <button className="wb-stopbtn" onPointerDown={(e) => { e.stopPropagation(); stop(); }}>
                      止める
                    </button>
                  )}
                  <div className="wb-legend"><span>中心＝<b>見事</b></span><span>外側＝まずまず</span><span>端＝無残</span></div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 決着 */}
      {bothIn && winner && (
        <div className="wb-over">
          {/* 見出し */}
          <div className="wb-win-nm">{nameOf(winner)} の勝ち</div>
          <div className="wb-win-sub">
            {tie ? "同着…大将の独断で " : ""}今日は「{winGenre?.label}」で決まりだ
          </div>

          {/* 箸の比較（勝者＝明るい＋赤囲み／敗者＝暗い。判定文字は各箸の真下に大きく）*/}
          <div className="wb-duel">
            <div className="col">
              <div className={`wb-duelbox ${winner === myRole ? "win" : "lose"}`}>
                <Chopsticks result={isHost ? resHost : resGuest} />
              </div>
              <div className={`wb-tier big ${myRes.tier}`}>{myRes.tier}</div>
              <div className="wb-plabel">{nameOf(myRole)}</div>
            </div>
            <div className="col">
              <div className={`wb-duelbox ${winner === oppRole ? "win" : "lose"}`}>
                <Chopsticks result={isHost ? resGuest : resHost} />
              </div>
              <div className={`wb-tier big ${oppRes.tier}`}>{oppRes.tier}</div>
              <div className="wb-plabel">{nameOf(oppRole)}</div>
            </div>
          </div>

          {/* 比較ゲージ（単独・上下24px余白／きみ＝上赤・あいて＝下生成り）*/}
          <div className="wb-resgauge">
            <div className="wb-gauge">
              <GaugeBands />
              <div className="wb-center" />
              <div className="wb-mark" style={{ left: `${myRes.pos * 100}%` }} />
              <div className="wb-marklbl" style={{ left: `${myRes.pos * 100}%` }}>きみ</div>
              <div className="wb-mark opp" style={{ left: `${oppRes.pos * 100}%` }} />
              <div className="wb-marklbl opp" style={{ left: `${oppRes.pos * 100}%` }}>あいて</div>
            </div>
          </div>

          {/* ボタン（店をさがす＝本命・全幅／もう一回・部屋を出る＝小さめ暗木札）*/}
          <button className="wb-btn prim wide" onClick={() => onDecided?.(winGenre?.id)}>店をさがす</button>
          <div className="wb-over-row">
            <button className="wb-btn wood small" onClick={onRematch}>もう一回</button>
            <button className="wb-btn wood small" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
