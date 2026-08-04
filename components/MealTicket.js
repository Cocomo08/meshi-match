"use client";

import { useEffect, useRef, useState } from "react";

// 食券発行アニメーション（券売機・1ファイル自己完結・標準CSSのみ・外部画像なし）
//
// 立体感はベベル（枠色の明暗）とフラットな面だけで表現する。
// グラデーション／ドロップシャドウ／ぼかし／光彩は使わない。
//
// タイムライン（合計1.5s・厳守）
//  0.0-0.3s  確定ジャンルのボタンだけ点灯
//  0.3-0.5s  ボタンが押し込まれる（沈む）
//  0.5-0.9s  取り出し口から食券がせり出す（減速）
//  0.9-1.4s  口から65%出た位置で小さく揺れて静止
//  1.4s-     券面フェードイン＋「引き抜く」表示
// 完成後：券を上に80px以上ドラッグ（またはCTA）で引き抜く → onNext
//
// props（券面はハードコードしない）
//  genre / ticketNo / issuedAt / nicknames / onNext / ctaLabel
//  genres : 券売機に並べるジャンル名の配列（無ければ既定の12種）

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

const DEFAULT_GENRES = ["寿司", "ラーメン", "うどん・そば", "定食", "丼もの", "ハンバーグ", "パスタ", "ピザ", "カレー", "餃子・中華", "焼肉", "唐揚げ"];

// ミシン目：直径4pxの半円の切り欠きを8px間隔（viewBox 252x5 上に配置）
const NOTCH_X = [];
for (let x = 8; x <= 244; x += 8) NOTCH_X.push(x);

const CSS = `
.mt-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  background:#211d1a;color:#efe7d3;overflow:hidden;padding:20px;perspective:1000px;
  font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,"Courier New",monospace;
  -webkit-tap-highlight-color:transparent;user-select:none;touch-action:none}
.mt-root *{box-sizing:border-box}

/* ── 本体：白樹脂パネルの券売機（角は控えめ・箱っぽく）── */
.mt-kb{position:relative;display:flex;flex-direction:column;width:300px;max-width:86vw;height:min(68vh,510px);
  background:#20242c;border:1px solid #0d0e12;border-radius:10px;padding:11px}
/* ボタンパネル：明るい樹脂トレー（実機の白いボタン面）*/
.mt-screen{position:relative;flex:0 0 auto;background:#cdcabf;border-radius:5px;padding:10px 9px;
  border-top:1px solid #e9e6dc;border-left:1px solid #dedbd0;border-right:1px solid #97948b;border-bottom:1px solid #8a877e;
  box-shadow:inset 0 2px 4px rgba(0,0,0,.28)}
.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
/* メニューボタン：印字ラベル＋下部の暗いインジケータ窓。立体感はベベルで */
.mt-tile{position:relative;height:54px;border-radius:3px;background:#f3f0e7;color:#2a2520;
  border:1px solid;border-color:#ffffff #b6b0a0 #a39d8d #ffffff;
  box-shadow:inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,.4);
  display:flex;align-items:flex-start;justify-content:center;padding:8px 4px 0;
  text-align:center;font-size:12px;font-weight:800;line-height:1.1}
.mt-tile span{max-width:100%;overflow:hidden;text-overflow:ellipsis;display:block}
/* 下部インジケータ窓（消灯＝暗い）*/
.mt-tile::after{content:"";position:absolute;left:4px;right:4px;bottom:4px;height:12px;border-radius:2px;
  background:#15171d;box-shadow:inset 0 1px 2px rgba(0,0,0,.85)}
/* 非選択（消灯・物理ボタンのまま）*/
.mt-tile.dim{background:#eceadf;color:#6a6458}
/* 選択：青のバックライト点灯（縁とインジケータが光る）*/
.mt-tile.lit{background:#eef7ff;color:#123;border-color:#e3f2ff #4aa0e0 #2f7fc0 #e3f2ff;
  box-shadow:0 0 15px 3px rgba(70,160,255,.8), inset 0 0 10px rgba(120,190,255,.45), 0 1px 2px rgba(0,0,0,.3)}
.mt-tile.lit::after{background:#39a2ff;
  box-shadow:0 0 10px 2px rgba(70,160,255,.95), inset 0 0 4px rgba(255,255,255,.7)}

/* 取り出し口エリア */
.mt-outlet-space{height:118px;flex:0 0 auto}
/* 券の下側を隠す前面（本体色）*/
.mt-below{position:absolute;left:0;right:0;bottom:0;height:104px;background:#20242c;z-index:3;
  border-top:1px solid #2b2f37;border-bottom-left-radius:9px;border-bottom-right-radius:9px}
.mt-below::before{content:"";position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:252px;max-width:calc(86vw - 30px);height:3px;background:#08090c}
/* モダンな排出スロット（黒い横長スリット）*/
.mt-slot{position:absolute;left:50%;top:-8px;transform:translateX(-50%);width:268px;max-width:calc(86vw - 14px);height:16px;
  background:#08090c;border-radius:7px;box-shadow:inset 0 0 0 1px #2b2f37, inset 0 3px 5px rgba(0,0,0,.7)}
.mt-tray{position:absolute;left:22px;right:22px;bottom:16px;height:28px;background:#12141a;border-radius:7px;box-shadow:inset 0 0 0 1px #2b2f37}

/* ── 食券（感熱紙・生成り色・等幅・横長 3:2）── */
.mt-ticket{position:absolute;left:50%;bottom:45px;width:252px;max-width:calc(86vw - 30px);height:168px;
  transform:translateX(-50%);transform-origin:50% 100%;z-index:2;background:#efe7d3;color:#2a2520;
  border:1px solid #b8ac8c;overflow:hidden;font-weight:700}
.mt-ticket.grab{cursor:grab}.mt-ticket.grabbing{cursor:grabbing}
/* 券の上端に落ちる口の影（フラットな帯）*/
.mt-ticket::after{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:rgba(0,0,0,.16);z-index:3}
/* 地紋（薄いストライプ・3度傾け・8%） */
.mt-jimon{position:absolute;left:-10%;top:-10%;width:120%;height:120%;opacity:.08;z-index:0;pointer-events:none}
/* 太めの二重罫線の囲み */
.mt-frame{position:absolute;inset:5px;border:5px double #2a2520;z-index:1;display:flex;flex-direction:column;padding:7px 9px 0}
.mt-top{display:flex;align-items:baseline;justify-content:space-between;font-size:9px;letter-spacing:.16em;color:#4a443a}
.mt-no{font-size:11px;letter-spacing:.06em;color:#2a2520}
.mt-genre{text-align:center;font-size:27px;line-height:1.05;font-weight:800;letter-spacing:.03em;margin:3px 0 4px}
.mt-amount{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:5px}
.mt-amount .lb{font-size:9px;letter-spacing:.14em;border:1px solid #2a2520;padding:1px 5px}
.mt-amount .yen{font-size:19px;font-weight:800;letter-spacing:.04em}
.mt-perf2{position:relative;z-index:1;width:100%;height:5px;margin-top:auto;display:block}
.mt-stub2{position:relative;z-index:1;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.mt-names{font-size:12px;letter-spacing:.06em}
.mt-date{font-size:9px;color:#4a443a;letter-spacing:.05em}

/* 「引き抜く」表示（券の上・縁より手前）*/
.mt-pull{position:absolute;left:0;right:0;bottom:216px;text-align:center;font-size:12px;letter-spacing:.18em;color:#d7c7a3;z-index:4;pointer-events:none}
.mt-pull .ar{display:block;font-size:16px;animation:mtBob 1s ease-in-out infinite}
@keyframes mtBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

.mt-cta{flex:0 0 auto;background:#e7dcbf;color:#23231f;border-radius:5px;padding:12px 30px;
  font-family:inherit;font-size:14px;font-weight:800;letter-spacing:.08em;cursor:pointer;
  border-width:2px;border-style:solid;border-color:#fff6db #b7ab84 #b7ab84 #fff6db}
.mt-cta:active{transform:translateY(2px);border-color:#b7ab84 #fff6db #fff6db #b7ab84}
.mt-skip{font-size:11px;letter-spacing:.2em;color:#565c66}

/* ── アニメーション（.anim のときだけ。base=最終状態）── */
.mt-root.anim .mt-tile.lit{animation:mtLitOn .3s steps(1,end) .1s both, mtTap .22s ease .4s both}
.mt-root.anim .mt-ticket{animation:mtEmerge .9s .5s both}
.mt-root.anim .mt-body,.mt-root.anim .mt-pull{animation:mtFade .35s ease 1.4s both}

/* 選択ボタンが消灯→青バックライト点灯（軽く2回またたく）*/
@keyframes mtLitOn{
  0%{background:#eceadf;color:#6a6458;border-color:#ffffff #b6b0a0 #a39d8d #ffffff;box-shadow:inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,.4)}
  30%{background:#eef7ff;border-color:#e3f2ff #4aa0e0 #2f7fc0 #e3f2ff;box-shadow:0 0 15px 3px rgba(70,160,255,.8), inset 0 0 10px rgba(120,190,255,.45)}
  45%{background:#eceadf;box-shadow:inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,.4)}
  100%{background:#eef7ff;color:#123;border-color:#e3f2ff #4aa0e0 #2f7fc0 #e3f2ff;box-shadow:0 0 15px 3px rgba(70,160,255,.8), inset 0 0 10px rgba(120,190,255,.45), 0 1px 2px rgba(0,0,0,.3)}}
@keyframes mtTap{0%{transform:scale(1)}50%{transform:scale(.94)}100%{transform:scale(1)}}
@keyframes mtEmerge{
  0%{transform:translate(-50%,120px);animation-timing-function:cubic-bezier(.15,.75,.3,1)}
  44%{transform:translate(-50%,-6px);animation-timing-function:ease-in-out}
  60%{transform:translate(-50%,4px) rotate(1.1deg)}
  74%{transform:translate(-50%,-2px) rotate(-.8deg)}
  86%{transform:translate(-50%,2px) rotate(.4deg)}
  100%{transform:translate(-50%,0) rotate(0)}
}
@keyframes mtFade{from{opacity:0}to{opacity:1}}

@media (prefers-reduced-motion: reduce){
  .mt-root.anim .mt-screen,.mt-root.anim .mt-tile.lit,.mt-root.anim .mt-ticket,.mt-root.anim .mt-body,.mt-root.anim .mt-pull{animation:none}
  .mt-pull .ar{animation:none}
}
`;

export default function MealTicket({ genre, ticketNo, issuedAt, nicknames = [], onNext, ctaLabel = "引き抜く", genres }) {
  const [mode, setMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "run"
  ); // run | done | gone
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(0);

  useEffect(() => {
    if (mode !== "run") return;
    const t = setTimeout(() => setMode("done"), 1500);
    return () => clearTimeout(t);
  }, [mode]);

  const no = typeof ticketNo === "number" ? "No." + String(ticketNo).padStart(7, "0") : ticketNo || "";
  const date = fmtDate(issuedAt);
  const names = (nicknames || []).filter(Boolean).join("  ×  ");

  // 12ジャンルを用意（確定ジャンルは必ず含めて点灯・他は暗く沈める）
  let list = (Array.isArray(genres) && genres.length ? genres : DEFAULT_GENRES).slice(0, 12);
  for (let i = list.length; i < 12; i++) list.push(DEFAULT_GENRES[i % DEFAULT_GENRES.length]);
  if (genre && !list.includes(genre)) {
    list = list.slice();
    list[4] = genre;
  }

  const extract = () => {
    if (mode === "gone") return;
    setMode("gone");
    setTimeout(() => onNext?.(), 340);
  };
  const onDown = (e) => {
    if (mode === "gone") return;
    if (mode === "run") setMode("done");
    startRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e) => {
    if (!dragging) return;
    setDragY(Math.min(Math.max(0, startRef.current - e.clientY), 300));
  };
  const onUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    e.stopPropagation();
    if (dragY >= 80) extract();
    else setDragY(0);
  };
  const onRoot = () => {
    if (mode === "run") setMode("done");
  };

  const ticketStyle =
    mode === "run"
      ? undefined
      : {
          transform: `translateX(-50%) translateY(${mode === "gone" ? -340 : -dragY}px)`,
          opacity: mode === "gone" ? 0 : 1,
          transition: dragging ? "none" : "transform .35s cubic-bezier(.2,.7,.3,1), opacity .3s ease",
        };

  return (
    <div className={`mt-root ${mode === "run" ? "anim" : ""}`} onClick={onRoot} role="dialog" aria-label={`食券：${genre}`}>
      <style>{CSS}</style>

      <div className="mt-kb">
        <div className="mt-screen">
          <div className="mt-grid" aria-hidden>
            {list.map((label, i) => {
              const active = label === genre;
              return (
                <div key={i} className={`mt-tile ${active ? "lit" : "dim"}`}>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-outlet-space" />

        {/* 食券（縁より奥） */}
        <div
          className={`mt-ticket ${mode !== "run" && mode !== "gone" ? "grab" : ""} ${dragging ? "grabbing" : ""}`}
          style={ticketStyle}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {/* 地紋（薄いストライプ・3度傾け・SVGでフラット描画） */}
          <svg className="mt-jimon" preserveAspectRatio="none" aria-hidden>
            <defs>
              <pattern id="mtjimon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(3)">
                <rect width="3" height="8" fill="#2a2520" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mtjimon)" />
          </svg>

          {/* 太めの二重罫線の囲み */}
          <div className="mt-frame">
            <div className="mt-top">
              <span>MESHI-MACHI 半券</span>
              <span className="mt-no">{no}</span>
            </div>
            <div className="mt-genre">{genre}</div>
            <div className="mt-amount">
              <span className="lb">本日無料</span>
              <span className="yen">¥0</span>
            </div>

            {/* ミシン目：半円の切り欠き */}
            <svg className="mt-perf2" viewBox="0 0 252 5" preserveAspectRatio="none" aria-hidden>
              {NOTCH_X.map((x, i) => (
                <path key={i} d={`M${x - 2} 0 A2 2 0 0 0 ${x + 2} 0 Z`} fill="#2a2520" />
              ))}
            </svg>

            <div className="mt-stub2">
              {names && <div className="mt-names">{names}</div>}
              {date && <div className="mt-date">発行 {date}</div>}
            </div>
          </div>
        </div>

        {mode === "done" && (
          <div className="mt-pull" aria-hidden>
            <span className="ar">↑</span>引き抜く
          </div>
        )}

        {/* 口の縁（券より手前） */}
        <div className="mt-below" aria-hidden>
          <div className="mt-slot" />
          <div className="mt-tray" />
        </div>
      </div>

      {mode === "run" ? (
        <div className="mt-skip">タップでスキップ</div>
      ) : (
        <button className="mt-cta" onClick={(e) => { e.stopPropagation(); extract(); }}>
          {ctaLabel} ↑
        </button>
      )}
    </div>
  );
}
