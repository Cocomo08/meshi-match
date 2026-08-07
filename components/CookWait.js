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
          {/* 法被（藍）※体は次段階で描き直し予定 */}
          <path d="M84 124 Q120 114 156 124 L165 182 L75 182 Z" fill="#223a58" stroke="#16283d" strokeWidth="2" strokeLinejoin="round" />
          {/* 帯 */}
          <rect x="80" y="164" width="80" height="9" rx="1" fill="#7a1f16" />

          {/* ── 顔（線画・筆線ベース）── */}
          <g>
            {/* 首＋作務衣の襟（顎の下に少し覗かせる）*/}
            <path d="M113,131 L112,141 Q120,144 128,141 L127,131 Z" fill="#ecc9a0" />
            <path d="M112.6,133 Q112,138 113,141.5" fill="none" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M127.4,133 Q128,138 127,141.5" fill="none" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M104,141 L120,152 L136,141 L136,147 L120,157 L104,147 Z" fill="#223a58" />
            <path d="M107,141 L120,151 L133,141" fill="none" stroke="#e9ddc4" strokeWidth="1.6" strokeLinejoin="round" />
            {/* 側頭部の髪（短いもみあげ）＋生え際だけ（頭頂は塗らない）*/}
            <path d="M98,86 Q96,90 98,94 Q100.5,90 100,87 Z" fill="#2a2520" />
            <path d="M142,86 Q144,90 142,94 Q139.5,90 140,87 Z" fill="#2a2520" />
            <path d="M100,82 Q120,77 140,82 Q120,80 100,82 Z" fill="#2a2520" />
            {/* 耳（輪郭＋穴の線のみ）*/}
            <path d="M96,104 Q90,107 95,115 Q98,111 99,106 Z" fill="#ecc9a0" stroke="#2a2520" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M144,104 Q150,107 145,115 Q142,111 141,106 Z" fill="#ecc9a0" stroke="#2a2520" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M96,107 q2.5,2 1.5,5.5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M144,107 q-2.5,2 -1.5,5.5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
            {/* 顔の肌（顎が角ばり・頬下くびれ）*/}
            <path d="M99,88 C96,96 97,101 97,104 C97,110 99,113 100,117 C101,122 103,125 106,127 C110,130 116,133 120,133 C124,133 130,130 134,127 C137,125 139,122 140,117 C141,113 143,110 143,104 C143,101 144,96 141,88 C133,84 107,84 99,88 Z" fill="#ecc9a0" />
            {/* 影（1段・顎下の平坦なベタ）*/}
            <path d="M106,126 Q113,131 120,132.5 Q127,131 134,126 Q135,128 132,130 Q126,132.5 120,132 Q114,132.5 108,130 Q105,128 106,126 Z" fill="#d3a575" />
            {/* 輪郭の筆線【最も太い】*/}
            <path d="M95.5,104 Q97,111 98,117 Q99.5,123 105,127 Q112,131.5 120,133.5 Q128,131.5 135,127 Q140.5,123 142,117 Q143,111 144.5,104 L141,104 Q139.5,111 138.5,117 Q137,122 133,125.5 Q127,129.5 120,130.6 Q113,129.5 107,125.5 Q103,122 101.5,117 Q100.5,111 99,104 Z" fill="#2a2520" />
            {/* 鉢巻（生え際・布の厚み＋結び目＋長い垂れ＋しわ）*/}
            <path d="M96,83 Q120,75 144,83 L144,87 Q120,79.5 96,87 Z" fill="#d23a2c" />
            <path d="M96,87 Q120,79.5 144,87 L144,89.5 Q120,82 96,89.5 Z" fill="#a82418" />
            <path d="M143,83 l7,-2 l1,6 l-6,1 Z" fill="#d23a2c" />
            <path d="M150,84 Q157,88 156,96 Q155,103 150,108 L147,105 Q151,100 150,94 Q150,88 147,86 Z" fill="#d23a2c" />
            <path d="M149,89 Q154,93 152,100 L149,98 Q150,94 147.5,91 Z" fill="#a82418" />
            <path d="M104,82 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M118,80 q1,3 0,6" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M132,81 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            {/* 眉【中くらい】左右で角度差 */}
            <path d="M100,100.5 Q108,96.5 116,99 Q109,101 100,100.5 Z" fill="#2a2520" />
            <path d="M124,99 Q132,96.8 140,100.2 Q132,100.8 124,99 Z" fill="#2a2520" />
            {/* 左目：上まぶた【中】・瞳・ハイライト（現状維持）*/}
            <ellipse cx="107" cy="110" rx="3" ry="3.8" fill="#2a2520" />
            <path d="M114,106.5 Q107,106.9 100,110.5 Q106,109.2 113,108 Z" fill="#2a2520" />
            <circle cx="105.6" cy="108.5" r="1" fill="#f0e6d2" />
            <circle cx="108" cy="111.9" r="0.8" fill="#f0e6d2" opacity="0.5" />
            <path d="M102,114 Q107,115.6 112,114" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            <path d="M100,111 q-2.2,2.6 -1.2,4.8" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            <path d="M102,112.2 q-2,2 -1,3.6" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
            {/* 右目 */}
            <ellipse cx="133" cy="110" rx="3" ry="3.8" fill="#2a2520" />
            <path d="M126,106.5 Q133,106.9 140,110.5 Q134,109.2 127,108 Z" fill="#2a2520" />
            <circle cx="131.6" cy="108.5" r="1" fill="#f0e6d2" />
            <circle cx="134" cy="111.9" r="0.8" fill="#f0e6d2" opacity="0.5" />
            <path d="M128,114 Q133,115.6 138,114" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            {/* 笑い皺【細】右は角度を変えて崩す */}
            <path d="M140,110.6 q2.4,2.2 1.4,4.6" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            <path d="M138.4,112.4 q2.2,1.4 1.2,3" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
            {/* 鼻【細】短い線＋小鼻の点 */}
            <path d="M120.4,108 Q118.7,113 120.1,115.2 Q121.4,116 122.6,115.1" fill="none" stroke="#2a2520" strokeWidth="1" strokeLinecap="round" />
            <circle cx="118.4" cy="115.1" r="0.7" fill="#2a2520" />
            {/* 頬（平坦な赤み・現状維持）*/}
            <path d="M102,116 Q106,113.5 110,116 Q107,119.5 106,119.5 Q103,119.5 102,116 Z" fill="#e58a72" />
            <path d="M130,116 Q134,113.5 138,116 Q135,119.5 134,119.5 Q131,119.5 130,116 Z" fill="#e58a72" />
            {/* 口（現状維持の表情）*/}
            <path d="M111,122 Q120,127 129,122 Q120,124.4 111,122 Z" fill="#2a2520" />
          </g>

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
          <rect x="56" y="31" width="40" height="37" rx="1" fill="#1d3a5e" />
          <rect x="100" y="31" width="40" height="37" rx="1" fill="#22406e" />
          <rect x="144" y="31" width="40" height="37" rx="1" fill="#1d3a5e" />
          <text x="120" y="55" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f0e6d2"
            style={{ fontFamily: "var(--font-klee), var(--font-zen-maru), sans-serif" }}>めし</text>
        </svg>
      </div>

      <div className="cw-wait"><span className="cw-dot" /><span>{sub}</span></div>
      <button type="button" className="cw-leave" onClick={onLeave}>部屋を出る</button>
    </div>
  );
}
