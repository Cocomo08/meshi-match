"use client";

import { useEffect, useRef, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 割り箸勝負（運と技術が半々・2端末同期）
//  ・「よーい」で箸が震え→「はじめ」でドラッグして割る
//  ・ドラッグの速さと角度で割れ方が決まる（速すぎ＝細く折れる／遅すぎ＝ささくれる／適切＝均等）
//  ・割れた2本の太さの差が小さい方が勝ち。差は resHost/resGuest に別キーで書く
//  ・勝敗は両者の diff から純関数で算出（両端末で一致）。同点は大将が独断（seedで一意）

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ドラッグ→割れ方の判定（技術半分・運半分）
function evalSplit(distPx, driftPx, dtMs) {
  const IDEAL_LO = 0.5, IDEAL_HI = 0.95;          // px/ms の適正帯
  const speed = distPx / Math.max(60, dtMs);
  const tooShort = distPx < 80;
  const tooSlow = speed < IDEAL_LO || tooShort;
  const tooFast = speed > IDEAL_HI;
  let speedErr = 0;
  if (speed < IDEAL_LO) speedErr = (IDEAL_LO - speed) / IDEAL_LO;
  else if (speed > IDEAL_HI) speedErr = (speed - IDEAL_HI) / 1.2;
  speedErr = Math.min(1, speedErr);
  const angleErr = Math.min(1, (driftPx / Math.max(distPx, 1)) * 2.0);
  const tech = Math.min(1, 0.7 * speedErr + 0.55 * angleErr + (tooShort ? 0.5 : 0));
  const luck = Math.random();                     // 運（半々）
  const diff = Math.min(1, 0.55 * tech + 0.5 * luck * luck);
  const splinter = tooSlow && !tooFast;
  const thinBreak = tooFast;
  const tier = diff < 0.14 ? "見事" : diff < 0.42 ? "まずまず" : "無残";
  const split = Math.min(0.94, 0.5 + diff * 0.46);   // 太い側の割合（描画用）
  const wide = Math.random() < 0.5 ? "L" : "R";
  return { diff, tier, split, wide, splinter, thinBreak, to: false };
}

const CSS = `
.wb { position:fixed; inset:0; z-index:55; overflow:hidden; color:#f0e6d2;
  font-family: var(--font-zen-maru), sans-serif; background-color:#18110d;
  -webkit-tap-highlight-color:transparent; user-select:none; touch-action:none; }
/* 屋台の内壁（縦板＋上からの提灯光・低彩度の茶と黒のみ）*/
.wb-wall { position:absolute; inset:0; background-color:#18110d;
  background-image: repeating-linear-gradient(90deg, #241a12 0 60px, #20160f 60px 62px, rgba(0,0,0,.5) 62px 63px); }
.wb-light { position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(60% 42% at 50% 34%, rgba(255,200,140,.14), transparent 72%),
    linear-gradient(180deg, rgba(255,186,116,.20) 0%, rgba(255,150,86,.06) 24%, rgba(0,0,0,0) 48%, rgba(0,0,0,.5) 100%); }

.wb-in { position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; align-items:center;
  padding:16px 16px calc(16px + env(safe-area-inset-bottom)); }
.wb-shake { animation: wbShake .22s ease; }
@keyframes wbShake { 0%,100%{ transform:translate(0,0) } 25%{ transform:translate(-3px,2px) } 60%{ transform:translate(3px,-2px) } }

/* のれん帯：合図 */
.wb-call { position:relative; background:#f0e6d2; color:#2a2520; border-radius:3px; padding:8px 22px; margin-top:4px;
  font-size:15px; font-weight:900; letter-spacing:.08em; min-height:20px;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.wb-call::before { content:""; position:absolute; left:10px; right:10px; top:-3px; height:3px; background:#241f1c; border-radius:2px; }
.wb-call.go { color:#c0301f; }

/* 舞台：相手（奥・小）＋自分（手前・大）*/
.wb-stage { flex:1; position:relative; width:100%; display:flex; align-items:center; justify-content:center; }
.wb-opp { position:absolute; top:2%; left:50%; transform:translateX(-50%) scale(.52); transform-origin:top center;
  opacity:.72; filter:brightness(.66) blur(.4px); }
.wb-opp .wb-plabel { color:#cdbfa6; }
.wb-mine { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; }
.wb-hold { touch-action:none; cursor:grab; }
.wb-hold:active { cursor:grabbing; }
.wb-svg { display:block; }
.wb-mine .wb-svg { width:min(46vw,168px); height:auto; filter: drop-shadow(0 10px 14px rgba(0,0,0,.5)); }
.wb-opp .wb-svg { width:150px; height:auto; }
.wb-tremble { animation: wbTremble .12s linear infinite; transform-origin:50% 8%; }
@keyframes wbTremble { 0%{ transform:rotate(-1.1deg) } 50%{ transform:rotate(1.1deg) } 100%{ transform:rotate(-1.1deg) } }
.wb-plabel { margin-top:6px; font-size:12px; font-weight:900; letter-spacing:.12em; color:#e8dcc4;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-tier { margin-top:2px; font-size:13px; font-weight:900; letter-spacing:.06em;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-tier.見事 { color:#ffd27a; } .wb-tier.まずまず { color:#e8dcc4; } .wb-tier.無残 { color:#c98a7a; }

/* ドラッグ誘導の矢印 */
.wb-guide { margin-top:8px; font-size:12px; font-weight:800; letter-spacing:.06em; color:rgba(240,230,210,.72);
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.wb-arrow { display:inline-block; animation: wbA 1s ease-in-out infinite; }
@keyframes wbA { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(4px) } }
.wb-wait { margin-top:8px; font-size:13px; font-weight:800; color:#e8dcc4; }

/* 飛び散る木片 */
.wb-chips { position:absolute; left:0; right:0; top:44%; pointer-events:none; z-index:3; }
.wb-chip { position:absolute; left:50%; top:0; width:7px; height:3px; background:#caa06a; border-radius:1px;
  animation: wbChip .6s ease-out forwards; }
@keyframes wbChip { from{ transform:translate(-50%,0) rotate(0); opacity:1 } to{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)); opacity:0 } }

/* 決着 */
.wb-over { position:absolute; inset:0; z-index:5; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; padding:20px 18px calc(20px + env(safe-area-inset-bottom)); text-align:center; background:rgba(6,8,16,.86); animation: wbFade .3s; }
@keyframes wbFade { from{opacity:0} to{opacity:1} }
.wb-duel { display:flex; align-items:flex-end; justify-content:center; gap:18px; }
.wb-duel .col { display:flex; flex-direction:column; align-items:center; }
.wb-duel .wb-svg { width:96px; height:auto; }
.wb-win-nm { font-size:26px; font-weight:900; color:#f0e6d2; }
.wb-win-sub { font-size:14px; color:#ffe9cf; font-weight:700; }
.wb-btn { border-radius:5px; padding:12px 28px; font-weight:800; letter-spacing:.06em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; border:1px solid; }
.wb-btn.prim { background:#ece0bf; color:#2a2520; border-color:#b7ab84; box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d; }
.wb-btn.prim:active { transform:translateY(2px); box-shadow: inset 0 1px 0 #b0a37d, inset 0 -1px 0 #fff6db; }
.wb-btn.wood { background:#3a2a1b; color:#e8dcc4; border-color:#241811; box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.wb-over-row { display:flex; gap:10px; }
.wb-quit { position:absolute; top:10px; left:12px; z-index:4; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .wb-shake, .wb-tremble, .wb-arrow, .wb-chip { animation:none !important; }
}
`;

// 割り箸の描画（未使用＝上部で連結／割れると2本に分離）
function Chopsticks({ result, openAmt = 0, tremble = false }) {
  const angle = result ? (result.splinter ? 3.5 : 7.5) : openAmt * 8;
  const cx = 40, gap = 1.5, span = 20, topY = 18, pivotY = 20, fullBot = 286;
  let Lw = span, Rw = span, Lbot = fullBot, Rbot = fullBot;
  if (result) {
    const total = span * 2;
    const wideW = Math.max(6, total * result.split);
    const thinW = Math.max(5, total - wideW);
    if (result.wide === "L") { Lw = wideW; Rw = thinW; } else { Lw = thinW; Rw = wideW; }
    if (result.thinBreak) { if (Rw <= Lw) Rbot = 206; else Lbot = 206; } // 細い方が短く折れる
  }
  const leftPath = `M ${cx - gap} ${topY} L ${cx - gap - Lw} ${topY} L ${cx - gap - Lw * 0.62} ${Lbot} L ${cx - gap} ${Lbot} Z`;
  const rightPath = `M ${cx + gap} ${topY} L ${cx + gap + Rw} ${topY} L ${cx + gap + Rw * 0.62} ${Rbot} L ${cx + gap} ${Rbot} Z`;
  const wood = "#d8b487", edge = "#9c7440", grain = "rgba(120,80,40,.45)";
  // ささくれ（内側に短い毛羽）
  const fray = (x, y, dir) =>
    result?.splinter ? (
      <g stroke={edge} strokeWidth="0.8" opacity=".8">
        <path d={`M ${x} ${y} l ${dir * 3} 6`} />
        <path d={`M ${x} ${y + 5} l ${dir * 2} 7`} />
        <path d={`M ${x} ${y + 10} l ${dir * 4} 5`} />
      </g>
    ) : null;
  return (
    <svg className={`wb-svg ${tremble ? "wb-tremble" : ""}`} viewBox="0 0 80 300" fill="none" aria-hidden>
      {/* 連結部（未使用時のみ・上でつながっている）*/}
      {!result && <rect x={cx - gap - Lw} y="6" width={2 * span + 2 * gap} height="15" rx="3" fill="#e4c491" stroke={edge} strokeWidth="1" />}
      {/* 左箸 */}
      <g transform={`rotate(${angle} ${cx} ${pivotY})`}>
        <path d={leftPath} fill={wood} stroke={edge} strokeWidth="1.1" strokeLinejoin="round" />
        <line x1={cx - gap - Lw * 0.34} y1={topY + 6} x2={cx - gap - Lw * 0.34} y2={Lbot - 8} stroke={grain} strokeWidth="0.9" />
        <line x1={cx - gap - Lw * 0.72} y1={topY + 10} x2={cx - gap - Lw * 0.72} y2={Lbot - 14} stroke={grain} strokeWidth="0.7" opacity=".7" />
        {result?.thinBreak && Lbot < fullBot && (
          <path d={`M ${cx - gap} ${Lbot} l -3 4 l -3 -3 l -3 4`} stroke={edge} strokeWidth="1" />
        )}
        {fray(cx - gap - 1, Lbot - 26, -1)}
      </g>
      {/* 右箸 */}
      <g transform={`rotate(${-angle} ${cx} ${pivotY})`}>
        <path d={rightPath} fill={wood} stroke={edge} strokeWidth="1.1" strokeLinejoin="round" />
        <line x1={cx + gap + Rw * 0.34} y1={topY + 6} x2={cx + gap + Rw * 0.34} y2={Rbot - 8} stroke={grain} strokeWidth="0.9" />
        <line x1={cx + gap + Rw * 0.72} y1={topY + 10} x2={cx + gap + Rw * 0.72} y2={Rbot - 14} stroke={grain} strokeWidth="0.7" opacity=".7" />
        {result?.thinBreak && Rbot < fullBot && (
          <path d={`M ${cx + gap} ${Rbot} l 3 4 l 3 -3 l 3 4`} stroke={edge} strokeWidth="1" />
        )}
        {fray(cx + gap + 1, Rbot - 26, 1)}
      </g>
    </svg>
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
  const [openAmt, setOpenAmt] = useState(0);
  const [fx, setFx] = useState(null);            // {key, chips}
  const dragRef = useRef(null);
  const autoRef = useRef(0);
  const rootRef = useRef(null);

  const myRes = isHost ? resHost : resGuest;
  const oppRes = isHost ? resGuest : resHost;
  const myDone = !!myRes;
  const bothIn = !!resHost && !!resGuest;

  // 新しい番（seed変更・もう一番）でローカルをリセット → よーい → はじめ
  useEffect(() => {
    setLocal("yoi"); setOpenAmt(0); dragRef.current = null;
    const t = setTimeout(() => setLocal("go"), isRed ? 300 : 800);
    return () => clearTimeout(t);
  }, [seed, isRed]);

  // 時間切れ（放置対策・合図から3秒以内に決着）
  useEffect(() => {
    if (local !== "go" || myDone) return;
    autoRef.current = setTimeout(() => {
      writeRes(myRole, {
        diff: 0.6 + Math.random() * 0.3, tier: "無残",
        split: 0.72 + Math.random() * 0.2, wide: Math.random() < 0.5 ? "L" : "R",
        splinter: true, thinBreak: false, to: true,
      });
    }, 2600);
    return () => clearTimeout(autoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, myDone]);

  // 割れる瞬間の演出（画面3px揺れ＋木片）
  useEffect(() => {
    if (!fx || isRed) return;
    const el = rootRef.current;
    if (el) { el.classList.remove("wb-shake"); void el.offsetWidth; el.classList.add("wb-shake"); }
    const t = setTimeout(() => el && el.classList.remove("wb-shake"), 240);
    return () => clearTimeout(t);
  }, [fx, isRed]);

  const canDrag = local === "go" && !myDone;

  const onDown = (e) => {
    if (!canDrag) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, t0: performance.now(), maxDown: 0, driftMax: 0, active: true };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d?.active) return;
    const down = Math.max(0, e.clientY - d.sy);
    d.maxDown = Math.max(d.maxDown, down);
    d.driftMax = Math.max(d.driftMax, Math.abs(e.clientX - d.sx));
    setOpenAmt(Math.min(1, down / 170));
  };
  const onUp = () => {
    const d = dragRef.current;
    if (!d?.active) return;
    d.active = false;
    clearTimeout(autoRef.current);
    const dt = performance.now() - d.t0;
    const result = evalSplit(d.maxDown, d.driftMax, dt);
    if (!isRed) {
      const chips = Array.from({ length: 6 }, (_, k) => ({
        cx: (Math.random() * 2 - 1) * 90 + "px",
        cy: 60 + Math.random() * 120 + "px",
        cr: (Math.random() * 2 - 1) * 220 + "deg",
        d: (Math.random() * 0.1).toFixed(2),
      }));
      setFx({ key: (fx?.key || 0) + 1, chips });
    }
    writeRes(myRole, result);
  };

  const genreOf = (role) => (role === "host" ? hostGenre : guestGenre);
  const nameOf = (role) => (role === "host" ? hostName : guestName);
  const oppRole = isHost ? "guest" : "host";

  // 勝敗（差が小さい方が勝ち・同点は大将の独断＝seedで一意）
  const near = bothIn && Math.abs(resHost.diff - resGuest.diff) < 0.02;
  const bothTo = bothIn && resHost.to && resGuest.to;
  const tie = near || bothTo;
  const winner = !bothIn ? null
    : tie ? (mulberry32(seedFrom(String(seed) + "waritie"))() < 0.5 ? "host" : "guest")
    : resHost.diff < resGuest.diff ? "host" : "guest";
  const winGenre = winner ? genreOf(winner) : null;

  const call = local === "yoi" ? "よーい…"
    : canDrag ? "はじめっ！"
    : myDone && !bothIn ? "相手が割ってる…"
    : "";

  return (
    <div className="wb" ref={rootRef}>
      <style>{CSS}</style>
      <div className="wb-wall" />
      <div className="wb-light" />
      <button className="wb-quit" onClick={onChangeGame}>ゲーム変更</button>

      <div className="wb-in">
        <div className={`wb-call ${canDrag ? "go" : ""}`}>{call || "割り箸勝負"}</div>

        {!(bothIn && winner) && (
        <div className="wb-stage">
          {/* 相手（奥・小）*/}
          <div className="wb-opp">
            <Chopsticks result={oppRes} openAmt={0} tremble={local !== "yoi" && !oppRes && !isRed ? false : false} />
            <div className="wb-plabel">{nameOf(oppRole)}</div>
            {oppRes && <div className={`wb-tier ${oppRes.tier}`}>{oppRes.tier}</div>}
          </div>

          {/* 自分（手前・大）*/}
          <div className="wb-mine" style={{ marginTop: "34%" }}>
            <div className="wb-hold" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <Chopsticks result={myRes} openAmt={openAmt} tremble={local === "yoi" && !isRed} />
            </div>
            <div className="wb-plabel">{nameOf(myRole)}（きみ）</div>
            {myRes ? (
              <div className={`wb-tier ${myRes.tier}`}>{myRes.tier}</div>
            ) : canDrag ? (
              <div className="wb-guide"><span className="wb-arrow">▼</span> 下へ引いて割れ</div>
            ) : null}
            {myDone && !bothIn && <div className="wb-wait">相手を待て…</div>}
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
        )}
      </div>

      {/* 決着 */}
      {bothIn && winner && (
        <div className="wb-over">
          <div className="wb-duel">
            <div className="col">
              <Chopsticks result={isHost ? resHost : resGuest} />
              <div className="wb-plabel">{nameOf(myRole)}</div>
              <div className={`wb-tier ${myRes.tier}`}>{myRes.tier}</div>
            </div>
            <div className="col">
              <Chopsticks result={isHost ? resGuest : resHost} />
              <div className="wb-plabel">{nameOf(oppRole)}</div>
              <div className={`wb-tier ${oppRes.tier}`}>{oppRes.tier}</div>
            </div>
          </div>
          <div className="wb-win-nm">{nameOf(winner)} の勝ち</div>
          <div className="wb-win-sub">
            {tie ? "痛み分け…大将の独断で " : ""}今日は「{winGenre?.label}」で決まりだ
          </div>
          <button className="wb-btn prim" onClick={() => onDecided?.(winGenre?.id)}>この味に決める</button>
          <div className="wb-over-row">
            <button className="wb-btn wood" onClick={onRematch}>もう一番</button>
            <button className="wb-btn wood" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
