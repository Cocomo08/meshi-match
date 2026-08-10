"use client";

import { useEffect, useRef, useState } from "react";
import { recordMatch } from "@/lib/keepsake";

// 食券発行（券売機）＋ ミシン目でちぎる演出。
//  券は2枚組：上部＝本券（縦組みジャンル名・線画地紋・朱印）／下部＝半券（記録）。
//  ちぎると本券は上へ消え、半券が拡大して手元に残る。保存対象は半券のみ。
//  券売機の筐体・ボタン配置・保存の仕組みは維持。

function fmtDate(d) {
  if (!d) return "";
  if (typeof d === "string") return d;
  try {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return String(d);
  }
}

const FILLER = ["ラーメン", "餃子", "カレー", "カツ丼", "生姜焼", "唐揚定食", "肉うどん", "親子丼", "日替り"];
const PRICES = ["¥900", "¥350", "¥800", "¥900", "¥950", "¥900", "¥750", "¥850", "¥850"];
const FALLBACK_INDEX = 4;

function nameFont(len) {
  if (len <= 6) return 13;
  if (len <= 8) return 11.5;
  if (len <= 10) return 10.5;
  return 9.5;
}
// 縦組みジャンル名：高さに収まるよう1列で自動縮小（上部区画の1/2程度を上限）
function vnameFont(len, availH) {
  const per = availH / Math.max(1, len);
  return Math.max(15, Math.min(availH * 0.5, per));
}

// 破れた上端（不規則）＋角丸下端の紙シルエット path（html2canvasでも描けるSVG geometry）
function tornPaperPath(w, h) {
  const n = 22;
  let d = `M0,10`;
  for (let i = 1; i <= n; i++) {
    const x = (w / n) * i;
    const y = 2 + ((i * 41 + 7) % 11); // 2〜12 の擬似不規則（繊維のほつれ）
    d += ` L${x.toFixed(1)},${y}`;
  }
  d += ` L${w},${h - 5} Q${w},${h} ${w - 5},${h} L5,${h} Q0,${h} 0,${h - 5} Z`;
  return d;
}
// 本券の裂けた下端（下向きの不規則な鋸歯）
function tornBottomPath(w, h) {
  const n = 22;
  let d = `M0,0 L${w},0 L${w},${h - 10}`;
  for (let i = n - 1; i >= 0; i--) {
    const x = (w / n) * i;
    const y = h - 2 - ((i * 41 + 7) % 11);
    d += ` L${x.toFixed(1)},${y}`;
  }
  d += ` Z`;
  return d;
}

const STUB_W = 250;
const STUB_H = 166;

const CSS = `
.mt-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  background:#14100b;color:#efe7d3;overflow:auto;padding:18px;
  font-family:var(--font-zen-maru),sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;touch-action:none}

/* ── 券売機本体（木製・木目）── */
.mt-kb{position:relative;display:flex;flex-direction:column;width:300px;max-width:88vw;max-height:94vh;
  border-radius:12px;padding:12px;
  background-color:#6e4a2a;
  background-image:
    repeating-linear-gradient(90deg, rgba(0,0,0,.13) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, rgba(255,224,180,.05) 0 1px, transparent 1px 15px),
    linear-gradient(180deg, #7a5330 0%, #63421f 100%);
  border:2px solid #3f2a15;
  box-shadow:inset 0 2px 0 rgba(255,220,170,.25), inset 0 -3px 0 rgba(0,0,0,.4), 0 8px 0 #2e1f10, 0 16px 26px rgba(0,0,0,.55)}
.mt-head{display:flex;align-items:center;justify-content:center;gap:8px;color:#f3e7cc;font-size:12px;letter-spacing:.3em;font-weight:800;
  padding:2px 2px 9px;border-bottom:2px solid rgba(0,0,0,.35);font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.mt-head::before,.mt-head::after{content:"";width:8px;height:8px;border-radius:50%;background:#e0483b;box-shadow:0 0 6px rgba(224,72,59,.7)}

.mt-panel{position:relative;margin-top:10px;padding:9px;border-radius:7px;
  background:linear-gradient(180deg,#4a331f,#38260f);border:1px solid #241708;
  box-shadow:inset 0 1px 0 rgba(255,220,170,.14), inset 0 -3px 5px rgba(0,0,0,.45)}
.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.mt-lamp{position:absolute;top:13px;left:15px;width:9px;height:9px;border-radius:50%;z-index:3;
  background:radial-gradient(circle at 40% 35%, #b6e0b0, #6fae72 70%);
  box-shadow:0 0 7px rgba(130,200,140,.7), inset 0 -1px 1px rgba(0,0,0,.3)}
.mt-money{display:flex;justify-content:flex-end;align-items:center;gap:11px;margin-top:9px;padding:0 4px}
.mt-coin{width:5px;height:24px;border-radius:3px;background:#241708;box-shadow:inset 0 0 3px #000, 0 1px 0 rgba(255,224,170,.12)}
.mt-bill{width:60px;height:8px;border-radius:3px;background:#241708;box-shadow:inset 0 1px 3px #000, 0 1px 0 rgba(255,224,170,.12)}
.mt-return{display:flex;align-items:center;gap:9px;margin-top:12px}
.mt-return-slot{flex:1;height:16px;border-radius:4px;background:#20140a;box-shadow:inset 0 3px 6px rgba(0,0,0,.7), inset 0 -1px 0 rgba(255,224,170,.08)}
.mt-lever{width:26px;height:16px;border-radius:4px;background:linear-gradient(180deg,#5a4632,#3a2a1a);border:1px solid #241708;box-shadow:inset 0 1px 0 rgba(255,224,170,.18)}
.mt-btn{height:40px;border-radius:4px;background:#efe3c3;color:#4a4636;
  border:1px solid #b0a37d;box-shadow:inset 0 1px 0 #fffdf5, 0 2px 0 #705227;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0 4px}
.mt-btn .lbl{font-size:11px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.mt-btn .prc{font-size:9px;opacity:.7}
.mt-btn.lit{background:#ffd98a;color:#3a2a12;border-color:#e0a94e;box-shadow:inset 0 1px 0 #fff3d0, 0 0 14px rgba(255,190,90,.7), 0 2px 0 #a9772f;transform:translateY(1px)}
.mt-btn.lit .prc{color:#6b4a1c;opacity:1;font-weight:700}

/* ── 受け取り口 ── */
.mt-outlet{position:relative;flex:0 0 auto;height:150px;overflow:hidden;margin-top:10px;border-radius:5px;
  background:linear-gradient(180deg,#241608,#130a03);box-shadow:inset 0 10px 12px -4px rgba(0,0,0,.85)}
.mt-slot{position:absolute;top:30px;left:50%;transform:translateX(-50%);width:104px;height:24px;z-index:6;border-radius:3px;
  background:linear-gradient(180deg,#1a1008 0%, #050302 55%, #0c0704 100%);
  box-shadow:inset 0 3px 6px rgba(0,0,0,.95), inset 0 9px 7px -6px rgba(0,0,0,.9), 0 -1px 0 rgba(255,224,170,.28), 0 6px 7px rgba(0,0,0,.6)}
.mt-slot::before{content:"";position:absolute;left:-3px;right:-3px;top:-3px;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(180deg,rgba(255,228,182,.32),rgba(120,90,50,.18))}
/* 口の内側（クリップ領域）：券はこの中を上から下へ動く。口の枠(z6)より奥(z3)。
   幅は口の開口より狭く（券幅 < 口幅）、上端(=口の上端)より上は完全に隠す */
.mt-slotclip{position:absolute;top:30px;left:50%;transform:translateX(-50%);width:94px;height:120px;overflow:hidden;z-index:3;border-radius:0 0 4px 4px}
/* 口の縁が券へ落とす影（枠の下端から下へ・約5px）*/
.mt-slotclip::after{content:"";position:absolute;left:0;right:0;top:24px;height:6px;z-index:5;pointer-events:none;
  background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.2) 60%,transparent)}
.mt-small-pos{position:absolute;top:9px;left:50%;margin-left:-42.5px;width:85px;will-change:transform}
.mt-small-sway{transform-origin:50% 0}
.mt-small{width:85px;height:86px;overflow:hidden;position:relative;transform-origin:50% 0;
  transform:perspective(340px) rotateX(-6deg) rotate(1.4deg);filter:drop-shadow(0 10px 9px rgba(0,0,0,.6))}
.mt-small-inner{width:250px;transform:scale(.34);transform-origin:top left}
.mt-small-pos.grab{cursor:grab}.mt-small-pos.grabbing{cursor:grabbing}
.mt-pull-hint{position:absolute;left:0;right:0;top:126px;text-align:center;z-index:4;pointer-events:none;font-size:11px;letter-spacing:.1em;color:#dcc9a5;opacity:.8;font-family:var(--font-zen-maru),sans-serif}

/* ── 手元（拡大）── */
.mt-dim{position:fixed;inset:0;z-index:70;background:rgba(6,4,2,.74);animation:mtFade .4s ease both}
.mt-hand{position:fixed;left:50%;top:44%;z-index:71;transform:translate(-50%,-50%);will-change:transform}
.mt-hand-grow{animation:mtToHand .5s cubic-bezier(.2,.7,.3,1) both}

/* ── 券（生成りの紙）：本券＋ミシン目＋半券 ── */
.tf{position:relative;width:250px;min-height:252px;display:flex;flex-direction:column;color:#2a2520;
  border-radius:4px 7px 5px 6px;overflow:hidden;background-color:#efe3c3;
  /* 繊維のムラ主体・地紋はごく薄く（不透明度3%以下）*/
  background-image:
    radial-gradient(circle at 18% 10%, rgba(150,120,40,.06), transparent 10%),
    radial-gradient(circle at 76% 18%, rgba(160,130,50,.05), transparent 9%),
    radial-gradient(circle at 40% 44%, rgba(150,120,40,.045), transparent 11%),
    radial-gradient(circle at 84% 70%, rgba(140,110,40,.05), transparent 9%),
    radial-gradient(circle at 20% 82%, rgba(160,130,50,.045), transparent 10%),
    repeating-linear-gradient(94deg, rgba(90,70,30,.02) 0 1px, transparent 1px 13px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px rgba(120,95,40,.13), 0 10px 16px -6px rgba(0,0,0,.55)}
.tf-frame{position:absolute;inset:5px;border:1px solid rgba(120,95,40,.32);border-radius:3px;pointer-events:none;z-index:1}

/* 本券（上部・約65%）*/
.tf-main{position:relative;flex:1 1 auto;min-height:152px;overflow:hidden}
/* 線画地紋：大きく薄く・右下へ寄せてはみ出す */
.tf-artbg{position:absolute;right:-42px;bottom:-30px;width:196px;height:150px;opacity:.08;z-index:0;pointer-events:none}
.tf-artbg svg{width:100% !important;height:100% !important;display:block}
/* 縦組みジャンル名 */
.tf-vname{position:absolute;top:0;bottom:0;left:0;right:0;z-index:2;display:flex;align-items:center;justify-content:center;padding:14px 0}
.tf-vname span{writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;line-height:1.05;letter-spacing:.02em;
  font-weight:800;color:#221f18;font-family:var(--font-klee),var(--font-zen-maru),sans-serif;-webkit-text-stroke:.4px #221f18}
/* 朱印（大・縦名に重ねる・透かす・かすれ）*/
.tf-seal{position:absolute;right:12px;bottom:12px;width:78px;height:78px;z-index:3;
  display:flex;align-items:center;justify-content:center;transform:rotate(-8deg);
  color:#b5533a;opacity:.46;border:3px solid #b5533a;border-radius:47% 53% 46% 54% / 53% 46% 55% 47%;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-weight:800;font-size:34px;letter-spacing:.02em;
  -webkit-mask-image:radial-gradient(ellipse at 62% 38%, #000 52%, rgba(0,0,0,.35) 78%, rgba(0,0,0,.15) 100%);
  mask-image:radial-gradient(ellipse at 62% 38%, #000 52%, rgba(0,0,0,.35) 78%, rgba(0,0,0,.15) 100%)}

/* ミシン目（点線＋両端の半円切り込み）。ちぎる前は紙が連続して見えるよう紙地を敷く */
.tf-perf2{position:relative;flex:0 0 auto;height:14px;z-index:2;background:#efe3c3}
.tf-perf2::after{content:"";position:absolute;left:14px;right:14px;top:50%;border-top:2px dashed #b0a483;transition:border-color .15s ease}
.tf-perf2.hot::after{border-top-color:#5c4a2a}
.tf-notch{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#17100a;transform:translateY(-50%);z-index:3}
.tf-notch.l{left:-6px}.tf-notch.r{right:-6px}

/* 半券（下部・約35%）*/
.tf-stub{position:relative;flex:0 0 auto;min-height:86px;padding:8px 14px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;z-index:2}
.tf-stub-top{display:flex;align-items:center;justify-content:space-between;width:100%;color:#6b5f42;font-size:9.5px;letter-spacing:.12em;font-weight:800;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-sgenre{font-weight:800;color:#2a2520;font-size:13px;letter-spacing:.05em;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-names{color:#2a2520;letter-spacing:.03em;font-weight:600;white-space:nowrap;overflow:hidden;max-width:100%}
.tf-names .sep{opacity:.45;margin:0 .4em;font-weight:400}
.tf-stat{display:flex;align-items:baseline;justify-content:center;gap:14px;font-size:10.5px;color:#2a2520;letter-spacing:.02em}
.tf-hit{color:#2a2520;font-weight:400}.tf-hit b{font-weight:400;font-size:1.3em}
.tf-ord{color:#2a2520;font-weight:400}
.tf-ord b{color:#a83a1c;font-weight:800;font-size:1.35em;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-ord.first{color:#a83a1c;font-weight:800;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-date{font-size:8.5px;color:#a49a80;letter-spacing:.04em}

/* ── ちぎる（手元・本券/半券を分離）── */
.mt-tear{position:relative;width:250px;touch-action:none;cursor:grab}
.mt-tear.grabbing{cursor:grabbing}
.mt-tear .seg{position:relative;overflow:hidden;background-color:#efe3c3}
.mt-tear .seg-main{border-radius:4px 7px 0 0}
.mt-tear .seg-stub{border-radius:0 0 5px 6px;will-change:transform}
/* 裂け目に現れる不規則な断面（opacityで出現）*/
.tear-edge{position:absolute;left:0;width:100%;height:12px;z-index:4;pointer-events:none}
.tear-edge svg{width:100%;height:100%;display:block}
.edge-main{bottom:-1px}
.edge-stub{top:-1px}

/* 切り離し後：本券は上へ回転して消える／半券は拡大 */
.mt-bun-fly{position:fixed;left:50%;top:44%;z-index:71;transform:translate(-50%,-50%);animation:mtBunFly .55s cubic-bezier(.4,0,.7,1) both;pointer-events:none}
.mt-stub-hand{position:fixed;left:50%;top:44%;z-index:72;transform:translate(-50%,-50%);animation:mtStubGrow .5s cubic-bezier(.2,.7,.3,1) both}

/* 半券（単体・破れた上端）*/
.mt-stub{position:relative;width:${STUB_W}px;height:${STUB_H}px;filter:drop-shadow(0 10px 16px rgba(0,0,0,.55))}
.mt-stub-paper{position:absolute;inset:0;z-index:0}
.mt-stub-paper svg{width:100%;height:100%;display:block}
.mt-stub-inner{position:relative;z-index:1;height:100%;padding:26px 16px 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}
.mt-stub-mura{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.9;
  background-image:radial-gradient(circle at 22% 40%, rgba(150,120,40,.05), transparent 10%),radial-gradient(circle at 78% 66%, rgba(150,120,40,.045), transparent 9%)}

/* 保存用（画面外・正方形・半券のみ）*/
.mt-export{position:fixed;left:-9999px;top:0;width:360px;height:360px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(120% 90% at 50% 20%, #3a2a1b, #201509)}

/* 導線 */
.mt-actions{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:73;
  display:flex;flex-direction:column;align-items:center;gap:9px;width:100%;max-width:300px;padding:0 16px;animation:mtFade .35s ease .2s both}
.mt-cta{width:100%;background:#efe3c3;color:#2a2520;border:1px solid #b0a37d;border-radius:6px;padding:12px 20px;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-size:15px;font-weight:900;letter-spacing:.08em;cursor:pointer;box-shadow:inset 0 1px 0 #fffdf5, 0 4px 0 #a9772f}
.mt-cta:active{transform:translateY(3px);box-shadow:inset 0 1px 0 #fffdf5,0 1px 0 #a9772f}
.mt-save{width:100%;background:#3a2614;color:#f0e6d2;border:1px solid #1f1408;border-radius:6px;padding:11px 20px;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-size:14px;font-weight:800;letter-spacing:.06em;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,220,170,.22), 0 4px 0 #140d05}
.mt-save:active{transform:translateY(3px);box-shadow:inset 0 1px 0 rgba(255,220,170,.22),0 1px 0 #140d05}
.mt-note{font-size:11px;color:#e6d9bd;opacity:.9;text-align:center;letter-spacing:.03em;max-width:280px}
.mt-preview{display:flex;flex-direction:column;align-items:center;gap:6px}
.mt-preview img{width:190px;max-width:66vw;border-radius:6px;box-shadow:0 8px 18px rgba(0,0,0,.5)}
.mt-preview span{font-size:11px;color:#e6d9bd;opacity:.85}
/* ちぎる案内 */
.mt-tear-hint{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:73;font-size:12px;letter-spacing:.06em;color:#e6d9bd;opacity:.85;font-family:var(--font-zen-maru),sans-serif;text-align:center;padding:0 16px}

/* ── アニメーション ── */
.mt-dispense .mt-btn.lit{animation:mtPress .2s ease .2s both}
.mt-dispense .mt-small-pos{animation:mtEject .6s .35s both}
.mt-dispense .mt-small{animation:mtCurl .6s .35s both}
.mt-await .mt-small-sway{animation:mtSway 2.6s ease-in-out infinite}
.mt-await .mt-small-pos.nudge{animation:mtNudge 1.4s ease-in-out infinite}
@keyframes mtPress{0%{transform:translateY(0)}55%{transform:translateY(3px)}100%{transform:translateY(1px)}}
@keyframes mtEject{0%{transform:translateY(-118%);animation-timing-function:cubic-bezier(.2,.72,.3,1)}46%{transform:translateY(-40%)}63%{transform:translateY(-40%)}100%{transform:translateY(0);animation-timing-function:cubic-bezier(.55,.06,.62,1)}}
@keyframes mtCurl{from{transform:perspective(340px) rotateX(-15deg) rotate(1.4deg)}to{transform:perspective(340px) rotateX(-6deg) rotate(1.4deg)}}
@keyframes mtSway{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes mtNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
@keyframes mtToHand{0%{transform:translateY(-70px) scale(.34);opacity:.5}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes mtBunFly{0%{transform:translate(-50%,-50%) translateY(-40px) rotate(0);opacity:1}100%{transform:translate(-50%,-50%) translateY(-260px) rotate(-9deg);opacity:0}}
@keyframes mtStubGrow{0%{transform:translate(-50%,-50%) translateY(40px) scale(.72);opacity:.4}100%{transform:translate(-50%,-50%) translateY(0) scale(1);opacity:1}}
@keyframes mtFade{from{opacity:0}to{opacity:1}}

@media (prefers-reduced-motion: reduce){
  .mt-dispense .mt-btn.lit{animation:none}
  .mt-dispense .mt-small-pos{animation:mtFade .4s ease both}
  .mt-dispense .mt-small{animation:none;transform:none}
  .mt-await .mt-small-sway{animation:none}
  .mt-await .mt-small-pos.nudge{animation:none}
  .mt-small{transform:none}
  .mt-hand-grow{animation:mtFade .35s ease both}
  .mt-bun-fly{animation:mtFade .3s ease both reverse}
  .mt-stub-hand{animation:mtFade .3s ease both}
  .tf-perf2::after{transition:none}
  .mt-tear .seg-stub{transition:none !important}
}
`;

// 半券の記録内容（本券下部・単体半券で共有）
function StubContent({ genre, name0, name1, hit, totalCount, ordinal, showOrd }) {
  const nlen = Math.max((name0 || "").length, (name1 || "").length);
  return (
    <>
      <div className="tf-stub-top"><span>半券</span><span>MESHI-MACHI</span></div>
      <div className="tf-sgenre">{genre}</div>
      <div className="tf-names" style={{ fontSize: nameFont(nlen) }}>
        {name0}<span className="sep">×</span>{name1}
      </div>
      <div className="tf-stat">
        <span className="tf-hit">一致 <b>{hit}</b> / {totalCount}</span>
        {showOrd && (
          ordinal >= 2
            ? <span className="tf-ord">二人の <b>{ordinal}</b> 杯目</span>
            : <span className="tf-ord first">はじめての一杯</span>
        )}
      </div>
    </>
  );
}

// 本券（縦組みジャンル名・線画地紋・朱印）
function BunFace({ genre, art }) {
  const g = genre || "";
  const vf = vnameFont(g.length, 132);
  return (
    <div className="tf-main">
      <div className="tf-artbg" aria-hidden>{art}</div>
      <div className="tf-vname"><span style={{ fontSize: vf }}>{g}</span></div>
      <span className="tf-seal" aria-hidden>承</span>
    </div>
  );
}

// 券（本券＋ミシン目＋半券）。ちぎる前の1枚。機内スロット表示・手元表示で使用。
function TicketFace({ genre, art, name0, name1, date, matchCount, totalCount, ordinal }) {
  const hit = Number.isFinite(matchCount) ? matchCount : 0;
  const showOrd = ordinal != null && ordinal > 0;
  return (
    <div className="tf">
      <div className="tf-frame" aria-hidden />
      <BunFace genre={genre} art={art} />
      <div className="tf-perf2" aria-hidden>
        <span className="tf-notch l" /><span className="tf-notch r" />
      </div>
      <div className="tf-stub">
        <StubContent genre={genre} name0={name0} name1={name1} hit={hit} totalCount={totalCount} ordinal={ordinal} showOrd={showOrd} />
        {date && <div className="tf-date">発行 {date}</div>}
      </div>
    </div>
  );
}

// 半券（単体・破れた上端）。ちぎった後の手元＆保存用。色の強調は杯数のみ。
function StubFace({ genre, name0, name1, date, matchCount, totalCount, ordinal }) {
  const hit = Number.isFinite(matchCount) ? matchCount : 0;
  const showOrd = ordinal != null && ordinal > 0;
  return (
    <div className="mt-stub">
      <div className="mt-stub-paper" aria-hidden>
        <svg viewBox={`0 0 ${STUB_W} ${STUB_H}`} preserveAspectRatio="none">
          <path d={tornPaperPath(STUB_W, STUB_H)} fill="#efe3c3" />
        </svg>
      </div>
      <div className="mt-stub-mura" aria-hidden />
      <div className="mt-stub-inner">
        <StubContent genre={genre} name0={name0} name1={name1} hit={hit} totalCount={totalCount} ordinal={ordinal} showOrd={showOrd} />
        {date && <div className="tf-date">発行 {date}</div>}
      </div>
    </div>
  );
}

export default function MealTicket({
  genre,
  art,
  ticketNo,
  issuedAt,
  nicknames = [],
  matchCount = 0,
  totalCount = 12,
  onNext,
  ctaLabel = "お店をさがす",
}) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handKey = `mt-hand-${ticketNo}`;
  const resumedHand =
    typeof window !== "undefined" && (() => { try { return sessionStorage.getItem(handKey) === "1"; } catch { return false; } })();
  const [stage, setStage] = useState(resumedHand ? "hand" : "dispense"); // dispense | await | pulling | hand
  const [dragY, setDragY] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [ordinal, setOrdinal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [note, setNote] = useState("");
  // ちぎる：armed（ミシン目予告）／tearAmt（0..1）／torn（切り離し完了）
  const [armed, setArmed] = useState(false);
  const [tearAmt, setTearAmt] = useState(0);
  const [torn, setTorn] = useState(false);

  const startRef = useRef(0);
  const movedRef = useRef(0);
  const draggingRef = useRef(false);
  const idleRef = useRef(null);
  const exportRef = useRef(null);
  const tearStartRef = useRef(0);
  const tearArmRef = useRef(false);
  const pressTimerRef = useRef(null);
  const autoTimerRef = useRef(null);

  const SMALL_H = 86;
  const PULL_THRESHOLD = SMALL_H * 0.6;
  const TEAR_DIST = 100; // 券高の約40%

  useEffect(() => {
    if (stage !== "dispense") return;
    const t = setTimeout(() => setStage("await"), reduced ? 450 : 1000);
    return () => clearTimeout(t);
  }, [stage, reduced]);

  const armIdle = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    setNudge(false);
    idleRef.current = setTimeout(() => setNudge(true), 3500);
  };
  useEffect(() => {
    if (stage === "await") armIdle();
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    if (stage === "hand") { try { sessionStorage.setItem(handKey, "1"); } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => () => {
    clearTimeout(pressTimerRef.current);
    clearTimeout(autoTimerRef.current);
  }, []);

  const no = typeof ticketNo === "number" ? "No." + String(ticketNo).padStart(7, "0") : ticketNo || "";
  const date = fmtDate(issuedAt);
  const name0 = (nicknames[0] || "").trim() || "なまえ未設定";
  const name1 = (nicknames[1] || "").trim() || "なまえ未設定";

  useEffect(() => {
    const n = recordMatch({
      a: name0, b: name1, ticketNo, matchCount,
      genres: [genre].filter(Boolean),
      at: typeof issuedAt === "number" ? issuedAt : Date.now(),
    });
    setOrdinal(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNo]);

  const found = FILLER.indexOf(genre);
  const activeIdx = found >= 0 ? found : FALLBACK_INDEX;
  const cells = FILLER.map((label, i) => {
    if (i === activeIdx) return { label: found >= 0 ? label : genre, active: true };
    return { label, price: PRICES[i], active: false };
  });

  const faceProps = { genre, art, name0, name1, date, matchCount, totalCount, ordinal };
  const stubProps = { genre, name0, name1, date, matchCount, totalCount, ordinal };

  // ── 引き抜き（スロット→手元）──
  const completePull = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    draggingRef.current = false;
    setNudge(false);
    setDragY(0);
    setStage("hand");
  };
  const onPullDown = (e) => {
    if (stage !== "await" && stage !== "pulling") return;
    if (idleRef.current) clearTimeout(idleRef.current);
    setNudge(false);
    if (reduced) { completePull(); return; }
    startRef.current = e.clientY;
    movedRef.current = 0;
    draggingRef.current = true;
    setStage("pulling");
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onPullMove = (e) => {
    if (!draggingRef.current) return;
    const dy = Math.min(Math.max(0, e.clientY - startRef.current), 240);
    movedRef.current = Math.max(movedRef.current, dy);
    setDragY(dy);
    if (dy >= PULL_THRESHOLD) completePull();
  };
  const onPullUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.stopPropagation();
    if (dragY >= PULL_THRESHOLD || movedRef.current < 6) completePull();
    else { setDragY(0); setStage("await"); }
  };

  // ── ちぎる（手元）──
  const completeTear = () => {
    clearTimeout(pressTimerRef.current);
    clearTimeout(autoTimerRef.current);
    tearArmRef.current = false;
    setArmed(false);
    setTearAmt(1);
    setTorn(true);
  };
  const cancelTear = () => {
    clearTimeout(pressTimerRef.current);
    clearTimeout(autoTimerRef.current);
    tearArmRef.current = false;
    setArmed(false);
    setTearAmt(0);
  };
  const onTearDown = (e) => {
    if (torn) return;
    tearStartRef.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // 長押し0.4sで「ミシン目の予告」→ 以降ドラッグで裂ける。長押しのみでも1.2sで完了
    pressTimerRef.current = setTimeout(() => {
      if (reduced) { completeTear(); return; }
      tearArmRef.current = true;
      setArmed(true);
      autoTimerRef.current = setTimeout(() => completeTear(), 800);
    }, 400);
  };
  const onTearMove = (e) => {
    const dy = e.clientY - tearStartRef.current;
    if (!tearArmRef.current) {
      if (Math.abs(dy) > 12) cancelTear(); // 予告前に大きく動いたら長押し不成立（スクロール等と競合させない）
      return;
    }
    const amt = Math.min(Math.max(dy, 0) / TEAR_DIST, 1);
    setTearAmt(amt);
    if (amt >= 1) completeTear();
  };
  const onTearUp = () => {
    if (torn) return;
    clearTimeout(pressTimerRef.current);
    if (tearArmRef.current) cancelTear(); // 裂け始めて放したら元に戻す
  };

  const goNext = () => onNext?.();

  const saveTicket = async (e) => {
    e?.stopPropagation?.();
    if (!torn) { setNote("ちぎってから保存できます"); return; }
    if (saving) return;
    setSaving(true);
    setNote("書き出し中…");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(exportRef.current, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const url = canvas.toDataURL("image/png");
      setImgSrc(url);
      let downloaded = false;
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `meshi-match-${(no || "ticket").replace(/[^\w.-]/g, "")}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        downloaded = true;
      } catch { downloaded = false; }
      setNote(downloaded ? "保存しました。できない場合は下の画像を長押しで保存できます" : "下の画像を長押しで保存できます");
    } catch (err) {
      setNote("保存に失敗しました。少し待って、もう一度お試しください");
    } finally {
      setSaving(false);
    }
  };

  const inSlot = stage === "dispense" || stage === "await" || stage === "pulling";
  const posStyle =
    stage === "pulling"
      ? { transform: `translateY(${dragY}px)`, transition: "none" }
      : stage === "await"
        ? { transform: `translateY(${dragY}px)`, transition: "transform .3s cubic-bezier(.2,.7,.3,1)" }
        : undefined;

  // ちぎり中：半券を指方向（下）へ引き、断面を出す
  const stubTearStyle = {
    transform: `translateY(${tearAmt * 40}px)`,
    transition: armed ? "none" : "transform .3s cubic-bezier(.2,.7,.3,1)",
  };

  return (
    <div className={`mt-root mt-${stage}`} role="dialog" aria-label={`思い出の食券：${genre}`}>
      <style>{CSS}</style>

      <div className="mt-kb">
        <span className="mt-lamp" aria-hidden />
        <div className="mt-head"><span>めしまち券売機</span></div>
        <div className="mt-panel">
          <div className="mt-grid" aria-hidden>
            {cells.map((c, i) => (
              <div key={i} className={`mt-btn ${c.active ? "lit" : ""}`}>
                <span className="lbl">{c.label}</span>
                <span className="prc">{c.active ? "本日のマッチ" : c.price}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-money" aria-hidden><span className="mt-coin" /><span className="mt-bill" /></div>

        <div className="mt-outlet">
          {/* 口の内側でクリップ（券は枠より奥・口幅を超えない）*/}
          {inSlot && (
            <div className="mt-slotclip" aria-hidden={false}>
              <div
                className={`mt-small-pos ${stage !== "dispense" ? "grab" : ""} ${nudge ? "nudge" : ""} ${stage === "pulling" ? "grabbing" : ""}`}
                style={posStyle}
                onPointerDown={onPullDown} onPointerMove={onPullMove} onPointerUp={onPullUp} onPointerCancel={onPullUp}
              >
                <div className="mt-small-sway">
                  <div className="mt-small"><div className="mt-small-inner"><TicketFace {...faceProps} /></div></div>
                </div>
              </div>
            </div>
          )}
          {/* 受け取り口の枠（黒）は券より手前 */}
          <div className="mt-slot" aria-hidden />
          {(stage === "await" || stage === "pulling") && <div className="mt-pull-hint">引き抜いてください</div>}
        </div>

        <div className="mt-return" aria-hidden><div className="mt-return-slot" /><div className="mt-lever" /></div>
      </div>

      {/* 手元：ちぎる前は1枚の券、ちぎると本券が消え半券が残る */}
      {stage === "hand" && (
        <>
          <div className="mt-dim" aria-hidden />

          {!torn ? (
            <div className="mt-hand">
              <div className="mt-hand-grow">
                <div
                  className={`mt-tear ${armed ? "grabbing" : ""}`}
                  onPointerDown={onTearDown} onPointerMove={onTearMove} onPointerUp={onTearUp} onPointerCancel={onTearUp}
                >
                  {/* 本券 */}
                  <div className="seg seg-main">
                    <BunFace genre={genre} art={art} />
                    <div className="tear-edge edge-main" style={{ opacity: tearAmt }} aria-hidden>
                      <svg viewBox={`0 0 ${STUB_W} 12`} preserveAspectRatio="none"><path d={tornBottomPath(STUB_W, 12)} fill="#efe3c3" /></svg>
                    </div>
                  </div>
                  {/* ミシン目（裂けるほど薄く）*/}
                  <div className={`tf-perf2 ${armed ? "hot" : ""}`} style={{ opacity: 1 - tearAmt }} aria-hidden>
                    <span className="tf-notch l" /><span className="tf-notch r" />
                  </div>
                  {/* 半券（指方向へ引かれる）*/}
                  <div className="seg seg-stub" style={stubTearStyle}>
                    <div className="tear-edge edge-stub" style={{ opacity: tearAmt }} aria-hidden>
                      <svg viewBox={`0 0 ${STUB_W} 12`} preserveAspectRatio="none"><path d={tornPaperPath(STUB_W, 12)} fill="#efe3c3" /></svg>
                    </div>
                    <div className="tf-stub">
                      <StubContent genre={genre} name0={name0} name1={name1} hit={Number.isFinite(matchCount) ? matchCount : 0} totalCount={totalCount} ordinal={ordinal} showOrd={ordinal > 0} />
                      {date && <div className="tf-date">発行 {date}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-bun-fly" aria-hidden><div className="tf" style={{ minHeight: 0 }}><BunFace genre={genre} art={art} /></div></div>
              <div className="mt-stub-hand"><StubFace {...stubProps} /></div>
            </>
          )}

          {/* ちぎる案内は切り離す前だけ表示 */}
          {!torn && <div className="mt-tear-hint">長押ししてから下へ引くと、ミシン目でちぎれます</div>}

          {/* 導線：保存はちぎった後のみ有効（前に押すと案内を出す）*/}
          <div className="mt-actions">
            <button className="mt-save" onClick={saveTicket} disabled={saving}>
              {saving ? "書き出し中…" : "この半券を保存"}
            </button>
            {note && <div className="mt-note">{note}</div>}
            {imgSrc && (
              <div className="mt-preview">
                <img src={imgSrc} alt="思い出の半券" />
                <span>長押しで保存できます</span>
              </div>
            )}
            <button className="mt-cta" onClick={goNext}>{ctaLabel} ↓</button>
          </div>
        </>
      )}

      {/* 保存用（画面外・半券のみ）*/}
      <div className="mt-export" ref={exportRef} aria-hidden>
        <StubFace {...stubProps} />
      </div>
    </div>
  );
}
