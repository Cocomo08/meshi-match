"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32, seedFrom } from "@/lib/rng";

// 大将のお題（読み合いクイズ・2端末同期）
//  ・大将がお題を出す → 二人が同時に「どっち(人)」かを選ぶ
//  ・回答が一致したら、その人に木札1枚。割れたら誰にも入らない
//  ・全5問。木札の多い方が勝ち（＝その人の推しジャンルに決定）
//  同期：進行(quiz)はホストが所有。各自の回答は ansHost/ansGuest に別キーで書く。

const QUESTIONS = [
  "辛いもんが好きなのはどっちだ",
  "先に腹が減るのはどっちだ",
  "好き嫌いが多いのはどっちだ",
  "大盛りを頼むのはどっちだ",
  "デザートまで食うのはどっちだ",
  "新しい店に飛び込むのはどっちだ",
  "同じ店に通い続けるのはどっちだ",
];
const REACT_MATCH = ["そりゃそうだ", "息が合ってるな"];
const REACT_SPLIT = "意見が割れたな";
const QN = 5; // 出題数

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

/* 得点＝木札の積み上がり */
.qz-scores { display:flex; justify-content:space-between; gap:10px; }
.qz-score { flex:1; text-align:center; }
.qz-score .nm { font-size:11px; font-weight:900; color:#e8dcc4; letter-spacing:.04em; }
.qz-pile { display:flex; flex-direction:column-reverse; align-items:center; gap:2px; min-height:70px; justify-content:flex-start; margin-top:4px; }
.qz-chip { width:52px; height:11px; border-radius:2px; background:#7a5230; border:1px solid #3f2a15;
  box-shadow: inset 0 1px 0 rgba(255,224,170,.3), inset 0 -1px 0 rgba(0,0,0,.4); }
.qz-chip.g { animation: qzPop .3s ease both; }
@keyframes qzPop { from{ transform:translateY(-10px) scale(.8); opacity:0 } to{ transform:none; opacity:1 } }

/* 名札（回答の選択肢） */
.qz-plates { flex:1; display:flex; align-items:center; justify-content:center; gap:14px; }
.qz-plate { position:relative; flex:1; max-width:150px; padding:26px 8px 22px; border-radius:6px; text-align:center;
  border:2px solid #3f2a15; cursor:pointer; transition: transform .06s ease;
  box-shadow: inset 0 2px 0 rgba(255,224,170,.3), inset 0 -3px 0 rgba(0,0,0,.42); }
.qz-plate.left { background:#6f4b2a; } .qz-plate.right { background:#855e35; }
.qz-plate::before { content:""; position:absolute; left:50%; top:-16px; width:2px; height:16px; background:#241f1c; transform:translateX(-50%); }
.qz-plate .nm { color:#241c14; font-weight:900; font-size:20px; letter-spacing:.02em; line-height:1.15;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; text-shadow:0 1px 0 rgba(255,224,170,.18); }
.qz-plate.mine { box-shadow: inset 0 2px 0 rgba(255,224,170,.3), inset 0 -3px 0 rgba(0,0,0,.42), 0 0 0 3px rgba(255,224,170,.45); }
.qz-plate:not(.locked):active { transform: translateY(2px); }
.qz-plate.win { box-shadow: 0 0 22px 5px rgba(255,196,120,.85), inset 0 0 0 2px rgba(255,236,190,.7); background:#c9962f; }
.qz-plate.win .nm { color:#241c14; }
/* 開示：投票チップ */
.qz-votes { position:absolute; left:0; right:0; bottom:-26px; display:flex; justify-content:center; gap:5px; }
.qz-vote { font-size:10px; font-weight:900; color:#241c14; background:#efe3c6; border:1px solid #b0a37d; border-radius:999px; padding:1px 7px; }
.qz-vote.g { animation: qzPop .3s ease both; }

/* タイマー */
.qz-timer { height:5px; border-radius:3px; background:rgba(0,0,0,.4); overflow:hidden; }
.qz-timer i { display:block; height:100%; background:linear-gradient(90deg,#ffcf6a,#e0483b); animation: qzTime 8s linear both; }
@keyframes qzTime { from{ width:100% } to{ width:0% } }

/* のれん帯（残り問題数） */
.qz-band { align-self:center; position:relative; background:#f0e6d2; color:#2a2520; border-radius:3px; padding:6px 20px;
  font-size:12px; font-weight:800; letter-spacing:.06em; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.qz-band::before { content:""; position:absolute; left:8px; right:8px; top:-3px; height:3px; background:#241f1c; border-radius:2px; }

.qz-wait { text-align:center; font-size:13px; font-weight:800; color:#e8dcc4; }

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

/* 退出/変更 */
.qz-quit { position:absolute; top:10px; left:12px; z-index:4; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811;
  border-radius:5px; padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

@media (prefers-reduced-motion: reduce) {
  .qz-chip.g, .qz-vote.g, .qz-over { animation:none; }
  .qz-timer i { animation:none; width:100%; }
}
`;

function MasterFace({ talking }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="#f0e6d2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="32" cy="36" r="20" />
      {/* 鉢巻 */}
      <path d="M12 24 Q32 16 52 24" stroke="#e0483b" strokeWidth="4" />
      <path d="M52 24 l7 -4 M52 24 l6 6" stroke="#e0483b" strokeWidth="4" />
      {/* 目 */}
      <path d="M25 37 h.01" strokeWidth="4.5" />
      <path d="M39 37 h.01" strokeWidth="4.5" />
      {/* 口 */}
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

  // お題5問（seedで両端末一致）
  const picks = useMemo(() => {
    const rng = mulberry32(seedFrom(String(seed) + "quiz"));
    const idx = QUESTIONS.map((_, k) => k);
    for (let k = idx.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [idx[k], idx[j]] = [idx[j], idx[k]];
    }
    return idx.slice(0, QN);
  }, [seed]);

  // ホストが進行を初期化
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

  // お題の一文字ずつ表示
  const qText = QUESTIONS[picks[i]] ?? "";
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!quiz || quiz.done) return;
    if (isRed) { setTyped(qText.length); return; }
    setTyped(0);
    let n = 0;
    const id = setInterval(() => { n += 1; setTyped(n); if (n >= qText.length) clearInterval(id); }, 40);
    return () => clearInterval(id);
  }, [i, qText, quiz?.done, isRed]);

  // 8秒でランダム自動回答
  useEffect(() => {
    if (!quiz || quiz.done || myAnswered) return;
    const remain = 8000 - (Date.now() - (quiz.startedAt || Date.now()));
    const id = setTimeout(() => {
      writeAns(myRole, { q: i, pick: Math.random() < 0.5 ? "host" : "guest" });
    }, Math.max(0, remain));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, quiz?.startedAt, myAnswered, quiz?.done]);

  // ホスト：両者そろったら開示 → 少し待って採点＆次へ
  useEffect(() => {
    if (!isHost || !quiz || quiz.done) return;
    if (!(ansHost?.q === i && ansGuest?.q === i)) return;
    const id = setTimeout(() => {
      const winner = ansHost.pick === ansGuest.pick ? ansHost.pick : null;
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
  const remainingQ = QN - i;

  // 開示情報
  const myPick = myAns?.pick;
  const oppPick = oppAns?.pick;
  const matched = reveal && myPick === oppPick;
  const winPerson = matched ? myPick : null;
  const reactionSeed = seedFrom(String(seed) + "r" + i) % REACT_MATCH.length;
  const speech = quiz.done
    ? "勝負あり！"
    : reveal
      ? matched ? REACT_MATCH[reactionSeed] : REACT_SPLIT
      : qText.slice(0, typed);
  const talking = !reveal && !quiz.done && typed < qText.length;

  // 各名札への投票（開示時のみ）
  const votesFor = (person) => {
    if (!reveal) return [];
    const v = [];
    if (myPick === person) v.push("きみ");
    if (oppPick === person) v.push("あいて");
    return v;
  };

  // 決着
  const overallWinner = scores.host > scores.guest ? "host" : scores.guest > scores.host ? "guest" : (mulberry32(seedFrom(String(seed) + "tie"))() < 0.5 ? "host" : "guest");
  const winName = overallWinner === "host" ? hostName : guestName;
  const winGenre = overallWinner === "host" ? hostGenre : guestGenre;

  const Plate = ({ side, person, name }) => {
    const votes = votesFor(person);
    const cls = [
      "qz-plate",
      side,
      myAnswered && myPick === person && !reveal ? "mine" : "",
      reveal ? "locked" : "",
      winPerson === person ? "win" : "",
    ].join(" ");
    return (
      <button type="button" className={cls} onClick={() => answer(person)} disabled={myAnswered || reveal || quiz.done}>
        <span className="nm">{name}</span>
        {reveal && votes.length > 0 && (
          <span className="qz-votes">
            {votes.map((v) => (
              <span key={v} className={`qz-vote ${isRed ? "" : "g"}`}>{v}</span>
            ))}
          </span>
        )}
      </button>
    );
  };

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

        {/* 得点＝木札の積み上がり */}
        <div className="qz-scores">
          {[["host", hostName], ["guest", guestName]].map(([p, nm]) => (
            <div className="qz-score" key={p}>
              <div className="nm">{nm}</div>
              <div className="qz-pile">
                {Array.from({ length: scores[p] }).map((_, k) => (
                  <span key={k} className={`qz-chip ${!isRed && k === scores[p] - 1 ? "g" : ""}`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 名札（回答） */}
        <div className="qz-plates">
          <Plate side="left" person="host" name={hostName} />
          <Plate side="right" person="guest" name={guestName} />
        </div>

        {/* タイマー or 待機 */}
        {!reveal && !quiz.done && !myAnswered && (
          <div className="qz-timer" key={i}><i /></div>
        )}
        {!reveal && !quiz.done && myAnswered && <div className="qz-wait">相手が考え中…</div>}

        {/* のれん帯：残り問題数 */}
        <div className="qz-band">のこり{kanji(remainingQ)}問</div>
      </div>

      {/* 決着 */}
      {quiz.done && (
        <div className="qz-over">
          <div className="qz-win-nm">{winName} の勝ち</div>
          <div className="qz-win-sub">今日は「{winGenre?.label}」で決まりだ</div>
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
