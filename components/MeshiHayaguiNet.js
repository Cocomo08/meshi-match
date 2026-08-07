"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  padding:12px 16px calc(14px + env(safe-area-inset-bottom)); }

/* 大将の帯（右上の「ゲーム変更」ボタンと重ならないよう右側を空ける）*/
.hy-master { display:flex; align-items:center; gap:10px; align-self:stretch; max-width:440px; margin:0 auto; padding-right:80px; }
.hy-face { flex:0 0 auto; width:44px; height:44px; }
.hy-face svg { width:100%; height:100%; display:block; }
.hy-speech { position:relative; flex:1; background:#f0e6d2; color:#2a2520; border-radius:4px; padding:8px 12px;
  font-size:13px; font-weight:800; min-height:20px; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.hy-speech::before { content:""; position:absolute; left:-9px; top:14px; border:6px solid transparent; border-right-color:#f0e6d2; }
.hy-speech.achi { background:#efd0c6; color:#8a1c0c; }

/* 丼のステージ */
.hy-stage { flex:1; position:relative; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; }
.hy-opp { position:relative; margin-top:6px; display:flex; flex-direction:column; align-items:center;
  opacity:.7; filter:brightness(.7); }   /* 明度30%ダウン */
.hy-opp .hy-bowl { width:132px; height:auto; display:block; }
.hy-opp .hy-plabel { font-size:15px; margin-top:2px; }
.hy-mine { position:relative; z-index:2; margin-top:auto; display:flex; flex-direction:column; align-items:center; }
.hy-bowlwrap { position:relative; cursor:pointer; }
.hy-mine .hy-bowl { width:min(48vw,178px); height:auto; display:block; }
.hy-bowlwrap.frozen { animation: hyShake .3s linear 4; }
@keyframes hyShake { 0%,100%{ transform:translate(0,0) } 25%{ transform:translate(-4px,2px) } 75%{ transform:translate(4px,-2px) } }

/* 湯気（丼の上・熱い間だけ濃く立ちのぼる）*/
.hy-steam { position:absolute; left:10%; right:10%; top:-38%; height:66%; pointer-events:none; display:flex;
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

/* アチッ！（丼の上・湯気の位置に大きく）*/
.hy-achi { position:absolute; left:50%; top:-30%; transform:translateX(-50%); z-index:5; font-weight:900; font-size:30px;
  color:#ffd9cf; text-shadow:0 0 14px rgba(224,72,59,.95), 0 2px 3px rgba(0,0,0,.7); pointer-events:none; white-space:nowrap;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; animation: hyAchi .9s ease-out; }
@keyframes hyAchi { 0%{ opacity:0; transform:translate(-50%,10px) scale(.7) } 22%{ opacity:1; transform:translate(-50%,-4px) scale(1.18) } 100%{ opacity:0; transform:translate(-50%,-26px) scale(1) } }

.hy-plabel { margin-top:8px; font-size:12px; font-weight:900; letter-spacing:.12em; color:#e8dcc4;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.hy-hint { margin-top:8px; font-size:14px; font-weight:900; letter-spacing:.04em; color:#e8dcc4;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.hy-hint.hot { color:#ff7a63; }
.hy-done { margin-top:8px; font-size:14px; font-weight:900; color:#ffd27a; }

/* 連打ボタン（券売機の生成りボタン・状態で見た目が変わる）*/
.hy-eat { width:80%; max-width:360px; min-height:72px; margin-top:6px; border-radius:9px; border:2px solid #b7ab84;
  background:#ece0bf; color:#2a2520; font-weight:900; font-size:23px; letter-spacing:.16em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d, 0 3px 0 #a99a6f;
  transition: background .12s, color .12s, border-color .12s; }
.hy-eat.safe { border-color:#e0483b;
  box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d, 0 3px 0 #a99a6f, 0 0 9px rgba(224,72,59,.55); }
.hy-eat.hot { background:#6f5a3a; color:#f0e2c2; border-color:#ff5a44; animation: hyEatWarn .5s ease-in-out infinite; }
@keyframes hyEatWarn {
  0%,100%{ border-color:#a83a2e; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.4), 0 3px 0 #2e2416, 0 0 0 rgba(255,90,68,0); }
  50%{ border-color:#ff5a44; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.4), 0 3px 0 #2e2416, 0 0 14px rgba(255,90,68,.9); }
}
.hy-eat.frozen { background:#332a1e; color:#7f7058; border-color:#5a2018; cursor:not-allowed;
  box-shadow: inset 0 2px 5px rgba(0,0,0,.6); }
.hy-eat.safe:active, .hy-eat.hot:active { transform:translateY(3px);
  box-shadow: inset 0 2px 0 #b0a37d, inset 0 -1px 0 #fff6db, 0 0 0 #a99a6f; }

/* 残り時間バー（ラベル付き）*/
.hy-timerow { align-self:center; display:flex; align-items:center; gap:8px; margin-top:8px; }
.hy-timelbl { font-size:11px; font-weight:800; letter-spacing:.06em; color:rgba(240,230,210,.66);
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.hy-time { height:6px; width:min(56vw,220px); border-radius:3px; background:rgba(0,0,0,.45); overflow:hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.5); }
.hy-time i { display:block; height:100%; background:linear-gradient(90deg,#ffcf6a,#e0483b); }

/* 決着 */
.hy-over { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; padding:20px 18px calc(20px + env(safe-area-inset-bottom)); text-align:center; background:rgba(6,8,16,.9); animation: hyFade .3s; }
@keyframes hyFade { from{opacity:0} to{opacity:1} }
.hy-duel { display:flex; align-items:flex-end; justify-content:center; gap:20px; }
.hy-duel .col { display:flex; flex-direction:column; align-items:center; }
.hy-duel .hy-bowl { width:120px; height:auto; }
.hy-win-nm { font-size:26px; font-weight:900; color:#f0e6d2; }
.hy-win-sub { font-size:14px; color:#ffe9cf; font-weight:700; }
.hy-btn { border-radius:5px; padding:12px 28px; font-weight:800; letter-spacing:.06em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; border:1px solid; }
.hy-btn.prim { background:#ece0bf; color:#2a2520; border-color:#b7ab84; box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d; }
.hy-btn.prim.wide { width:min(100%,340px); padding:16px; font-size:18px; letter-spacing:.12em; }
.hy-btn.prim:active { transform:translateY(2px); box-shadow: inset 0 1px 0 #b0a37d, inset 0 -1px 0 #fff6db; }
.hy-btn.wood { background:#3a2a1b; color:#e8dcc4; border-color:#241811; box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.hy-btn.wood.small { padding:8px 18px; font-size:13px; }
.hy-over-row { display:flex; gap:10px; margin-top:2px; }
.hy-quit { position:absolute; top:10px; right:12px; z-index:7; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .hy-steam i { animation:none; opacity:.7; transform:none; }   /* 湯気の動きを簡略化（濃さで熱さを表示）*/
  .hy-bowlwrap.frozen { animation:none; }
  .hy-achi { animation:none; }
  .hy-eat.hot { animation:none; }
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

// ラーメン丼（残量 fill 0..1・全てSVG／画像なし）。hot で口縁が赤らむ
// グラデーションはスープの面と湯気のみ（湯気はCSS側）
function Bowl({ fill = 1, hot = false, className = "" }) {
  const uid = useId().replace(/[:]/g, "");
  const clipId = `hyc${uid}`, soupId = `hys${uid}`;
  const f = Math.max(0, Math.min(1, fill));
  const rim = hot ? "#ff6a4a" : "#c73a24";
  const glow = hot ? "drop-shadow(0 0 8px rgba(255,90,60,.9))" : "drop-shadow(0 7px 8px rgba(0,0,0,.5))";

  // スープの面（fillが減るほど下がる。丼の口の内側に収める）
  const soupY = 48 + (1 - f) * 10;       // 46..58
  const soupRx = 46 + f * 8, soupRy = 9 + f * 2;

  // 麺（線を重ねて束に。fillで本数が変わる。すべて口の楕円内にクリップ）
  const nLines = f <= 0.02 ? 0 : Math.max(3, Math.round(4 + f * 10)); // 4〜14本
  const topY = 37 + (1 - f) * 6;         // 山の頂（口縁のすぐ内側・溢れさせない）
  const botY = soupY;
  const noodlePaths = [];
  for (let i = 0; i < nLines; i++) {
    const t = nLines <= 1 ? 0 : i / (nLines - 1);   // 0=下(スープ側) .. 1=上
    const yy = botY - (botY - topY) * t;
    const w = 30 + (1 - t) * 14;         // 下ほど広い山型
    const amp = 4 + (i % 3) * 2;         // うねりを大きく
    const dir = i % 2 ? 1 : -1;
    const x0 = 80 - w + (i % 2) * 4;
    // 黄みのある麺。スープに浸かる下部は暗く、上に出る部分は明るく
    const col = t < 0.34 ? "#a9824a" : t < 0.68 ? "#d8bd72" : "#f0dc9a";
    const d = `M ${x0.toFixed(1)} ${yy.toFixed(1)} q ${(w * 0.25).toFixed(1)} ${(dir * -amp).toFixed(1)} ${(w * 0.5).toFixed(1)} 0 t ${(w * 0.5).toFixed(1)} 0`;
    noodlePaths.push({ d, col });
  }

  // 雷文（四角い渦巻きの連続）
  let mean = "";
  const my = 90, mu = 13, mh = 9;
  for (let x = 30; x + mu <= 132; x += mu) {
    mean += `M ${x} ${my} v ${-mh} h ${(mu * 0.72).toFixed(1)} v ${(mh * 0.55).toFixed(1)} h ${(-mu * 0.42).toFixed(1)} v ${(-mh * 0.3).toFixed(1)} `;
  }
  mean += `M 30 ${my + 1} H 130`;

  return (
    <svg className={`hy-bowl ${className}`} viewBox="0 0 160 152" fill="none" aria-hidden style={{ filter: glow, overflow: "visible" }}>
      <defs>
        <clipPath id={clipId}><ellipse cx="80" cy="49" rx="56" ry="13" /></clipPath>
        <linearGradient id={soupId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2a457" /><stop offset="1" stopColor="#a45e1e" />
        </linearGradient>
      </defs>

      {/* 落ち影 */}
      <ellipse cx="80" cy="140" rx="52" ry="7" fill="rgba(0,0,0,.4)" />
      {/* 丼の本体（濃い飴色）*/}
      <path d="M18 48 L42 116 Q80 134 118 116 L142 48 A62 15 0 0 1 18 48 Z" fill="#8a4a22" stroke="#5c2f14" strokeWidth="2" strokeLinejoin="round" />
      {/* 雷文 */}
      <path d={mean} stroke="#efe0c0" strokeWidth="1.5" fill="none" opacity=".9" />
      {/* 高台 */}
      <path d="M60 116 L56 130 Q80 138 104 130 L100 116" fill="#5c2f14" />

      {/* 内側（一段暗い）*/}
      <ellipse cx="80" cy="49" rx="56" ry="13" fill="#3a1d0f" />

      {/* 中身はすべて丼の口（楕円）でクリップ＝口の外に一切出さない */}
      <g clipPath={`url(#${clipId})`}>
        {/* スープの面 */}
        <ellipse cx="80" cy={soupY} rx={soupRx} ry={soupRy} fill={`url(#${soupId})`} />
        {/* 麺の束 */}
        <g strokeWidth="2.8" strokeLinecap="round" fill="none" opacity=".97">
          {noodlePaths.map((n, i) => <path key={i} d={n.d} stroke={n.col} />)}
        </g>
        {/* 海苔：口の内側に立てかけ、下端をスープに挿す（傾き浅め）*/}
        {f > 0.6 && (
          <rect x="90" y={topY - 2} width="15" height={(soupY - topY + 6).toFixed(1)} rx="1" fill="#171717"
            transform={`rotate(6 97 ${((topY + soupY) / 2).toFixed(1)})`} />
        )}
        {/* チャーシュー（外周濃く中央淡く）*/}
        {f > 0.12 && (
          <g>
            <ellipse cx="70" cy={topY + 9} rx="15" ry="9" fill="#7a3b26" />
            <ellipse cx="70" cy={topY + 9} rx="9" ry="5" fill="#c07a4e" />
          </g>
        )}
        {/* メンマ：細長い長方形を3本（麺の上に散らす）*/}
        {f > 0.28 && (
          <g fill="#cda24a">
            <rect x="78" y={topY + 2} width="20" height="5" rx="2" transform={`rotate(-14 88 ${(topY + 4).toFixed(1)})`} />
            <rect x="84" y={topY + 8} width="18" height="5" rx="2" transform={`rotate(-4 93 ${(topY + 10).toFixed(1)})`} />
            <rect x="76" y={topY + 13} width="19" height="5" rx="2" transform={`rotate(-20 85 ${(topY + 15).toFixed(1)})`} />
          </g>
        )}
        {/* ネギ（緑の輪切り・大きめ・中央寄りに散らす）*/}
        {f > 0.45 && (
          <g>
            {[[54, topY + 6], [96, topY + 5], [78, topY + 13], [64, topY - 1]].map(([cx, cy], i) => (
              <g key={i}><circle cx={cx} cy={cy} r="6.5" fill="#5fa53c" /><circle cx={cx} cy={cy} r="2.8" fill="#c4e493" /></g>
            ))}
          </g>
        )}
      </g>

      {/* 丼の手前側の縁（麺・具の下部を隠して「載っている」ように見せる）*/}
      <path d="M 24 49 A 56 13 0 0 0 136 49" fill="none" stroke="#8a4a22" strokeWidth="7" strokeLinecap="round" />
      {/* 口縁の朱色 */}
      <ellipse cx="80" cy="48" rx="60" ry="14" stroke={rim} strokeWidth="2.6" fill="none" />
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
  const [press, setPress] = useState(false);         // 連打ボタンの押下表示（はふっ）

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
    setSensei({ text: "腹減ったろ。よーい…", key: 0, achi: false });
    // ゲーム開始（go）と同時に t0 を打ち、合図も「はじめ」に切り替える（＝ここから計時）
    const t = setTimeout(() => {
      t0Ref.current = performance.now();
      setLocal("go");
      setSensei((s) => ({ text: "はじめっ！ 隙を見て食え", key: s.key + 1, achi: false }));
    }, isRed ? 300 : 700);
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

  // 連打ボタン（丼タップと同じ eat を呼ぶ・押下で「はふっ」表示）
  const onEatBtn = (e) => {
    e.stopPropagation();
    setPress(true);
    eat();
    setTimeout(() => setPress(false), 180);
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
  const eatState = frozen ? "frozen" : hot ? "hot" : "safe";
  const eatLabel = frozen ? "アチッ" : press ? "はふっ" : "食べる";

  return (
    <div className="hy">
      <style>{CSS}</style>
      <div className="hy-wall" />
      <div className="hy-light" />
      {!bothDone && <button className="hy-quit" onClick={onChangeGame}>ゲーム変更</button>}

      <div className="hy-in">
        {/* 大将 */}
        <div className="hy-master">
          <div className="hy-face"><MasterFace talking={local === "go" && !myDone} /></div>
          <div className={`hy-speech ${sensei.achi ? "achi" : ""}`} key={sensei.key}>{sensei.text}</div>
        </div>

        {!bothDone && (
          <div className="hy-stage">
            {/* 相手（奥・小・明度30%ダウン）*/}
            <div className="hy-opp">
              <div className="hy-bowlwrap"><Bowl fill={oppFill} hot={false} /></div>
              <div className="hy-plabel">{nameOf(oppRole)}</div>
              {oppRes && oppRes.done && <div className="hy-done">{oppRes.remaining === 0 ? "完食！" : "時間切れ"}</div>}
            </div>

            {/* 自分（手前・大）*/}
            <div className="hy-mine">
              <div className={`hy-bowlwrap ${frozen ? "frozen" : ""}`} key={`bw-${achiFx}`}
                onPointerDown={eat} role="button" aria-label="食べる">
                {achiFx > 0 && <div className="hy-achi" key={achiFx}>アチッ！</div>}
                <div className={`hy-steam ${hot ? "on" : ""}`}><i /><i /><i /><i /></div>
                <Bowl fill={myFill} hot={hot} />
              </div>
              <div className="hy-plabel">{nameOf(myRole)}（きみ）</div>
              {myDone ? (
                <div className="hy-done">{remaining === 0 ? "完食！ 相手を待て…" : "時間切れ"}</div>
              ) : (
                <>
                  <div className={`hy-hint ${hot ? "hot" : ""}`}>{hint}</div>
                  <button type="button" className={`hy-eat ${eatState}`} disabled={frozen} onPointerDown={onEatBtn}>
                    {eatLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!bothDone && (
          <div className="hy-timerow">
            <span className="hy-timelbl">のこり時間</span>
            <div className="hy-time"><i style={{ width: `${100 - prog * 100}%` }} /></div>
          </div>
        )}
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
          <button className="hy-btn prim wide" onClick={() => onDecided?.(winGenre?.id)}>店をさがす</button>
          <div className="hy-over-row">
            <button className="hy-btn wood small" onClick={onRematch}>もう一回</button>
            <button className="hy-btn wood small" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
