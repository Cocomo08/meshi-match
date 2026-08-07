"use client";

import { useState } from "react";

// スワイプ完了後の待機画面（夜の屋台テーマ）
//  「きみの注文は通った。あとは相手を待つ」——のれんの奥で大将が鍋を振っている
//  背景は他画面と同じ屋台の内壁（呼び出し元の StallWall が担当）

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CSS = `
.cw { display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; color:#f0e6d2;
  font-family: var(--font-zen-maru), sans-serif; }
.cw-band { position:relative; background:#f0e6d2; color:#2a2520; border-radius:3px; padding:8px 22px; font-weight:900; font-size:15px;
  letter-spacing:.04em; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; }
.cw-band::before { content:""; position:absolute; left:10px; right:10px; top:-3px; height:3px; background:#241f1c; border-radius:2px; }

.cw-stage { position:relative; width:min(78vw,296px); }
.cw-art { width:100%; height:auto; display:block; filter: drop-shadow(0 10px 14px rgba(0,0,0,.5)); }
/* 鍋の湯気 */
.cw-steam { position:absolute; left:0; right:0; top:36%; height:34%; display:flex; justify-content:center; gap:13%; pointer-events:none; }
.cw-steam i { display:block; width:9px; height:100%; border-radius:50%;
  background: linear-gradient(180deg, transparent, rgba(255,242,224,.5) 55%, rgba(255,246,232,.72));
  filter: blur(2.4px); transform-origin:bottom center; animation: cwSteam 2.4s ease-in-out infinite; }
.cw-steam i:nth-child(2){ animation-delay:.7s; height:86%; } .cw-steam i:nth-child(3){ animation-delay:1.3s; height:78%; }
@keyframes cwSteam {
  0%{ transform:translateY(22%) scaleY(.7) skewX(0); opacity:0; }
  30%{ opacity:.85; } 60%{ transform:translateY(-4%) scaleY(1.1) skewX(6deg); opacity:.5; }
  100%{ transform:translateY(-30%) scaleY(1.22) skewX(-6deg); opacity:0; }
}

.cw-wait { display:inline-flex; align-items:center; gap:8px; background:#f0e6d2; color:#2a2520; padding:6px 16px; border-radius:3px;
  font-size:13px; font-weight:800; box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.cw-dot { width:8px; height:8px; border-radius:50%; background:#e0483b; box-shadow:0 0 7px rgba(224,72,59,.8);
  animation: cwPulse 1.2s ease-in-out infinite; }
@keyframes cwPulse { 0%,100%{ opacity:1; transform:scale(1) } 50%{ opacity:.35; transform:scale(.68) } }

.cw-leave { margin-top:2px; background:#3a2a1b; color:#e8dcc4; border:1px solid #241811; border-radius:5px; padding:9px 26px;
  font-weight:800; letter-spacing:.08em; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 rgba(255,224,170,.25), inset 0 -1px 0 rgba(0,0,0,.5); }
.cw-leave:active { transform:translateY(2px); box-shadow: inset 0 1px 0 rgba(0,0,0,.5), inset 0 -1px 0 rgba(255,224,170,.25); }

@media (prefers-reduced-motion: reduce) {
  .cw-steam i { animation:none; opacity:.6; transform:none; }
  .cw-dot { animation:none; }
}
`;

export default function CookWait({ title = "きみの注文は通った", sub = "相手を待っています…", onLeave }) {
  const [isRed] = useState(() => reduced());
  return (
    <div className="cw">
      <style>{CSS}</style>
      <div className="cw-band">{title}</div>

      <div className="cw-stage">
        <div className="cw-steam"><i /><i /><i /></div>
        <svg className="cw-art" viewBox="0 0 240 212" fill="none" aria-hidden>
          {/* ── 大将（のれんの奥）── */}
          {/* 法被（藍）*/}
          <path d="M84 124 Q120 114 156 124 L165 182 L75 182 Z" fill="#223a58" stroke="#16283d" strokeWidth="2" strokeLinejoin="round" />
          {/* 襟 */}
          <path d="M112 118 L120 142 L128 118 Z" fill="#e9ddc4" />
          {/* 帯 */}
          <rect x="80" y="164" width="80" height="9" rx="1" fill="#7a1f16" />
          {/* 頭 */}
          <circle cx="120" cy="98" r="21" fill="#e6c6a0" stroke="#c9a578" strokeWidth="1.5" />
          {/* 鉢巻 */}
          <path d="M100 90 Q120 82 140 90" stroke="#e0483b" strokeWidth="6" strokeLinecap="round" />
          <path d="M140 90 l7 -3 M140 90 l6 6" stroke="#e0483b" strokeWidth="5" strokeLinecap="round" />
          {/* 目・口 */}
          <circle cx="112" cy="100" r="1.9" fill="#2a2018" /><circle cx="128" cy="100" r="1.9" fill="#2a2018" />
          <path d="M112 110 q8 5 16 0" stroke="#7a4b30" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* ── 振る腕＋中華鍋（2秒周期のループ）── */}
          <g>
            {!isRed && (
              <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
                calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                values="-5 120 130; 5 120 130; -5 120 130" />
            )}
            {/* 腕 */}
            <path d="M92 128 Q76 142 84 154" stroke="#223a58" strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d="M148 128 Q166 142 156 152" stroke="#223a58" strokeWidth="11" fill="none" strokeLinecap="round" />
            {/* 手 */}
            <circle cx="84" cy="154" r="5.5" fill="#e6c6a0" /><circle cx="156" cy="152" r="5.5" fill="#e6c6a0" />
            {/* 柄 */}
            <rect x="158" y="147" width="32" height="5" rx="2.5" fill="#5a3a20" transform="rotate(-7 158 149)" />
            {/* 中華鍋 */}
            <ellipse cx="120" cy="150" rx="44" ry="9" fill="#2b2b30" />
            <path d="M76 150 Q120 178 164 150" stroke="#43434a" strokeWidth="4" fill="none" strokeLinecap="round" />
            {/* 具（炒め物）*/}
            <ellipse cx="120" cy="148" rx="28" ry="5.5" fill="#8a5a2a" />
            <circle cx="108" cy="147" r="2.6" fill="#c98a3a" />
            <circle cx="128" cy="148" r="2.6" fill="#6a9a3a" />
            <circle cx="119" cy="146" r="2.4" fill="#c94a3a" />
            <circle cx="132" cy="146" r="2.2" fill="#d8b85a" />
          </g>

          {/* ── のれん（手前・上。奥に大将が見える）── */}
          <rect x="34" y="24" width="172" height="7" rx="2" fill="#4a3320" />
          <rect x="56" y="31" width="40" height="54" rx="1" fill="#1d3a5e" />
          <rect x="100" y="31" width="40" height="54" rx="1" fill="#22406e" />
          <rect x="144" y="31" width="40" height="54" rx="1" fill="#1d3a5e" />
          <text x="120" y="63" textAnchor="middle" fontSize="21" fontWeight="900" fill="#f0e6d2"
            style={{ fontFamily: "var(--font-klee), var(--font-zen-maru), sans-serif" }}>めし</text>
        </svg>
      </div>

      <div className="cw-wait"><span className="cw-dot" /><span>{sub}</span></div>
      <button type="button" className="cw-leave" onClick={onLeave}>部屋を出る</button>
    </div>
  );
}
