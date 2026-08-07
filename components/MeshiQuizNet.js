"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 大将のお題（読み合い・2端末同期）※出題ロジック・勝敗集計は不変。今回は「せーので開く」演出を追加。
//  ・二人が同時に「たろ」か「はな」かを選ぶ（自分でも相手でも可）
//  ・両者そろってから同時開示。回答が一致した"人"だけ主導権を1つ得る（割れたら誰も得ない）
//  同期：進行(quiz)はホスト所有。回答は ansHost/ansGuest に別キーで書く。

const PAIRS = [
  ["大盛りを頼むのはどっちだ", "小食なのはどっちだ"],
  ["辛いもんが好きなのはどっちだ", "甘いもんに目がないのはどっちだ"],
  ["新しい店に飛び込むのはどっちだ", "同じ店に通い続けるのはどっちだ"],
  ["先に腹が減るのはどっちだ", "食うのが遅いのはどっちだ"],
  ["好き嫌いが多いのはどっちだ", "何でも食えるのはどっちだ"],
  ["デザートまで食うのはどっちだ", "〆にラーメン行くのはどっちだ"],
  ["値段を気にするのはどっちだ", "うまけりゃいいと言うのはどっちだ"],
];
const QN = 5;

// 相手がダミー実装のときだけ、札が落ちるまでの待ちを 1.2〜2.8秒のランダムに（機械的さ回避）。
// 本作は2端末同期の実対戦なので false（本物の到着を待つ）。
const DUMMY_OPPONENT = false;

const kanji = (n) => {
  const d = "〇一二三四五六七八九";
  if (n <= 0) return "〇";
  if (n < 10) return d[n];
  if (n < 20) return "十" + (n > 10 ? d[n - 10] : "");
  return d[Math.floor(n / 10)] + "十" + (n % 10 ? d[n % 10] : "");
};
const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CSS = `
.qz { position:fixed; inset:0; z-index:50; overflow:hidden; color:#f0e6d2;
  background: linear-gradient(180deg, #16273f 0%, #0b1120 46%, #05070c 100%);
  font-family: var(--font-zen-maru), sans-serif; -webkit-tap-highlight-color:transparent; user-select:none; }
.qz-light { position:absolute; inset:0; z-index:0; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,186,116,.16) 0%, rgba(255,150,86,.05) 22%, transparent 46%, rgba(0,0,0,.4) 100%); }
/* 提灯（判定時に揺れる）*/
.qz-lantern { position:absolute; top:10px; z-index:0; width:26px; height:40px; border-radius:48% / 44%;
  border-top:4px solid #1c1714; border-bottom:4px solid #1c1714; transform-origin:50% -12px;
  background: radial-gradient(115% 80% at 50% 44%, #ffb457, #f7644f 34%, #d22a1e 66%, #7a1109);
  box-shadow: inset 0 0 8px rgba(255,196,120,.5), 0 0 16px 4px rgba(255,150,80,.18); opacity:.5; }
.qz-lantern.l { left:12px; }
.qz-lantern.r { right:12px; top:18px; width:22px; height:34px; }
/* 一致：光が一瞬強くなる／不一致：一瞬引く */
.qz-flare { position:absolute; inset:0; z-index:1; pointer-events:none; opacity:0;
  background: radial-gradient(circle at 50% 34%, rgba(255,198,120,.55), transparent 60%); }
.qz.match .qz-flare { animation: qzFlare .7s ease both; }
.qz.match .qz-lantern { animation: qzLsway .7s ease both; }
.qz.split .qz-light { animation: qzDip .7s ease both; }
@keyframes qzFlare { 0%{opacity:0} 30%{opacity:.9} 100%{opacity:0} }
@keyframes qzDip { 0%{filter:brightness(1)} 30%{filter:brightness(.55)} 100%{filter:brightness(1)} }
@keyframes qzLsway { 0%,100%{transform:rotate(0)} 25%{transform:rotate(8deg)} 70%{transform:rotate(-8deg)} }

/* 溜めの暗転（背景を落とし、伏せ札だけ浮かせる）*/
.qz-dim { position:absolute; inset:0; z-index:2; pointer-events:none; background:#05070c; opacity:0; transition:opacity .3s ease; }
.qz.dim .qz-dim { opacity:.46; }
.qz.dim .qz-stage { z-index:3; }
.qz.dim .qz-slot { transform:scale(1.05); }
.qz.dim .qz-card .cback { box-shadow: 0 0 18px 3px rgba(255,196,120,.4), inset 0 2px 0 rgba(255,224,170,.25), inset 0 -3px 0 rgba(0,0,0,.4); }

.qz-in { position:relative; height:100dvh; max-width:440px; margin:0 auto; display:flex; flex-direction:column;
  padding:14px 16px calc(14px + env(safe-area-inset-bottom)); gap:12px; }

/* 大将 */
.qz-master { display:flex; align-items:flex-start; gap:12px; }
.qz-face { flex:0 0 auto; width:62px; height:62px; transition: transform .2s ease; }
.qz-face.lean { transform: translateY(4px) scale(1.12); }
.qz-face svg { width:100%; height:100%; display:block; }
.qz-speech { position:relative; flex:1; background:#f0e6d2; color:#2a2520; border-radius:4px; padding:11px 14px;
  font-size:14px; font-weight:800; min-height:44px; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.qz-speech::before { content:""; position:absolute; left:-10px; top:16px; border:6px solid transparent; border-right-color:#f0e6d2; }
.qz-cur { opacity:.35; }

/* 中央：伏せ札（きみ / あいて）*/
.qz-stage { position:relative; flex:1; display:flex; align-items:center; justify-content:center; gap:24px; }
.qz-slot { position:relative; width:118px; max-width:38vw; aspect-ratio:3 / 4; transition: transform .3s ease; }
.qz-slot::before { content:""; position:absolute; left:50%; top:-12px; width:2px; height:12px; background:#241f1c; transform:translateX(-50%); }
.qz-lbl { position:absolute; top:-30px; left:0; right:0; text-align:center; font-size:11px; font-weight:900; letter-spacing:.12em; color:#e8dcc4; }
.qz-frame { position:absolute; inset:0; border:2px dashed rgba(240,230,210,.4); border-radius:9px; background:rgba(255,255,255,.02); }
.qz-hang { position:absolute; inset:0; transform-origin:50% -10%; }
.qz-hang.sway { animation: qzSway 3.2s ease-in-out infinite; }
.qz-hang.deal { animation: qzDeal .4s cubic-bezier(.2,.72,.3,1) both; }
.qz-hang.drop { animation: qzDrop .3s cubic-bezier(.2,.8,.3,1) both; }
.qz-hang.hitL { animation: qzHitL .5s ease both; }
.qz-hang.hitR { animation: qzHitR .5s ease both; }
.qz-hang.awayL { animation: qzAwayL .5s ease both; }
.qz-hang.awayR { animation: qzAwayR .5s ease both; }
.qz-card { position:absolute; inset:0; transform-style:preserve-3d; transform: rotateY(0deg); }
.qz-card.up { transform: rotateY(180deg); transition: transform .35s ease; }
.qz-card .cface, .qz-card .cback { position:absolute; inset:0; border-radius:9px; backface-visibility:hidden; -webkit-backface-visibility:hidden;
  display:flex; align-items:center; justify-content:center; box-shadow: inset 0 2px 0 rgba(255,224,170,.22), inset 0 -3px 0 rgba(0,0,0,.4); }
.qz-card .cback { background: linear-gradient(150deg,#7a5230,#5a3b20); border:2px solid #3f2a15; }
.qz-card .cback::after { content:""; position:absolute; inset:9px; border-radius:6px; border:1px solid rgba(0,0,0,.22);
  background: repeating-linear-gradient(102deg, rgba(0,0,0,.06) 0 3px, transparent 3px 10px); }
.qz-card .cface { transform: rotateY(180deg); background:#efe3c6; border:2px solid #b0975f; }
.qz-card .cface .nm2 { font-family: var(--font-klee), var(--font-zen-maru), sans-serif; font-weight:900; font-size:22px; color:#241c14; letter-spacing:.02em; }
/* 判定色（reduced-motionでも色で伝わる）*/
.qz-card.win .cface { background:#f7dcbe; border-color:#c23c30; box-shadow: 0 0 14px 2px rgba(224,72,59,.55), inset 0 2px 0 rgba(255,224,170,.22); }
.qz-card.win .cface .nm2 { color:#7a1109; }
.qz-card.lose .cface { filter: brightness(.82) saturate(.85); }
@keyframes qzDeal { 0%{ transform: translateY(122%) rotate(7deg); opacity:0 } 55%{opacity:1} 100%{ transform: translateY(0) rotate(0); opacity:1 } }
@keyframes qzDrop { 0%{ transform: translateY(-48%); opacity:0 } 72%{ transform: translateY(4%); opacity:1 } 100%{ transform: translateY(0); opacity:1 } }
@keyframes qzSway { 0%,100%{ transform: rotate(-2deg) } 50%{ transform: rotate(2deg) } }
@keyframes qzHitL { 0%{transform:translateX(0)} 55%{transform:translateX(15px)} 72%{transform:translateX(9px) scale(1.05)} 100%{transform:translateX(11px)} }
@keyframes qzHitR { 0%{transform:translateX(0)} 55%{transform:translateX(-15px)} 72%{transform:translateX(-9px) scale(1.05)} 100%{transform:translateX(-11px)} }
@keyframes qzAwayL { 0%{transform:translateX(0); opacity:1} 100%{transform:translateX(-16px) translateY(11px); opacity:.6} }
@keyframes qzAwayR { 0%{transform:translateX(0); opacity:1} 100%{transform:translateX(16px) translateY(11px); opacity:.6} }

/* 選択肢の札（下部・タップして選ぶ）*/
.qz-plates { display:flex; align-items:stretch; justify-content:center; gap:14px; }
.qz-plate { position:relative; flex:1; max-width:150px; padding:18px 8px 16px; border-radius:6px; text-align:center;
  border:2px solid #3f2a15; cursor:pointer; transition: transform .12s ease, filter .12s ease, opacity .2s ease;
  box-shadow: inset 0 2px 0 rgba(255,224,170,.3), inset 0 -3px 0 rgba(0,0,0,.42); }
.qz-plate.left { background:#6f4b2a; } .qz-plate.right { background:#855e35; }
.qz-plate::before { content:""; position:absolute; left:50%; top:-14px; width:2px; height:14px; background:#241f1c; transform:translateX(-50%); }
.qz-plate .nm { color:#241c14; font-weight:900; font-size:20px; letter-spacing:.02em; line-height:1.15;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; text-shadow:0 1px 0 rgba(255,224,170,.18); }
.qz-plate:not(:disabled):active { transform: translateY(2px); }
.qz-plate.chosen { animation: qzChosen .3s ease both; pointer-events:none; }
.qz-plate.sink { animation: qzSink .2s ease both; pointer-events:none; }
@keyframes qzChosen { from{ transform: translateY(0); opacity:1 } to{ transform: translateY(-16px); opacity:0 } }
@keyframes qzSink { from{ transform: translateY(0); opacity:1 } to{ transform: translateY(10px); opacity:0; filter:brightness(.7) } }

/* タイマー */
.qz-timer { height:5px; border-radius:3px; background:rgba(0,0,0,.4); overflow:hidden; }
.qz-timer i { display:block; height:100%; background:linear-gradient(90deg,#ffcf6a,#e0483b); animation: qzTime 8s linear both; }
@keyframes qzTime { from{ width:100% } to{ width:0% } }

/* 主導権＝木札の積み上がり */
.qz-tokens { display:flex; flex-direction:column; align-items:center; gap:3px; }
.qz-trow { display:flex; align-items:center; gap:5px; min-height:14px; }
.qz-trow .lbl { width:34px; text-align:right; font-size:10px; font-weight:900; color:#e8dcc4; letter-spacing:.04em; }
.qz-trow.back { opacity:.55; transform:scale(.84); transform-origin:left center; }
.qz-tok { width:26px; height:12px; border-radius:2px; background:#7a5230; border:1px solid #3f2a15;
  box-shadow: inset 0 1px 0 rgba(255,224,170,.3), inset 0 -1px 0 rgba(0,0,0,.4); }
.qz-tok.g { animation: qzPop .3s ease both; }
@keyframes qzPop { from{ transform:translateY(-8px) scale(.8); opacity:0 } to{ transform:none; opacity:1 } }

/* のれん帯：残り問題数 */
.qz-band { align-self:center; position:relative; background:#f0e6d2; color:#2a2520; border-radius:3px; padding:6px 20px;
  font-size:12px; font-weight:800; letter-spacing:.06em; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.qz-band::before { content:""; position:absolute; left:8px; right:8px; top:-3px; height:3px; background:#241f1c; border-radius:2px; }

/* 決着 */
.qz-over { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; padding:24px; text-align:center; background:rgba(6,8,16,.86); animation: qzFade .3s; }
@keyframes qzFade { from{opacity:0} to{opacity:1} }
.qz-win-nm { font-size:30px; font-weight:900; color:#f0e6d2; }
.qz-win-sub { font-size:14px; color:#ffe9cf; font-weight:700; }
.qz-btn { border-radius:5px; padding:13px 30px; font-weight:800; letter-spacing:.06em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; border:1px solid; }
.qz-btn.prim { background:#ece0bf; color:#2a2520; border-color:#b7ab84; box-shadow: inset 0 1px 0 #fff6db, inset 0 -1px 0 #b0a37d; }
.qz-btn.prim:active { transform:translateY(2px); box-shadow: inset 0 1px 0 #b0a37d, inset 0 -1px 0 #fff6db; }
.qz-btn.wood { background:#3a2a1b; color:#e8dcc4; border-color:#241811; box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.qz-over-row { display:flex; gap:10px; }
.qz-quit { position:absolute; top:10px; left:12px; z-index:7; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  /* 位置は即座に確定・移動/跳ね/揺れを無効化 */
  .qz-hang, .qz-hang.sway, .qz-hang.deal, .qz-hang.drop,
  .qz-hang.hitL, .qz-hang.hitR, .qz-hang.awayL, .qz-hang.awayR { animation:none !important; transform:none !important; }
  .qz.dim .qz-slot { transform:none; }
  .qz-plate.chosen, .qz-plate.sink { animation:none; opacity:0; }
  /* めくりはクロスフェードに置換 */
  .qz-card, .qz-card.up { transform:none !important; transition:none; }
  .qz-card .cface { transform:none; opacity:0; transition:opacity .3s ease; }
  .qz-card .cback { transition:opacity .3s ease; }
  .qz-card.up .cface { opacity:1; }
  .qz-card.up .cback { opacity:0; }
  .qz-timer i { animation:none; width:100%; }
  .qz.match .qz-flare, .qz.match .qz-lantern, .qz.split .qz-light, .qz-tok.g, .qz-over { animation:none; }
  .qz.match .qz-flare { opacity:.5; }
}
`;

function MasterFace({ talking, expr }) {
  const grin = expr === "grin";
  const aghast = expr === "aghast";
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="#f0e6d2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="32" cy="36" r="20" />
      <path d="M12 24 Q32 16 52 24" stroke="#e0483b" strokeWidth="4" />
      <path d="M52 24 l7 -4 M52 24 l6 6" stroke="#e0483b" strokeWidth="4" />
      {aghast ? (
        <>
          <path d="M22 36 h6" strokeWidth="3.2" />
          <path d="M36 36 h6" strokeWidth="3.2" />
        </>
      ) : grin ? (
        <>
          <path d="M22 35 q3 -3 6 0" strokeWidth="3" />
          <path d="M36 35 q3 -3 6 0" strokeWidth="3" />
        </>
      ) : (
        <>
          <path d="M25 37 h.01" strokeWidth="4.5" />
          <path d="M39 37 h.01" strokeWidth="4.5" />
        </>
      )}
      {grin ? (
        <path d="M25 44 q7 7 14 1" />
      ) : aghast ? (
        <path d="M26 47 q6 -3 12 0" />
      ) : talking ? (
        <path d="M27 45 q5 5 10 0" />
      ) : (
        <path d="M27 46 h10" />
      )}
      {aghast && <path d="M50 41 q2 4 0 6 q-2 -2 0 -6 Z" fill="#8fd0e6" stroke="none" />}
    </svg>
  );
}

export default function MeshiQuizNet({
  myRole = "host",
  hostName = "ホスト",
  guestName = "ゲスト",
  hostGenre,
  guestGenre,
  seed,
  quiz,
  ansHost,
  ansGuest,
  writeQuiz,
  writeAns,
  onRematch,
  onChangeGame,
  onLeave,
  onDecided,
}) {
  const isHost = myRole === "host";
  const [isRed] = useState(() => reduced());

  // 5ペアを選び、各ペアから1問だけ（seedで両端末一致）
  const picks = useMemo(() => {
    const rng = mulberry32(seedFrom(String(seed) + "quizpair"));
    const pi = PAIRS.map((_, k) => k);
    for (let k = pi.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [pi[k], pi[j]] = [pi[j], pi[k]];
    }
    return pi.slice(0, QN).map((p) => PAIRS[p][rng() < 0.5 ? 0 : 1]);
  }, [seed]);

  useEffect(() => {
    if (isHost && !quiz) writeQuiz({ i: 0, scores: { host: 0, guest: 0 }, startedAt: Date.now(), done: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, quiz]);

  const i = quiz?.i ?? 0;
  const myAns = isHost ? ansHost : ansGuest;
  const oppAns = isHost ? ansGuest : ansHost;
  const myAnswered = myAns?.q === i;
  const oppAnswered = oppAns?.q === i;

  // お題を一文字ずつ
  const qText = picks[i] ?? "";
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!quiz || quiz.done) return;
    if (isRed) { setTyped(qText.length); return; }
    setTyped(0);
    let n = 0;
    const id = setInterval(() => { n += 1; setTyped(n); if (n >= qText.length) clearInterval(id); }, 40);
    return () => clearInterval(id);
  }, [i, qText, quiz?.done, isRed]);

  // 8秒でランダム自動回答（時間切れ）※ロジック不変
  useEffect(() => {
    if (!quiz || quiz.done || myAnswered) return;
    const remain = 8000 - (Date.now() - (quiz.startedAt || Date.now()));
    const id = setTimeout(() => {
      writeAns(myRole, { q: i, pick: Math.random() < 0.5 ? "host" : "guest", to: true });
    }, Math.max(0, remain));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, quiz?.startedAt, myAnswered, quiz?.done]);

  // ホスト：両者そろったら採点＆次へ（演出尺に合わせて待ってから進める。集計は不変）
  useEffect(() => {
    if (!isHost || !quiz || quiz.done) return;
    if (!(ansHost?.q === i && ansGuest?.q === i)) return;
    const id = setTimeout(() => {
      const winner = ansHost.pick === ansGuest.pick ? ansHost.pick : null;
      const scores = winner ? { ...quiz.scores, [winner]: quiz.scores[winner] + 1 } : quiz.scores;
      if (i + 1 >= QN) writeQuiz({ ...quiz, scores, done: true });
      else writeQuiz({ ...quiz, scores, i: i + 1, startedAt: Date.now() });
    }, isRed ? 2200 : 4200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, quiz, ansHost, ansGuest, i, isRed]);

  // ── 「せーので開く」演出の状態機械 ──
  // q(出題/選択待ち) → mine(自札を伏せて中央へ) → wait(相手待ち) → drop(相手札が落ちる)
  //  → hold(2枚並べて見せる) → charge(溜め) → beat(間) → flip(同時めくり) → settle(静止) → judge(判定)
  const [phase, setPhase] = useState("q");
  const [pickLocal, setPickLocal] = useState(null);
  const oppRef = useRef(false);
  oppRef.current = oppAnswered;

  // お題が変わったら初期化（途中で飛んでも札位置が壊れないよう常にqへ）
  useEffect(() => { setPhase("q"); setPickLocal(null); }, [i]);

  // 自分が回答（タップ or 自動）→ 自札を伏せて中央へ
  useEffect(() => {
    if (phase === "q" && myAnswered && !quiz?.done) setPhase("mine");
  }, [phase, myAnswered, quiz?.done]);

  useEffect(() => {
    if (phase !== "mine") return;
    const t = setTimeout(() => {
      if (oppRef.current) {
        if (DUMMY_OPPONENT) {
          const wait = 1200 + Math.random() * 1600;
          setTimeout(() => setPhase("drop"), isRed ? 0 : wait);
        } else {
          setPhase("drop");
        }
      } else {
        setPhase("wait");
      }
    }, isRed ? 0 : 400);
    return () => clearTimeout(t);
  }, [phase, isRed]);

  useEffect(() => {
    if (phase === "wait" && oppAnswered) setPhase("drop");
  }, [phase, oppAnswered]);

  // 各フェーズの尺（reduced-motionでは短縮／溜めは0.2秒残す）
  useEffect(() => {
    const next = {
      drop:   ["hold",   isRed ? 0   : 300],
      hold:   ["charge", isRed ? 200 : 600],
      charge: ["beat",   isRed ? 200 : 500],
      beat:   ["flip",   isRed ? 0   : 200],
      flip:   ["settle", isRed ? 300 : 350],
      settle: ["judge",  isRed ? 150 : 250],
    }[phase];
    if (!next) return;
    const t = setTimeout(() => setPhase(next[0]), next[1]);
    return () => clearTimeout(t);
  }, [phase, isRed]);

  const answer = (person) => {
    if (phase !== "q" || myAnswered || quiz?.done) return;
    setPickLocal(person);
    setPhase("mine");
    writeAns(myRole, { q: i, pick: person });
  };

  if (!quiz) {
    return (
      <div className="qz">
        <style>{CSS}</style>
        <div className="qz-light" />
        <div className="qz-in"><div style={{ margin: "auto", fontWeight: 800 }}>大将が支度中…</div></div>
      </div>
    );
  }

  const scores = quiz.scores || { host: 0, guest: 0 };
  const myPick = pickLocal ?? myAns?.pick;
  const oppPick = oppAns?.pick;
  const matched = myPick != null && oppPick != null && myPick === oppPick;

  // 主導権（きみ=手前 / あいて=奥）
  const oppRole = isHost ? "guest" : "host";

  // 決着（同数は大将の独断＝seedで一意）
  const tie = scores.host === scores.guest;
  const overallWinner = scores.host > scores.guest ? "host"
    : scores.guest > scores.host ? "guest"
    : (mulberry32(seedFrom(String(seed) + "tie"))() < 0.5 ? "host" : "guest");
  const winName = overallWinner === "host" ? hostName : guestName;
  const winGenre = overallWinner === "host" ? hostGenre : guestGenre;

  // 大将のセリフ・表情
  const dimOn = ["charge", "beat", "flip", "settle"].includes(phase);
  let speech, expr = "idle";
  if (quiz.done) speech = "勝負あり！";
  else if (phase === "q") speech = qText.slice(0, typed);
  else if (["mine", "wait", "drop", "hold"].includes(phase)) speech = "あいてを待とうか";
  else if (["charge", "beat", "flip", "settle"].includes(phase)) speech = "よし、開けろ";
  else if (phase === "judge") speech = matched ? "気が合うねえ" : "まるで逆じゃないか";
  else speech = qText.slice(0, typed);
  if (phase === "drop") expr = "lean";
  if (phase === "judge") expr = matched ? "grin" : "aghast";
  const talking =
    (phase === "q" && !myAnswered && typed < qText.length) || ["mine", "charge", "beat"].includes(phase);

  const rootCls = ["qz", dimOn ? "dim" : "", phase === "judge" ? (matched ? "match" : "split") : ""]
    .filter(Boolean).join(" ");

  // 中央の伏せ札
  const Card = ({ mine }) => {
    const filled = mine
      ? ["mine", "wait", "drop", "hold", "charge", "beat", "flip", "settle", "judge"].includes(phase)
      : ["drop", "hold", "charge", "beat", "flip", "settle", "judge"].includes(phase);
    const person = mine ? myPick : oppPick;
    const name = person === "host" ? hostName : person === "guest" ? guestName : "";
    const up = ["flip", "settle", "judge"].includes(phase);
    let hang = "";
    if (mine) {
      if (phase === "mine") hang = "deal";
      else if (["wait", "drop", "hold", "charge", "beat"].includes(phase)) hang = "sway";
    } else {
      if (phase === "drop") hang = "drop";
      else if (["hold", "charge", "beat"].includes(phase)) hang = "sway";
    }
    if (phase === "judge") hang = matched ? (mine ? "hitL" : "hitR") : (mine ? "awayL" : "awayR");
    const cardCls = ["qz-card", up ? "up" : "", phase === "judge" ? (matched ? "win" : "lose") : ""]
      .filter(Boolean).join(" ");
    return (
      <div className="qz-slot">
        <span className="qz-lbl">{mine ? "きみ" : "あいて"}</span>
        {!filled && <div className="qz-frame" />}
        {filled && (
          <div className={`qz-hang ${hang}`}>
            <div className={cardCls}>
              <div className="cback" />
              <div className="cface"><span className="nm2">{name}</span></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TokenRow = ({ role, label, back }) => (
    <div className={`qz-trow ${back ? "back" : ""}`}>
      <span className="lbl">{label}</span>
      {Array.from({ length: scores[role] }).map((_, k) => (
        <span key={k} className={`qz-tok ${!isRed && k === scores[role] - 1 ? "g" : ""}`} />
      ))}
    </div>
  );

  const showPlates = phase === "q" || phase === "mine";
  const Plate = ({ person, name, side }) => {
    const chosen = phase === "mine" && myPick === person;
    const other = phase === "mine" && myPick !== person;
    const cls = ["qz-plate", side, chosen ? "chosen" : "", other ? "sink" : ""].filter(Boolean).join(" ");
    return (
      <button type="button" className={cls} disabled={phase !== "q"} onClick={() => answer(person)}>
        <span className="nm">{name}</span>
      </button>
    );
  };

  return (
    <div className={rootCls}>
      <style>{CSS}</style>
      <div className="qz-light" />
      <span className="qz-lantern l" />
      <span className="qz-lantern r" />
      <div className="qz-flare" />
      <div className="qz-dim" />
      <button className="qz-quit" onClick={onChangeGame}>ゲーム変更</button>
      <div className="qz-in">
        {/* 大将 */}
        <div className="qz-master">
          <div className={`qz-face ${expr === "lean" ? "lean" : ""}`}><MasterFace talking={talking} expr={expr} /></div>
          <div className="qz-speech">
            {speech}
            {talking && phase === "q" && <span className="qz-cur">｜</span>}
          </div>
        </div>

        {/* 中央：伏せ札（きみ / あいて）*/}
        <div className="qz-stage">
          <Card mine />
          <Card mine={false} />
        </div>

        {/* 選択肢の札（下部）*/}
        {showPlates && (
          <div className="qz-plates">
            <Plate person="host" name={hostName} side="left" />
            <Plate person="guest" name={guestName} side="right" />
          </div>
        )}

        {/* タイマー（選択中のみ／進捗バーは今回そのまま）*/}
        {phase === "q" && !myAnswered && !quiz.done && <div className="qz-timer" key={i}><i /></div>}

        {/* 主導権 */}
        <div className="qz-tokens">
          <TokenRow role={oppRole} label="あいて" back />
          <TokenRow role={myRole} label="きみ" />
        </div>

        {/* のれん帯：残り問題数（今回そのまま）*/}
        <div className="qz-band">のこり{kanji(QN - i)}問</div>
      </div>

      {/* 決着 */}
      {quiz.done && (
        <div className="qz-over">
          <div className="qz-win-nm">{winName} の勝ち</div>
          <div className="qz-win-sub">
            {tie ? "痛み分け…大将の独断で" : ""}今日は「{winGenre?.label}」で決まりだ
          </div>
          <button className="qz-btn prim" onClick={() => onDecided?.(winGenre?.id)}>店をさがす</button>
          <div className="qz-over-row">
            <button className="qz-btn wood" onClick={onRematch}>もう一回</button>
            <button className="qz-btn wood" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
