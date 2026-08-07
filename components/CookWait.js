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

          {/* ── 顔（線画・筆線ベース）── */}
          <g>
            {/* 髪（鉢巻の奥）*/}
            <path d="M97,88 Q95,75 108,72 Q120,70 132,72 Q145,75 143,88 Q120,81 97,88 Z" fill="#2a2520" />
            {/* 耳 */}
            <path d="M98,102 Q93,105 97,112 Q99,108 100,104 Z" fill="#ecc9a0" />
            <path d="M142,102 Q147,105 143,112 Q141,108 140,104 Z" fill="#ecc9a0" />
            <path d="M97,105 q2,2 1,5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M143,105 q-2,2 -1,5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
            {/* 顔の肌（顎が角ばり・頬下がくびれる）*/}
            <path d="M99,88 C96,96 97,101 97,104 C97,110 99,113 100,116 C101,121 103,124 106,126 C110,129 116,131 120,131 C124,131 130,129 134,126 C137,124 139,121 140,116 C141,113 143,110 143,104 C143,101 144,96 141,88 C133,84 107,84 99,88 Z" fill="#ecc9a0" />
            {/* 影（1段・顎下の平坦なベタ）*/}
            <path d="M105,124 Q112,129.5 120,131 Q128,129.5 135,124 Q136,126 133,128 Q127,130.5 120,130 Q113,130.5 107,128 Q104,126 105,124 Z" fill="#d3a575" />
            {/* 輪郭の筆線（顎〜顔の縁）：外縁を肌より約1px外にして肌を髭の内側におさめる */}
            <path d="M96,104 C96,110 98,113.2 99,116.5 C100,121.3 102,124.6 105,127 C109.5,130 116,132 120,132 C124,132 130.5,130 135,127 C138,124.6 140,121.3 141,116.5 C142,113.2 144,110 144,104 L140.5,104 C140.5,110 139,112.5 137.6,116 C136.6,120.5 134.5,123 132,124.5 C128.5,127 124,128.6 120,128.6 C116,128.6 111.5,127 108,124.5 C105.5,123 103.4,120.5 102.4,116 C101,112.5 99.5,110 99.5,104 Z" fill="#2a2520" />
            {/* 鉢巻（布の厚み＋結び目＋しわ）*/}
            <path d="M96,86 Q120,77 144,86 L144,90 Q120,82 96,90 Z" fill="#d23a2c" />
            <path d="M96,90 Q120,82 144,90 L144,92.5 Q120,85 96,92.5 Z" fill="#a82418" />
            <path d="M143,86 l9,-3 l-2,5 l7,3 l-8,2 l1,-4 Z" fill="#d23a2c" />
            <path d="M143,89 l8,1 l-7,3 Z" fill="#a82418" />
            <path d="M104,85 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M118,83 q1,3 0,6" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M132,84 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
            {/* 眉（太い墨・左右で角度差）*/}
            <path d="M103,96 Q110,90 118,92.5 Q111,96.5 103,96 Z" fill="#2a2520" />
            <path d="M122,92.5 Q130,90 137,94 Q130,95.8 122,92.5 Z" fill="#2a2520" />
            {/* 左目（上まぶた・瞳・ハイライト）※目そのものは変更しない・目を囲む線は眼鏡のみ */}
            <ellipse cx="111" cy="103.5" rx="3" ry="3.8" fill="#2a2520" />
            <path d="M118,100 Q111,100.4 104,104 Q110,103 117,101.6 Z" fill="#2a2520" />
            <circle cx="109.6" cy="102" r="1" fill="#f0e6d2" />
            <circle cx="112" cy="105.4" r="0.8" fill="#f0e6d2" opacity="0.5" />
            {/* 右目 */}
            <ellipse cx="129" cy="103.5" rx="3" ry="3.8" fill="#2a2520" />
            <path d="M122,100 Q129,100.4 136,104 Q130,103 123,101.6 Z" fill="#2a2520" />
            <circle cx="127.6" cy="102" r="1" fill="#f0e6d2" />
            <circle cx="130" cy="105.4" r="0.8" fill="#f0e6d2" opacity="0.5" />
            {/* 鼻（短い線＋小鼻の点）*/}
            <path d="M120.4,103.5 Q118.7,108 120.1,110.2 Q121.4,111 122.6,110.1" fill="none" stroke="#2a2520" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="118.4" cy="110.1" r="0.7" fill="#2a2520" />
            {/* 頬（平坦な赤み）*/}
            <path d="M101,110 Q105,107.5 109,110 Q106,113.5 105,113.5 Q102,113.5 101,110 Z" fill="#e58a72" />
            <path d="M131,110 Q135,107.5 139,110 Q136,113.5 135,113.5 Q132,113.5 131,110 Z" fill="#e58a72" />
            {/* 口（口角の上がった線・歯なし）*/}
            <path d="M111,117 Q120,122 129,117 Q120,119.4 111,117 Z" fill="#2a2520" />
            {/* 笑い皺（目尻の外側・眼鏡フレームより外だけ）*/}
            <path d="M102.4,105.4 q-2,2.5 -1,4.6" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            <path d="M103.6,106.8 q-1.8,1.7 -0.8,3.2" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M137.6,105.4 q2,2.5 1,4.6" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
            <path d="M136.4,106.8 q1.8,1.7 0.8,3.2" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
            {/* ── 眼鏡（意図的パーツ・墨色／フレームは輪郭より細く皺より太い中間）── */}
            {/* つる（耳の手前で自然に消す）*/}
            <path d="M104,102.6 Q101,101.4 98.6,101.7" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M136,102.6 Q139,101.4 141.4,101.7" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
            {/* レンズ（わずかに横長の楕円・中は透明）*/}
            <ellipse cx="111" cy="103" rx="7" ry="5.8" fill="none" stroke="#2a2520" strokeWidth="1.3" />
            <ellipse cx="129" cy="103" rx="7" ry="5.8" fill="none" stroke="#2a2520" strokeWidth="1.3" />
            {/* ブリッジ（鼻の付け根）*/}
            <path d="M118,102 Q120,99.8 122,102" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
            {/* 反射（レンズ左上に細い斜め線・瞳のハイライトと重ねない）*/}
            <path d="M106.2,100.6 L108.6,98.4" fill="none" stroke="#f0e6d2" strokeWidth="1" strokeLinecap="round" />
            <path d="M124.2,100.6 L126.6,98.4" fill="none" stroke="#f0e6d2" strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* ── 振る腕＋中華鍋＋炒め物（2秒周期のループ・鍋と具が一緒に動く）── */}
          <g>
            {!isRed && (
              <animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"
                calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                values="-5 118 134; 5 118 134; -5 118 134" />
            )}
            <defs>
              <linearGradient id="cwFlame" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#a82c12" /><stop offset="0.5" stopColor="#c85f22" /><stop offset="1" stopColor="#dd9a3a" />
              </linearGradient>
              <linearGradient id="cwFlame2" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#9e2810" /><stop offset="0.6" stopColor="#c25520" /><stop offset="1" stopColor="#d68a34" />
              </linearGradient>
              <clipPath id="cwWokClip"><ellipse cx="116" cy="146" rx="41" ry="11" /></clipPath>
            </defs>

            {/* 腕（法被の袖）：左は鍋の左縁、右は柄を握る手へ */}
            <path d="M92 128 Q78 140 74 149" stroke="#223a58" strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d="M148 128 Q160 130 164 135" stroke="#223a58" strokeWidth="11" fill="none" strokeLinecap="round" />

            {/* 柄（木・右上へ）＋握る拳 */}
            <g transform="rotate(-24 160 128)">
              <rect x="158" y="123" width="44" height="7.5" rx="3.5" fill="#6a4a28" />
              <rect x="158" y="123.6" width="44" height="2.2" rx="1" fill="#8a6a40" />
              <rect x="196" y="122.4" width="7" height="9" rx="2.5" fill="#4a3018" />
            </g>
            <g transform="rotate(-24 166 136)">
              <path d="M159,133 Q159,128.5 165,128.5 L172,129.5 Q176.5,130 176.5,135.5 Q176.5,141.5 170,141.5 L163,140.5 Q159,139.5 159,133 Z" fill="#ecc9a0" />
              <path d="M162.5,130 v9.5 M167,129.6 v10 M171.2,130 v9.6" fill="none" stroke="#c9a578" strokeWidth="0.8" />
              <path d="M159.5,136 q-3.2,1 -2.2,4.3 q1,2 3.5,1.8" fill="#ecc9a0" stroke="#c9a578" strokeWidth="0.7" />
            </g>

            {/* 鍋 本体（鉄・やや上から）*/}
            <path d="M70,146 C72,161 87,173 116,173 C145,173 160,161 162,146 A 46 12 0 0 1 70 146 Z" fill="#26262b" />
            <ellipse cx="116" cy="168" rx="26" ry="6.5" fill="#3a2416" opacity="0.5" />
            <ellipse cx="116" cy="146" rx="43" ry="12" fill="#44444d" />
            <ellipse cx="116" cy="147.5" rx="40" ry="10" fill="#3c3c45" />
            <path d="M77,142.5 A 41 10.5 0 0 1 155 142.5" fill="none" stroke="#82828e" strokeWidth="1.2" strokeLinecap="round" />
            {/* 左手（前縁を握る）*/}
            <ellipse cx="73" cy="148" rx="6" ry="5" fill="#ecc9a0" />

            {/* 中身（炒め物・口の楕円にクリップ）*/}
            <g clipPath="url(#cwWokClip)">
              <g stroke="#d2cca0" strokeWidth="1.7" fill="none" strokeLinecap="round">
                <path d="M80,150 q6,-3 12,0 t12,0" />
                <path d="M96,152 q6,-3 12,0 t13,0" />
                <path d="M112,150.5 q6,-3 12,0 t12,0" />
                <path d="M86,147 q5,-2.5 11,0 t11,0" />
                <path d="M124,151 q5,-3 10,0 t10,0" />
                <path d="M100,148 q5,-2.5 10,0" />
              </g>
              <path d="M82,145 Q86,139 94,141 Q101,143 99,149 Q93,153 85,151 Q78,149 82,145 Z" fill="#7c9a5e" />
              <ellipse cx="89" cy="146" rx="3.4" ry="1.9" fill="#cdd2b4" />
              <path d="M126,144 Q131,138 139,141 Q145,144 142,150 Q135,153 128,150 Q123,147 126,144 Z" fill="#83a064" />
              <ellipse cx="134" cy="145" rx="3.2" ry="1.8" fill="#cdd2b4" />
              <path d="M104,149 Q109,144 116,146 Q122,148 119,153 Q112,156 106,153 Q101,151 104,149 Z" fill="#77935a" />
              <ellipse cx="111" cy="150" rx="3" ry="1.7" fill="#c6cdae" />
              <g transform="rotate(-14 100 146)"><rect x="93" y="143.5" width="15" height="5.2" rx="1.6" fill="#b98d5e" /><rect x="93" y="143.5" width="15" height="1.7" rx="0.8" fill="#6e3f1e" /><rect x="93" y="147" width="15" height="1.7" rx="0.8" fill="#6e3f1e" /></g>
              <g transform="rotate(10 128 149)"><rect x="121" y="146.5" width="14" height="5" rx="1.6" fill="#bd9060" /><rect x="121" y="146.5" width="14" height="1.6" rx="0.8" fill="#6e3f1e" /><rect x="121" y="149.9" width="14" height="1.6" rx="0.8" fill="#6e3f1e" /></g>
              <g transform="rotate(-4 112 143)"><rect x="105" y="140.5" width="14" height="4.8" rx="1.6" fill="#b58a5a" /><rect x="105" y="140.5" width="14" height="1.5" rx="0.8" fill="#6e3f1e" /><rect x="105" y="143.8" width="14" height="1.5" rx="0.8" fill="#6e3f1e" /></g>
              <rect x="118" y="141" width="13" height="2.7" rx="1" fill="#c0763a" transform="rotate(26 124 142)" />
              <rect x="92" y="150" width="12" height="2.5" rx="1" fill="#bb713a" transform="rotate(-18 98 151)" />
              <rect x="132" y="150" width="12" height="2.5" rx="1" fill="#c0763a" transform="rotate(12 138 151)" />
              <g transform="rotate(38 98 142)"><ellipse cx="98" cy="142" rx="3.6" ry="1.7" fill="#6f8f3f" /><ellipse cx="98" cy="142" rx="1.5" ry="0.7" fill="#b8cc88" /></g>
              <g transform="rotate(-30 120 141)"><ellipse cx="120" cy="141" rx="3.4" ry="1.6" fill="#74963f" /><ellipse cx="120" cy="141" rx="1.4" ry="0.7" fill="#b8cc88" /></g>
              <g transform="rotate(46 140 147)"><ellipse cx="140" cy="147" rx="3.4" ry="1.6" fill="#6f8f3f" /><ellipse cx="140" cy="147" rx="1.4" ry="0.7" fill="#b8cc88" /></g>
              <g transform="rotate(-22 108 152)"><ellipse cx="108" cy="152" rx="3.2" ry="1.5" fill="#74963f" /><ellipse cx="108" cy="152" rx="1.3" ry="0.6" fill="#b8cc88" /></g>
              <g stroke="#efe6c8" strokeWidth="1" strokeLinecap="round" opacity="0.55">
                <path d="M90,143 l3,-1" /><path d="M116,148 l3,-1" /><path d="M132,143 l3,-1" /><path d="M104,146 l2.5,-1" />
              </g>
            </g>
            {/* 縁の上に盛る（clip外）*/}
            <g transform="rotate(30 84 140)"><ellipse cx="84" cy="140" rx="3.4" ry="1.6" fill="#74963f" /><ellipse cx="84" cy="140" rx="1.4" ry="0.7" fill="#b8cc88" /></g>
            <path d="M144,141 Q148,136 154,138 Q159,141 156,146 Q150,148 145,145 Q142,143 144,141 Z" fill="#83a064" />
            <ellipse cx="150" cy="141.5" rx="2.8" ry="1.6" fill="#cdd2b4" />

            {/* 宙に舞う具（小さめ・傾ける）*/}
            <g transform="rotate(-18 96 126)"><rect x="90" y="124" width="12" height="4.4" rx="1.4" fill="#bd9060" /><rect x="90" y="124" width="12" height="1.4" fill="#6e3f1e" /><rect x="90" y="127" width="12" height="1.4" fill="#6e3f1e" /></g>
            <g transform="rotate(24 128 120)"><ellipse cx="128" cy="120" rx="3.2" ry="1.5" fill="#6f8f3f" /><ellipse cx="128" cy="120" rx="1.3" ry="0.6" fill="#b8cc88" /></g>
            <g transform="rotate(-32 146 128)"><rect x="141" y="126.5" width="11" height="2.4" rx="1" fill="#c0763a" /></g>
            <g transform="rotate(16 114 117)"><path d="M108,116 Q112,111 118,113 Q123,116 120,120 Q114,123 109,120 Q106,118 108,116 Z" fill="#7c9a5e" /><ellipse cx="114" cy="117" rx="2.6" ry="1.5" fill="#cdd2b4" /></g>

            {/* 炎（手前・鍋底を舐める・短め・グラデーション）*/}
            <path d="M93,175 Q88,165 97,158 Q94,166 102,163 Q100,176 93,175 Z" fill="url(#cwFlame2)" opacity="0.88" />
            <path d="M113,177 Q108,165 118,157 Q114,167 124,163 Q121,178 113,177 Z" fill="url(#cwFlame)" opacity="0.92" />
            <path d="M134,175 Q130,165 140,158 Q136,166 145,163 Q142,176 134,175 Z" fill="url(#cwFlame2)" opacity="0.88" />
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
