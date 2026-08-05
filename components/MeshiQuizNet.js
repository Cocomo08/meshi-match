"use client";

import { useEffect, useMemo, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 大将のお題（読み合い・2端末同期）
//  ・二人が同時に「たろ」か「はな」かを選ぶ（自分でも相手でも可）
//  ・両者そろってから同時開示。回答が一致した"人"だけ主導権を1つ得る（割れたら誰も得ない）
//  ・自分を選び続けても相手が同意しなければ何も得られない＝読み合いが成立
//  ・全5問。主導権が多い方のジャンルに決定。同数は大将が独断（seedで一意）
//  同期：進行(quiz)はホスト所有。回答は ansHost/ansGuest に別キーで書く。

// お題は「対になる2問」をペアで用意。1ゲームで5ペア選び、各ペアから1問だけ出す。
const PAIRS = [
  ["大盛りを頼むのはどっちだ", "小食なのはどっちだ"],
  ["辛いもんが好きなのはどっちだ", "甘いもんに目がないのはどっちだ"],
  ["新しい店に飛び込むのはどっちだ", "同じ店に通い続けるのはどっちだ"],
  ["先に腹が減るのはどっちだ", "食うのが遅いのはどっちだ"],
  ["好き嫌いが多いのはどっちだ", "何でも食えるのはどっちだ"],
  ["デザートまで食うのはどっちだ", "〆にラーメン行くのはどっちだ"],
  ["値段を気にするのはどっちだ", "うまけりゃいいと言うのはどっちだ"],
];
const REACT_MATCH = ["そりゃそうだ", "息が合ってるな", "よく分かってるじゃないか"];
const REACT_SPLIT = ["割れたか", "そりゃ意外だな", "分かってないねぇ"];
const REACT_TO = "迷ってる場合か";
const QN = 5;

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
.qz-light { position:absolute; inset:0; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,186,116,.16) 0%, rgba(255,150,86,.05) 22%, transparent 46%, rgba(0,0,0,.4) 100%); }
.qz-in { position:relative; z-index:1; height:100dvh; max-width:440px; margin:0 auto; display:flex; flex-direction:column;
  padding:14px 16px calc(14px + env(safe-area-inset-bottom)); gap:12px; }

/* 大将 */
.qz-master { display:flex; align-items:flex-start; gap:12px; }
.qz-face { flex:0 0 auto; width:62px; height:62px; }
.qz-face svg { width:100%; height:100%; display:block; }
.qz-speech { position:relative; flex:1; background:#f0e6d2; color:#2a2520; border-radius:4px; padding:11px 14px;
  font-size:14px; font-weight:800; min-height:44px; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.qz-speech::before { content:""; position:absolute; left:-10px; top:16px; border:6px solid transparent; border-right-color:#f0e6d2; }
.qz-cur { opacity:.35; }

/* 名札（回答の選択肢） */
.qz-plates { flex:1; display:flex; align-items:center; justify-content:center; gap:14px; }
.qz-plate { position:relative; flex:1; max-width:150px; padding:26px 8px 22px; border-radius:6px; text-align:center;
  border:2px solid #3f2a15; cursor:pointer; transition: transform .12s ease, filter .12s ease;
  box-shadow: inset 0 2px 0 rgba(255,224,170,.3), inset 0 -3px 0 rgba(0,0,0,.42); }
.qz-plate.left { background:#6f4b2a; } .qz-plate.right { background:#855e35; }
.qz-plate::before { content:""; position:absolute; left:50%; top:-16px; width:2px; height:16px; background:#241f1c; transform:translateX(-50%); }
.qz-plate .nm { color:#241c14; font-weight:900; font-size:20px; letter-spacing:.02em; line-height:1.15;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; text-shadow:0 1px 0 rgba(255,224,170,.18); }
.qz-plate.mine { box-shadow: inset 0 2px 0 rgba(255,224,170,.3), inset 0 -3px 0 rgba(0,0,0,.42), 0 0 0 3px rgba(255,224,170,.45); }
.qz-plate:not(.locked):active { transform: translateY(2px); }
/* 一致：提灯の赤に光り、拡大してから戻る */
.qz-plate.win { background:#c23c30; border-color:#7a1109; animation: qzWin .5s ease both; }
.qz-plate.win .nm { color:#fff2ec; text-shadow:0 1px 2px rgba(120,20,10,.6); }
@keyframes qzWin {
  0%{ transform:scale(1); box-shadow: 0 0 0 rgba(224,72,59,0), inset 0 0 0 2px rgba(255,120,110,.7); }
  45%{ transform:scale(1.12); box-shadow: 0 0 26px 7px rgba(224,72,59,.95), inset 0 0 0 2px rgba(255,150,140,.9); }
  100%{ transform:scale(1); box-shadow: 0 0 20px 5px rgba(224,72,59,.85), inset 0 0 0 2px rgba(255,120,110,.7); }
}
/* 不一致：わずかに沈む */
.qz-plate.sink { transform: translateY(4px); filter: brightness(.78); }
/* 開示：投票チップ */
.qz-votes { position:absolute; left:0; right:0; bottom:-24px; display:flex; justify-content:center; gap:5px; }
.qz-vote { font-size:10px; font-weight:900; color:#241c14; background:#efe3c6; border:1px solid #b0a37d; border-radius:999px; padding:1px 7px; }

/* タイマー */
.qz-timer { height:5px; border-radius:3px; background:rgba(0,0,0,.4); overflow:hidden; }
.qz-timer i { display:block; height:100%; background:linear-gradient(90deg,#ffcf6a,#e0483b); animation: qzTime 8s linear both; }
@keyframes qzTime { from{ width:100% } to{ width:0% } }
.qz-wait { text-align:center; font-size:13px; font-weight:800; color:#e8dcc4; }

/* 主導権＝木札の積み上がり（きみ=手前・あいて=奥）*/
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
.qz-over { position:absolute; inset:0; z-index:3; display:flex; flex-direction:column; align-items:center; justify-content:center;
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
.qz-quit { position:absolute; top:10px; left:12px; z-index:4; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .qz-plate.win { animation:none; transform:none; box-shadow: inset 0 0 0 3px #e0483b, inset 0 2px 0 rgba(255,224,170,.3); }
  .qz-plate.sink { transform:none; filter:none; }
  .qz-tok.g, .qz-over { animation:none; }
  .qz-timer i { animation:none; width:100%; }
}
`;

function MasterFace({ talking }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="#f0e6d2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="32" cy="36" r="20" />
      <path d="M12 24 Q32 16 52 24" stroke="#e0483b" strokeWidth="4" />
      <path d="M52 24 l7 -4 M52 24 l6 6" stroke="#e0483b" strokeWidth="4" />
      <path d="M25 37 h.01" strokeWidth="4.5" />
      <path d="M39 37 h.01" strokeWidth="4.5" />
      {talking ? <path d="M27 45 q5 5 10 0" /> : <path d="M27 46 h10" />}
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
  const reveal = myAnswered && oppAnswered && !quiz?.done;

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

  // 8秒でランダム自動回答（時間切れフラグ付き）
  useEffect(() => {
    if (!quiz || quiz.done || myAnswered) return;
    const remain = 8000 - (Date.now() - (quiz.startedAt || Date.now()));
    const id = setTimeout(() => {
      writeAns(myRole, { q: i, pick: Math.random() < 0.5 ? "host" : "guest", to: true });
    }, Math.max(0, remain));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, quiz?.startedAt, myAnswered, quiz?.done]);

  // ホスト：両者そろったら開示 → 少し待って採点＆次へ
  useEffect(() => {
    if (!isHost || !quiz || quiz.done) return;
    if (!(ansHost?.q === i && ansGuest?.q === i)) return;
    const id = setTimeout(() => {
      const winner = ansHost.pick === ansGuest.pick ? ansHost.pick : null; // 一致した"人"だけ主導権
      const scores = winner ? { ...quiz.scores, [winner]: quiz.scores[winner] + 1 } : quiz.scores;
      if (i + 1 >= QN) writeQuiz({ ...quiz, scores, done: true });
      else writeQuiz({ ...quiz, scores, i: i + 1, startedAt: Date.now() });
    }, isRed ? 900 : 2400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, quiz, ansHost, ansGuest, i, isRed]);

  const answer = (person) => {
    if (myAnswered || reveal || quiz?.done) return;
    writeAns(myRole, { q: i, pick: person });
  };

  if (!quiz) {
    return (
      <div className="qz">
        <style>{CSS}</style>
        <div className="qz-light" />
        <div className="qz-in"><div className="qz-wait" style={{ margin: "auto" }}>大将が支度中…</div></div>
      </div>
    );
  }

  const scores = quiz.scores || { host: 0, guest: 0 };
  const myPick = myAns?.pick;
  const oppPick = oppAns?.pick;
  const matched = reveal && myPick === oppPick;
  const winPerson = matched ? myPick : null;
  const anyTimeout = reveal && (myAns?.to || oppAns?.to);
  const mReact = REACT_MATCH[seedFrom(String(seed) + "m" + i) % REACT_MATCH.length];
  const sReact = REACT_SPLIT[seedFrom(String(seed) + "s" + i) % REACT_SPLIT.length];
  const speech = quiz.done
    ? "勝負あり！"
    : reveal
      ? (anyTimeout ? REACT_TO : matched ? mReact : sReact)
      : qText.slice(0, typed);
  const talking = !reveal && !quiz.done && typed < qText.length;

  const votesFor = (person) => {
    if (!reveal) return [];
    const v = [];
    if (myPick === person) v.push("きみ");
    if (oppPick === person) v.push("あいて");
    return v;
  };

  // 主導権（きみ=手前 / あいて=奥）
  const oppRole = isHost ? "guest" : "host";
  const myTokens = scores[myRole];
  const oppTokens = scores[oppRole];

  // 決着（同数は大将の独断＝seedで一意）
  const tie = scores.host === scores.guest;
  const overallWinner = scores.host > scores.guest ? "host"
    : scores.guest > scores.host ? "guest"
    : (mulberry32(seedFrom(String(seed) + "tie"))() < 0.5 ? "host" : "guest");
  const winName = overallWinner === "host" ? hostName : guestName;
  const winGenre = overallWinner === "host" ? hostGenre : guestGenre;

  const Plate = ({ side, person, name }) => {
    const votes = votesFor(person);
    const cls = [
      "qz-plate", side,
      myAnswered && myPick === person && !reveal ? "mine" : "",
      reveal ? "locked" : "",
      winPerson === person ? "win" : "",
      reveal && !matched ? "sink" : "",
    ].join(" ");
    return (
      <button type="button" className={cls} onClick={() => answer(person)} disabled={myAnswered || reveal || quiz.done}>
        <span className="nm">{name}</span>
        {reveal && votes.length > 0 && (
          <span className="qz-votes">
            {votes.map((v) => (<span key={v} className="qz-vote">{v}</span>))}
          </span>
        )}
      </button>
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

  return (
    <div className="qz">
      <style>{CSS}</style>
      <div className="qz-light" />
      <button className="qz-quit" onClick={onChangeGame}>ゲーム変更</button>
      <div className="qz-in">
        {/* 大将 */}
        <div className="qz-master">
          <div className="qz-face"><MasterFace talking={talking} /></div>
          <div className="qz-speech">
            {speech}
            {talking && <span className="qz-cur">｜</span>}
          </div>
        </div>

        {/* 名札（回答） */}
        <div className="qz-plates">
          <Plate side="left" person="host" name={hostName} />
          <Plate side="right" person="guest" name={guestName} />
        </div>

        {/* タイマー or 待機 */}
        {!reveal && !quiz.done && !myAnswered && <div className="qz-timer" key={i}><i /></div>}
        {!reveal && !quiz.done && myAnswered && <div className="qz-wait">相手が考え中…</div>}

        {/* 主導権（あいて=奥 / きみ=手前）*/}
        <div className="qz-tokens">
          <TokenRow role={oppRole} label="あいて" back />
          <TokenRow role={myRole} label="きみ" />
        </div>

        {/* のれん帯：残り問題数 */}
        <div className="qz-band">のこり{kanji(QN - i)}問</div>
      </div>

      {/* 決着 */}
      {quiz.done && (
        <div className="qz-over">
          <div className="qz-win-nm">{winName} の勝ち</div>
          <div className="qz-win-sub">
            {tie ? "痛み分け…大将の独断で" : ""}今日は「{winGenre?.label}」で決まりだ
          </div>
          <button className="qz-btn prim" onClick={() => onDecided?.(winGenre?.id)}>この味に決める</button>
          <div className="qz-over-row">
            <button className="qz-btn wood" onClick={onRematch}>もう一番</button>
            <button className="qz-btn wood" onClick={onLeave}>部屋を出る</button>
          </div>
        </div>
      )}
    </div>
  );
}
