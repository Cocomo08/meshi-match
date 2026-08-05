"use client";

import { useState } from "react";

// 「勝負のしかた」を選ぶ券売機（夜の屋台テーマ・食券機の筐体を流用）
//  props: leftName / rightName（対戦する2ジャンル名）/ onPick(id) / onLeave
//  ボタンは既存ゲームに割り当て（本体は次ステップ）：
//   割り箸勝負→battle / 早食い勝負→slot / 大将のお題→amida

const SHOUT = [
  "真っ二つだな。どう決める",
  "まあ落ち着け。勝負で決めよう",
  "好きなの選びな。恨みっこなしだぞ",
];

// ── 墨の線画（コード描画・絵文字なし・stroke=currentColorで点灯/消灯に追従）──
function IconChopsticks() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6 L24 6" />
      <path d="M16 7 L11 34" />
      <path d="M23 7 L28 34" />
    </svg>
  );
}
function IconBowl() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 湯気 */}
      <path d="M15 15 q-3 -3 0 -6 q3 -3 0 -6" />
      <path d="M25 15 q3 -3 0 -6 q-3 -3 0 -6" />
      {/* 丼 */}
      <path d="M6 22 L34 22" />
      <path d="M8 22 Q20 35 32 22" />
      <path d="M15 33 L25 33" />
    </svg>
  );
}
function IconOyakata() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="20" cy="22" r="12" />
      {/* 鉢巻 */}
      <path d="M8 15 Q20 10 32 15" />
      <path d="M32 15 l5 -3 M32 15 l4 4" />
      {/* 目 */}
      <path d="M16 23 h.01" strokeWidth="3.2" />
      <path d="M24 23 h.01" strokeWidth="3.2" />
    </svg>
  );
}

const GAMES = [
  { id: "battle", name: "割り箸勝負", Icon: IconChopsticks },
  { id: "slot", name: "早食い勝負", Icon: IconBowl },
  { id: "amida", name: "大将のお題", Icon: IconOyakata },
];

const CSS = `
.gp { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%;
  font-family: var(--font-zen-maru), sans-serif; }

/* ── 上部：木の名札2枚＋中央「対」── */
.gp-versus { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:6px; }
.gp-plate { position:relative; width:104px; max-width:32vw; padding:14px 8px 12px; border-radius:5px; text-align:center;
  border:1px solid #3f2a15; box-shadow: inset 0 1px 0 rgba(255,224,170,.30), inset 0 -2px 0 rgba(0,0,0,.4); }
.gp-plate.left { background:#6f4b2a; }
.gp-plate.right { background:#855e35; }
.gp-plate::before { content:""; position:absolute; left:50%; top:-18px; width:2px; height:18px; background:#241f1c; transform:translateX(-50%); }
.gp-hole { position:absolute; left:50%; top:6px; width:8px; height:8px; border-radius:50%; transform:translateX(-50%);
  background:#2a1c0e; box-shadow: inset 0 1px 1px rgba(0,0,0,.7); }
.gp-name { display:block; margin-top:8px; color:#241c14; font-weight:900; font-size:16px; letter-spacing:.02em; line-height:1.15;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; text-shadow:0 1px 0 rgba(255,224,170,.18); }
.gp-tai { font-weight:900; font-size:38px; line-height:1; color:#e0483b; -webkit-text-stroke:3px #f4eddc;
  text-shadow:0 3px 0 rgba(0,0,0,.25); flex:0 0 auto; }

/* ── 券売機の筐体（食券機と同じマット金属・ベベル）── */
.gp-machine { position:relative; width:300px; max-width:88vw; background:#565b62; border:2px solid #34373c; border-radius:12px;
  padding:11px 12px 13px;
  box-shadow: inset 2px 2px 0 #6a7079, inset -2px -3px 0 #40444a, 0 8px 0 #26282d, 0 14px 24px rgba(0,0,0,.5); }
.gp-head { color:#c9ccd1; font-size:11px; font-weight:800; letter-spacing:.28em; text-align:center; padding:2px 0 9px;
  border-bottom:2px solid #43474d; }
.gp-btns { display:flex; flex-direction:column; gap:9px; margin-top:10px; }
/* ボタン：消灯がデフォルト。hover/focusで点灯。押下でベベル反転＋2px沈む */
.gp-btn { display:flex; align-items:center; gap:12px; width:100%; padding:0 14px; height:56px; border-radius:5px;
  background:#2b3037; color:#8a929c; border:1px solid #191c20; cursor:pointer; font-family:inherit;
  box-shadow: inset 1px 1px 0 #3b414a, inset -1px -2px 0 #191c20, 0 2px 0 #16181c; transition: none; }
.gp-btn:hover, .gp-btn:focus-visible { background:#ece0bf; color:#26251f; border-color:#b7ab84; outline:none;
  box-shadow: inset 2px 2px 0 #cbbd94, inset -1px -2px 0 #fff6db, 0 2px 0 #a99a6f; }
.gp-btn:active { transform: translateY(2px);
  box-shadow: inset -1px -2px 0 #cbbd94, inset 1px 2px 0 #fff6db, 0 0 0 #a99a6f; }
.gp-icon { flex:0 0 auto; width:34px; height:34px; }
.gp-icon svg { width:100%; height:100%; display:block; }
.gp-label { font-size:17px; font-weight:900; letter-spacing:.06em;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }

/* ── 大将のセリフ（のれん状の帯）── */
.gp-shout { display:flex; justify-content:center; width:100%; }
.gp-band { position:relative; background:#f0e6d2; color:#2a2520; padding:10px 22px; border-radius:3px; max-width:92%;
  text-align:center; font-size:13px; font-weight:800; letter-spacing:.02em;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.gp-band::before { content:""; position:absolute; left:10px; right:10px; top:-4px; height:3px; background:#241f1c; border-radius:2px; }

/* ── 部屋を出る（木札）── */
.gp-leave { background:#3a2a1b; color:#e8dcc4; border:1px solid #241811; border-radius:5px; padding:9px 26px;
  font-weight:800; letter-spacing:.08em; cursor:pointer; font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.gp-leave:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(0,0,0,.5), inset 0 -1px 0 rgba(255,224,170,.25); }
`;

export default function GamePicker({ leftName = "きみ", rightName = "あいて", onPick, onLeave }) {
  const [line] = useState(() => SHOUT[Math.floor(Math.random() * SHOUT.length)]);
  return (
    <div className="gp">
      <style>{CSS}</style>

      {/* 対戦する2ジャンル */}
      <div className="gp-versus">
        <div className="gp-plate left">
          <span className="gp-hole" />
          <span className="gp-name">{leftName}</span>
        </div>
        <div className="gp-tai">対</div>
        <div className="gp-plate right">
          <span className="gp-hole" />
          <span className="gp-name">{rightName}</span>
        </div>
      </div>

      {/* 券売機 */}
      <div className="gp-machine">
        <div className="gp-head">勝負のしかた</div>
        <div className="gp-btns">
          {GAMES.map((g) => (
            <button key={g.id} type="button" className="gp-btn" onClick={() => onPick?.(g.id)}>
              <span className="gp-icon">
                <g.Icon />
              </span>
              <span className="gp-label">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 大将のセリフ */}
      <div className="gp-shout">
        <div className="gp-band">{line}</div>
      </div>

      <button type="button" className="gp-leave" onClick={onLeave}>
        部屋を出る
      </button>
    </div>
  );
}
