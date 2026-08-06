"use client";

import { useEffect, useRef, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 早食い勝負（連打ではなく「待つ判断」・2端末同期）
//  ・タップで麺が一口減る。ただし湯気(熱い)が出ている間にタップすると「アチッ」1.2秒操作不能
//  ・湯気は不規則な間隔で発生し2〜3秒で消える。消えている間だけ安全に食べられる
//  ・先に完食した方が勝ち。20秒で時間切れ→残量が少ない方の勝ち
//  ・【重要】湯気の発生タイミングは seed で決めた同一スケジュールを、各端末が
//    自分のプレイ開始時刻を起点に再生する＝両者で完全に同一（連打で理不尽にならない）
//  同期：残量/完食は resHost/resGuest に別キーで書く。勝敗は両者から純関数で算出。

const N = 12;               // 完食までの一口数
const BITE_CD = 320;        // 一口ごとの咀嚼クールタイム（この間のタップは無効＝連打対策）
const GAME_MS = 20000;      // 1ゲーム上限
const ACHI_MS = 1200;       // アチッの操作不能時間

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 湯気スケジュール（seedで一意・両端末同一）: [開始ms, 終了ms] の配列
function steamSchedule(seed) {
  const rng = mulberry32(seedFrom(String(seed) + "steam"));
  const w = [];
  let t = 500 + rng() * 900;              // 最初の湯気
  while (t < GAME_MS - 500) {
    const dur = 2000 + rng() * 1000;      // 2〜3秒 熱い
    w.push([t, Math.min(GAME_MS, t + dur)]);
    t = t + dur + (1300 + rng() * 1500);  // 1.3〜2.8秒 安全
  }
  return w;
}

const SENSEI_SAFE = ["そのペースだ", "慌てるな"];
const SENSEI_HOT = ["熱いうちは待て", "慌てるな"];
const SENSEI_ACHI = "言わんこっちゃない";

const CSS = `
.hy { position:fixed; inset:0; z-index:55; overflow:hidden; color:#f0e6d2;
  font-family: var(--font-zen-maru), sans-serif; background-color:#18110d;
  -webkit-tap-highlight-color:transparent; user-select:none; touch-action:manipulation; }
.hy-wall { position:absolute; inset:0; background-color:#18110d;
  background-image: repeating-linear-gradient(90deg, #241a12 0 60px, #20160f 60px 62px, rgba(0,0,0,.5) 62px 63px); }
.hy-light { position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(60% 42% at 50% 32%, rgba(255,200,140,.14), transparent 72%),
    linear-gradient(180deg, rgba(255,186,116,.20) 0%, rgba(255,150,86,.06) 24%, rgba(0,0,0,0) 48%, rgba(0,0,0,.5) 100%); }

.hy-in { position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; align-items:center;
  padding:14px 16px calc(16px + env(safe-area-inset-bottom)); }

/* 大将の帯 */
.hy-master { display:flex; align-items:center; gap:10px; align-self:stretch; max-width:440px; margin:0 auto; }
.hy-face { flex:0 0 auto; width:46px; height:46px; }
.hy-face svg { width:100%; height:100%; display:block; }
.hy-speech { position:relative; flex:1; background:#f0e6d2; color:#2a2520; border-radius:4px; padding:8px 12px;
  font-size:13px; font-weight:800; min-height:20px; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.hy-speech::before { content:""; position:absolute; left:-9px; top:14px; border:6px solid transparent; border-right-color:#f0e6d2; }
.hy-speech.achi { background:#efd0c6; color:#8a1c0c; }

/* 丼のステージ */
.hy-stage { flex:1; position:relative; width:100%; display:flex; align-items:center; justify-content:center; }
.hy-opp { position:absolute; top:2%; left:50%; transform:translateX(-50%) scale(.5); transform-origin:top center;
  opacity:.74; filter:brightness(.7); }
.hy-mine { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; margin-top:30%; }
.hy-bowlwrap { position:relative; cursor:pointer; }
.hy-mine .hy-bowl { width:min(54vw,208px); height:auto; display:block; filter: drop-shadow(0 12px 16px rgba(0,0,0,.55)); }
.hy-opp .hy-bowl { width:180px; height:auto; display:block; }
.hy-bowlwrap.frozen { animation: hyShake .3s linear 4; }
@keyframes hyShake { 0%,100%{ transform:translate(0,0) } 25%{ transform:translate(-4px,2px) } 75%{ transform:translate(4px,-2px) } }

/* 湯気（丼の上・熱い間だけ濃く立ちのぼる）*/
.hy-steam { position:absolute; left:6%; right:6%; top:-40%; height:70%; pointer-events:none; display:flex;
  justify-content:center; align-items:flex-end; gap:15%; opacity:0; transition: opacity .5s ease; }
.hy-steam.on { opacity:1; }
.hy-steam i { display:block; width:11px; height:100%; border-radius:50%;
  background: linear-gradient(180deg, transparent, rgba(255,242,224,.6) 52%, rgba(255,246,232,.78));
  filter: blur(2.6px); transform-origin:bottom center; animation: hySteam 2.4s ease-in-out infinite; }
.hy-steam i:nth-child(2){ animation-delay:.5s; height:86%; } .hy-steam i:nth-child(3){ animation-delay:1s; height:78%; }
.hy-steam i:nth-child(4){ animation-delay:.3s; height:90%; }
@keyframes hySteam {
  0%{ transform:translateY(30%) scaleY(.65) skewX(0deg); opacity:0; }
  25%{ opacity:.9; } 60%{ transform:translateY(-2%) scaleY(1.08) skewX(7deg); opacity:.55; }
  100%{ transform:translateY(-34%) scaleY(1.25) skewX(-7deg); opacity:0; }
}

/* アチッ！ */
.hy-achi { position:absolute; left:50%; top:20%; transform:translateX(-50%); z-index:4; font-weight:900; font-size:26px;
  color:#ffd9cf; text-shadow:0 0 12px rgba(224,72,59,.9), 0 2px 3px rgba(0,0,0,.6); pointer-events:none;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; animation: hyAchi .8s ease-out; }
@keyframes hyAchi { 0%{ opacity:0; transform:translate(-50%,6px) scale(.7) } 25%{ opacity:1; transform:translate(-50%,-6px) scale(1.15) } 100%{ opacity:0; transform:translate(-50%,-22px) scale(1) } }

.hy-plabel { margin-top:10px; font-size:12px; font-weight:900; letter-spacing:.12em; color:#e8dcc4;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.hy-hint { margin-top:4px; font-size:12px; font-weight:800; color:rgba(240,230,210,.66);
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.hy-hint.hot { color:#ff7a63; }
.hy-done { margin-top:4px; font-size:13px; font-weight:900; color:#ffd27a; }

/* のれん帯：残り時間（漢数字ではなく提灯の減り…ではなく細い帯の目減り→ここは湯気状態を出さず時間帯のみ）*/
.hy-time { align-self:center; margin-top:2px; height:5px; width:min(70vw,260px); border-radius:3px; background:rgba(0,0,0,.4); overflow:hidden; }
.hy-time i { display:block; height:100%; background:linear-gradient(90deg,#ffcf6a,#e0483b); }

/* 決着 */
.hy-over { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; padding:20px 18px calc(20px + env(safe-area-inset-bottom)); text-align:center; background:rgba(6,8,16,.87); animation: hyFade .3s; }
@keyframes hyFade { from{opacity:0} to{opacity:1} }
.hy-duel { display:flex; align-items:flex-end; justify-content:center; gap:20px; }
.hy-duel .col { display:flex; flex-direction:column; align-items:center; }
.hy-duel .hy-bowl { width:110px; height:auto; }
.hy-win-nm { font-size:26px; font-weight:900; color:#f0e6d2; }
.hy-win-sub { font-size:14px; color:#ffe9cf; font-weight:700; }
.hy-btn { border-radius:5px; padding:12px 28px; font-weight:800; letter-spacing:.06em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; border:1px solid; }
.hy-btn.prim { background:#ece0bf; color:#2a2520; border-color:#b7ab84; box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d; }
.hy-btn.prim:active { transform:translateY(2px); box-shadow: inset 0 1px 0 #b0a37d, inset 0 -1px 0 #fff6db; }
.hy-btn.wood { background:#3a2a1b; color:#e8dcc4; border-color:#241811; box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.hy-over-row { display:flex; gap:10px; }
.hy-quit { position:absolute; top:10px; left:12px; z-index:5; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .hy-steam i { animation:none; opacity:.7; transform:none; }   /* 湯気の動きを簡略化（濃さで熱さを表示）*/
  .hy-bowlwrap.frozen { animation:none; }
  .hy-achi { animation:none; }
}
`;

function MasterFace({ talking }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="#f0e6d2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="32" cy="36" r="19" />
      <path d="M13 25 Q32 17 51 25" stroke="#e0483b" strokeWidth="4" />
      <path d="M51 25 l6 -4 M51 25 l5 6" stroke="#e0483b" strokeWidth="4" />
      <path d="M25 37 h.01" strokeWidth="4.5" /><path d="M39 37 h.01" strokeWidth="4.5" />
      {talking ? <path d="M27 45 q5 5 10 0" /> : <path d="M27 46 h10" />}
    </svg>
  );
}

// 丼＋麺（残量 fill 0..1・全てSVG／画像なし）。hot で縁が赤らむ
function Bowl({ fill = 1, hot = false, className = "" }) {
  const f = Math.max(0, Math.min(1, fill));
  // 麺の盛り：fillが高いほど縁の上に大きく盛り上がる
  const moundCy = 40 - f * 20;               // 上ほど高く盛る
  const moundRx = 20 + f * 26;
  const moundRy = 5 + f * 15;
  const rim = hot ? "#ff5a44" : "#7a5a42";
  const rimGlow = hot ? "drop-shadow(0 0 6px rgba(255,80,60,.85))" : "none";
  return (
    <svg className={`hy-bowl ${className}`} viewBox="0 0 140 118" fill="none" aria-hidden style={{ filter: rimGlow }}>
      {/* 丼の奥の縁（麺の後ろ）*/}
      <path d="M18 40 A 52 13 0 0 1 122 40" stroke="#3a2a1e" strokeWidth="3" />
      {/* 汁 */}
      <ellipse cx="70" cy="41" rx="49" ry="11" fill="#2a1d12" />
      {/* 麺の盛り（縁の上に出た分が見える）*/}
      {f > 0.02 && (
        <g>
          <ellipse cx="70" cy={moundCy} rx={moundRx} ry={moundRy} fill="#efe0b8" opacity={Math.min(1, 0.25 + f)} />
          {/* 麺の筋 */}
          <g stroke="#cdb582" strokeWidth="1.1" opacity={Math.min(1, 0.3 + f)} strokeLinecap="round">
            <path d={`M ${70 - moundRx * 0.7} ${moundCy} q ${moundRx * 0.35} ${-moundRy} ${moundRx * 0.7} 0`} />
            <path d={`M ${70 - moundRx * 0.5} ${moundCy + moundRy * 0.5} q ${moundRx * 0.5} ${-moundRy} ${moundRx} 0`} />
            <path d={`M ${70 - moundRx * 0.8} ${moundCy - moundRy * 0.4} q ${moundRx * 0.4} ${-moundRy * 0.8} ${moundRx * 0.8} 0`} />
          </g>
        </g>
      )}
      {/* 丼の本体（黒い漆・手前側が麺の下半分を隠す）*/}
      <path d="M18 40 A 52 13 0 0 0 122 40 L 112 82 Q 70 106 28 82 Z" fill="#241a13" stroke={rim} strokeWidth="3.5" strokeLinejoin="round" />
      {/* 内側の赤いふち（雷文の代わりの一本線）*/}
      <path d="M24 44 Q 70 66 116 44" stroke={hot ? "#ff7358" : "#8a3b2a"} strokeWidth="2.4" fill="none" opacity=".9" />
      {/* 高台 */}
      <path d="M52 96 L88 96" stroke="#3a2a1e" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function MeshiHayaguiNet({
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
  const [local, setLocal] = useState("ready");       // ready → go
  const [remaining, setRemaining] = useState(N);
  const [hot, setHot] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [prog, setProg] = useState(0);               // 経過割合 0..1（時間帯）
  const [sensei, setSensei] = useState({ text: "腹減ったろ。よーいで箸をとれ", key: 0, achi: false });
  const [achiFx, setAchiFx] = useState(0);

  const t0Ref = useRef(0);
  const lastBiteRef = useRef(-9999);
  const freezeRef = useRef(0);
  const doneRef = useRef(false);
  const remRef = useRef(N);
  const sched = useRef(steamSchedule(seed)).current;

  const myRes = isHost ? resHost : resGuest;
  const oppRes = isHost ? resGuest : resHost;
  const myDone = !!(myRes && myRes.done);
  const bothDone = !!(resHost && resHost.done) && !!(resGuest && resGuest.done);

  const isHotAt = (ms) => sched.some(([a, b]) => ms >= a && ms < b);

  // 新しい番でリセット → ready(0.7s) → go
  useEffect(() => {
    doneRef.current = false; remRef.current = N; lastBiteRef.current = -9999;
    setRemaining(N); setHot(false); setFrozen(false); setProg(0); setLocal("ready");
    const t = setTimeout(() => { t0Ref.current = performance.now(); setLocal("go"); }, isRed ? 300 : 700);
    return () => clearTimeout(t);
  }, [seed, isRed]);

  // ゲームループ（120ms）：湯気の熱さ判定・経過・20秒で時間切れ
  useEffect(() => {
    if (local !== "go") return;
    const id = setInterval(() => {
      const el = performance.now() - t0Ref.current;
      setProg(Math.min(1, el / GAME_MS));
      setHot(isHotAt(el));
      if (el >= GAME_MS && !doneRef.current) {
        doneRef.current = true;
        writeRes(myRole, { remaining: remRef.current, finishedAt: null, done: true, to: true });
      }
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  // 大将のセリフ（不定期・自分の状態に軽く反応。同期不要）
  useEffect(() => {
    if (local !== "go") return;
    const id = setInterval(() => {
      if (doneRef.current || freezeRef.current) return;
      const el = performance.now() - t0Ref.current;
      const pool = isHotAt(el) ? SENSEI_HOT : SENSEI_SAFE;
      const line = pool[Math.floor(Math.random() * pool.length)];
      setSensei((s) => ({ text: line, key: s.key + 1, achi: false }));
    }, 3200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const eat = () => {
    if (local !== "go" || myDone || frozen || doneRef.current) return;
    const now = performance.now();
    if (now - lastBiteRef.current < BITE_CD) return;         // 咀嚼中（連打無効）
    const el = now - t0Ref.current;
    if (isHotAt(el)) {                                        // アチッ！
      setFrozen(true); freezeRef.current = 1;
      setSensei((s) => ({ text: SENSEI_ACHI, key: s.key + 1, achi: true }));
      if (!isRed) setAchiFx((k) => k + 1);
      setTimeout(() => { setFrozen(false); freezeRef.current = 0; }, ACHI_MS);
      return;
    }
    lastBiteRef.current = now;
    const nr = remRef.current - 1;
    remRef.current = nr; setRemaining(nr);
    if (nr <= 0) {
      doneRef.current = true;
      writeRes(myRole, { remaining: 0, finishedAt: Math.round(el), done: true, to: false });
    } else {
      writeRes(myRole, { remaining: nr, finishedAt: null, done: false, to: false });
    }
  };

  const genreOf = (role) => (role === "host" ? hostGenre : guestGenre);
  const nameOf = (role) => (role === "host" ? hostName : guestName);
  const oppRole = isHost ? "guest" : "host";

  // 勝敗（純関数・両端末一致）：残量が少ない方勝ち→同数なら完食が早い方→なお同点は大将
  let winner = null, tie = false;
  if (bothDone) {
    const a = resHost, b = resGuest;
    if (a.remaining !== b.remaining) winner = a.remaining < b.remaining ? "host" : "guest";
    else if (a.finishedAt != null && b.finishedAt != null && a.finishedAt !== b.finishedAt)
      winner = a.finishedAt < b.finishedAt ? "host" : "guest";
    else { winner = mulberry32(seedFrom(String(seed) + "hayatie"))() < 0.5 ? "host" : "guest"; tie = true; }
  }
  const winGenre = winner ? genreOf(winner) : null;

  const myFill = remaining / N;
  const oppFill = oppRes ? oppRes.remaining / N : 1;

  const hint = local !== "go" ? "" : frozen ? "アチッ…！ しばし待て" : hot ? "熱い！ 湯気が消えるまで待て" : "今だ、食え！";

  return (
    <div className="hy">
      <style>{CSS}</style>
      <div className="hy-wall" />
      <div className="hy-light" />
      <button className="hy-quit" onClick={onChangeGame}>ゲーム変更</button>

      <div className="hy-in">
        {/* 大将 */}
        <div className="hy-master">
          <div className="hy-face"><MasterFace talking={local === "go" && !myDone} /></div>
          <div className={`hy-speech ${sensei.achi ? "achi" : ""}`} key={sensei.key}>{sensei.text}</div>
        </div>

        {!bothDone && (
          <div className="hy-stage">
            {/* 相手（奥・小）*/}
            <div className="hy-opp">
              <div className="hy-bowlwrap">
                <div className={`hy-steam ${oppRes && !oppRes.done ? "" : ""}`}><i /><i /><i /><i /></div>
                <Bowl fill={oppFill} hot={false} />
              </div>
              <div className="hy-plabel">{nameOf(oppRole)}</div>
              {oppRes && oppRes.done && <div className="hy-done">{oppRes.remaining === 0 ? "完食！" : "時間切れ"}</div>}
            </div>

            {/* 自分（手前・大）*/}
            <div className="hy-mine">
              <div className={`hy-bowlwrap ${frozen ? "frozen" : ""}`} key={`bw-${achiFx}`}
                onPointerDown={eat} role="button" aria-label="食べる">
                <div className={`hy-steam ${hot ? "on" : ""}`}><i /><i /><i /><i /></div>
                <Bowl fill={myFill} hot={hot} />
                {achiFx > 0 && <div className="hy-achi" key={achiFx}>アチッ！</div>}
              </div>
              <div className="hy-plabel">{nameOf(myRole)}（きみ）</div>
              {myDone ? (
                <div className="hy-done">{remaining === 0 ? "完食！ 相手を待て…" : "時間切れ"}</div>
              ) : (
                <div className={`hy-hint ${hot ? "hot" : ""}`}>{hint}</div>
              )}
            </div>
          </div>
        )}

        {!bothDone && <div className="hy-time"><i style={{ width: `${100 - prog * 100}%` }} /></div>}
      </div>

      {/* 決着 */}
      {bothDone && winner && (
        <div className="hy-over">
          <div className="hy-duel">
            <div className="col">
              <Bowl fill={(isHost ? resHost : resGuest).remaining / N} />
              <div className="hy-plabel">{nameOf(myRole)}</div>
              <div className="hy-done">{(isHost ? resHost : resGuest).remaining === 0 ? "完食" : "時間切れ"}</div>
            </div>
            <div className="col">
              <Bowl fill={(isHost ? resGuest : resHost).remaining / N} />
              <div className="hy-plabel">{nameOf(oppRole)}</div>
              <div className="hy-done">{(isHost ? resGuest : resHost).remaining === 0 ? "完食" : "時間切れ"}</div>
            </div>
          </div>
          <div className="hy-win-nm">{nameOf(winner)} の勝ち</div>
          <div className="hy-win-sub">
            {tie ? "同着…大将の独断で " : ""}今日は「{winGenre?.label}」で決まりだ
          </div>
          <button className="hy-btn prim" onClick={() => onDecided?.(winGenre?.id)}>この味に決める</button>
          <div className="hy-over-row">
            <button className="hy-btn wood" onClick={onRematch}>もう一番</button>
            <button className="hy-btn wood" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
