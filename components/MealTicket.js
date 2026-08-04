"use client";

import { useEffect, useRef, useState } from "react";

// 食券発行アニメーション（券売機・1ファイル自己完結・標準CSSのみ・外部画像なし）
//
// 券は取り出し口の下端から「下向きに垂れ下がる」。引き抜きは下方向。
//
// タイムライン（合計1.5s・厳守）
//  0.0-0.3s  確定ジャンルのボタンだけ点灯
//  0.3-0.5s  ボタンが押し込まれる（沈んで発光）
//  0.5-0.9s  取り出し口から食券が下へせり出す（減速）
//  0.9-1.4s  下に65%ほど出た位置で小さく揺れて静止
//  1.4s-     券面の文字フェードイン
// 完成後：券を下に80px以上ドラッグ（またはCTA）で引き抜く → onNext
//
// props（券面はハードコードしない）
//  genre / ticketNo / issuedAt / nicknames / onNext / ctaLabel

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

// 券売機のダミーメニュー（装飾用・券面データではない）
const FILLER = ["ラーメン", "半チャーハン", "餃子", "カレー", "カツ丼", "生姜焼定食", "唐揚定食", "焼魚定食", "肉うどん", "親子丼", "冷しそば", "日替り"];
const PRICES = ["¥900", "¥400", "¥350", "¥800", "¥900", "¥950", "¥900", "¥1000", "¥750", "¥850", "¥800", "¥850"];
const FALLBACK_INDEX = 4; // 確定ジャンルがメニューに無いときに置き換える位置

const CSS = `
.mt-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  background:#14161c;color:#efe7d3;overflow:hidden;padding:20px;
  font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,"Courier New",monospace;
  -webkit-tap-highlight-color:transparent;user-select:none;touch-action:none}

/* ── 券売機本体（マット金属・凹凸はベベル/影のみ）── */
.mt-kb{position:relative;display:flex;flex-direction:column;width:300px;max-width:86vw;height:min(72vh,540px);
  background:#565b62;border:2px solid #34373c;border-radius:12px;padding:12px 12px 12px;
  box-shadow:inset 2px 2px 0 #6a7079, inset -2px -3px 0 #40444a, 0 8px 0 #26282d, 0 14px 24px rgba(0,0,0,.5)}
.mt-head{display:flex;align-items:center;color:#c9ccd1;font-size:11px;letter-spacing:.28em;
  padding:2px 2px 8px;border-bottom:2px solid #43474d}
.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}
.mt-btn{height:46px;border-radius:4px;background:#2b3037;color:#79818b;
  border:1px solid #191c20;box-shadow:inset 1px 1px 0 #3b414a, inset -1px -2px 0 #191c20, 0 2px 0 #16181c;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0 4px}
.mt-btn .lbl{font-size:11px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mt-btn .prc{font-size:9px;opacity:.7}
.mt-btn.active{background:#23272e;color:#3f444b}
/* 点灯＋押し込み（.anim時のみ演出。base=最終=点灯） */
.mt-btn.lit{background:#ece0bf;color:#26251f;border-color:#b7ab84;
  box-shadow:inset 2px 2px 0 #cbbd94, inset -1px -2px 0 #fff6db;transform:translateY(2px)}
.mt-btn.lit .prc{color:#6b6552;opacity:1}

/* ── 取り出し口（下向きに券が垂れ下がる領域）── */
.mt-outlet{position:relative;flex:0 0 auto;height:198px;overflow:hidden;margin-top:12px;border-radius:4px;
  box-shadow:inset 0 5px 7px -3px rgba(0,0,0,.62)}
/* 口の暗いスリット（薄く・券の背後）*/
.mt-slit{position:absolute;top:0;left:14px;right:14px;height:5px;background:#0e1014;border-radius:0 0 3px 3px;z-index:1}

/* ── 食券（感熱紙・生成り色・等幅・横長3:2）口の下端から垂れる ── */
.mt-ticket{position:absolute;left:50%;top:-40px;width:240px;max-width:calc(86vw - 26px);height:160px;
  transform:translateX(-50%);transform-origin:50% 0;z-index:2;background:#efe7d3;color:#2b2a24;
  border:1px solid #cbbf9f;border-radius:0 0 3px 3px;overflow:hidden;
  box-shadow:0 6px 12px -4px rgba(0,0,0,.5)}
.mt-ticket.grab{cursor:grab}
.mt-ticket.grabbing{cursor:grabbing}
/* 上端付近に落ちる口の影（券の背後から出てくる接触部・薄く）*/
.mt-ticket::after{content:"";position:absolute;left:0;right:0;top:0;height:7px;background:rgba(0,0,0,.16);z-index:3}
/* 隠れる上部：半券の帯＋ミシン目 */
.mt-stub{height:34px;display:flex;align-items:center;justify-content:space-between;background:#ddceac;color:#514c3c;
  padding:0 12px;font-size:11px;letter-spacing:.14em;font-weight:700}
.mt-stub .brand{opacity:.85;letter-spacing:.1em}
.mt-perf{border-top:2px dashed #b8ac8c}
/* 見える下部：券番号・ジャンル名・名前・発行日時 */
.mt-body{padding:7px 14px 0;text-align:center}
.mt-no{font-size:11px;letter-spacing:.1em;color:#6b6552;text-align:right}
.mt-cap{font-size:9px;letter-spacing:.35em;color:#8a836c;margin-top:2px}
.mt-genre{font-size:25px;line-height:1.05;font-weight:800;letter-spacing:.03em;margin:2px 0 6px;color:#26251f}
.mt-names{font-size:12px;color:#4a463a;letter-spacing:.06em}
.mt-date{font-size:9px;color:#7a7460;margin-top:5px}

/* 釣り銭口（凹み・浅め）*/
.mt-tray{flex:0 0 auto;height:17px;margin-top:12px;background:#3f4349;border-radius:4px;
  box-shadow:inset 0 3px 6px rgba(0,0,0,.55)}

.mt-cta{flex:0 0 auto;background:#e7dcbf;color:#23231f;border:1px solid #b7ab84;border-radius:6px;padding:12px 30px;
  font-family:inherit;font-size:14px;font-weight:800;letter-spacing:.08em;cursor:pointer;
  box-shadow:inset 1px 1px 0 #fff6db, inset -1px -2px 0 #cbbd94, 0 3px 0 #a99a6f}
.mt-cta:active{transform:translateY(2px);box-shadow:inset 1px 1px 0 #fff6db,0 1px 0 #a99a6f}
.mt-skip{font-size:11px;letter-spacing:.2em;color:#565c66}

/* ── アニメーション（.anim のときだけ。base=最終状態）── */
.mt-root.anim .mt-btn.lit{animation:mtLight .3s ease-out both, mtPress .2s ease .3s both}
.mt-root.anim .mt-ticket{animation:mtEmerge .9s .5s both}
.mt-root.anim .mt-body{animation:mtFade .35s ease 1.4s both}

@keyframes mtLight{from{background:#23272e;color:#3f444b;border-color:#191c20;box-shadow:inset 1px 1px 0 #3b414a,inset -1px -2px 0 #191c20,0 2px 0 #16181c}
  to{background:#ece0bf;color:#26251f;border-color:#b7ab84;box-shadow:inset 2px 2px 0 #cbbd94,inset -1px -2px 0 #fff6db}}
@keyframes mtPress{0%{transform:translateY(0)}55%{transform:translateY(4px)}100%{transform:translateY(2px)}}
/* 券が上（機内）から下へ垂れ下がる */
@keyframes mtEmerge{
  0%{transform:translate(-50%,-124px);animation-timing-function:cubic-bezier(.15,.75,.3,1)}
  50%{transform:translate(-50%,8px);animation-timing-function:ease-in-out}
  66%{transform:translate(-50%,-4px) rotate(-1deg)}
  80%{transform:translate(-50%,3px) rotate(.7deg)}
  92%{transform:translate(-50%,-1px) rotate(-.3deg)}
  100%{transform:translate(-50%,0) rotate(0)}
}
@keyframes mtFade{from{opacity:0}to{opacity:1}}

@media (prefers-reduced-motion: reduce){
  .mt-root.anim .mt-btn.lit,.mt-root.anim .mt-ticket,.mt-root.anim .mt-body{animation:none}
}
`;

export default function MealTicket({ genre, ticketNo, issuedAt, nicknames = [], onNext, ctaLabel = "引き抜く" }) {
  const [mode, setMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "run"
  ); // run | done | gone
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(0);

  // 1.5秒で演出終了 → done（引き抜き待ち）
  useEffect(() => {
    if (mode !== "run") return;
    const t = setTimeout(() => setMode("done"), 1500);
    return () => clearTimeout(t);
  }, [mode]);

  const no = typeof ticketNo === "number" ? "No." + String(ticketNo).padStart(7, "0") : ticketNo || "";
  const date = fmtDate(issuedAt);
  const names = (nicknames || []).filter(Boolean).join("  ×  ");

  // 確定ジャンルはリスト内の該当ボタンをハイライト（専用枠へ複製しない）
  const found = FILLER.indexOf(genre);
  const activeIdx = found >= 0 ? found : FALLBACK_INDEX;
  const cells = FILLER.map((label, i) => {
    if (i === activeIdx) return { label: found >= 0 ? label : genre, active: true };
    return { label, price: PRICES[i], active: false };
  });

  const extract = () => {
    if (mode === "gone") return;
    setMode("gone");
    setTimeout(() => onNext?.(), 340);
  };

  // 券の引き抜きドラッグ（下方向）
  const onDown = (e) => {
    if (mode === "gone") return;
    if (mode === "run") setMode("done"); // アニメ中に触ったらスキップ
    startRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e) => {
    if (!dragging) return;
    setDragY(Math.min(Math.max(0, e.clientY - startRef.current), 300)); // 下方向が正
  };
  const onUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    e.stopPropagation();
    if (dragY >= 80) extract();
    else setDragY(0);
  };

  const onRoot = () => {
    if (mode === "run") setMode("done"); // タップで演出スキップ
  };

  const ticketStyle =
    mode === "run"
      ? undefined
      : {
          transform: `translateX(-50%) translateY(${mode === "gone" ? 340 : dragY}px)`,
          opacity: mode === "gone" ? 0 : 1,
          transition: dragging ? "none" : "transform .35s cubic-bezier(.2,.7,.3,1), opacity .3s ease",
        };

  return (
    <div className={`mt-root ${mode === "run" ? "anim" : ""}`} onClick={onRoot} role="dialog" aria-label={`食券：${genre}`}>
      <style>{CSS}</style>

      <div className="mt-kb">
        <div className="mt-head">
          <span>食券自販機</span>
        </div>

        <div className="mt-grid" aria-hidden>
          {cells.map((c, i) => (
            <div key={i} className={`mt-btn ${c.active ? "active lit" : ""}`}>
              <span className="lbl">{c.label}</span>
              <span className="prc">{c.active ? "本日のマッチ" : c.price}</span>
            </div>
          ))}
        </div>

        {/* 取り出し口（券は下へ垂れ下がる・上部は口に隠れる） */}
        <div className="mt-outlet">
          <div className="mt-slit" aria-hidden />
          <div
            className={`mt-ticket ${mode !== "run" && mode !== "gone" ? "grab" : ""} ${dragging ? "grabbing" : ""}`}
            style={ticketStyle}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* 隠れる上部：半券の帯＋ミシン目 */}
            <div className="mt-stub">
              <span>半券</span>
              <span className="brand">MESHI-MACHI</span>
            </div>
            <div className="mt-perf" />
            {/* 見える下部：番号・ジャンル・名前・日時 */}
            <div className="mt-body">
              <div className="mt-no">{no}</div>
              <div className="mt-cap">本日のマッチ</div>
              <div className="mt-genre">{genre}</div>
              {names && <div className="mt-names">{names}</div>}
              {date && <div className="mt-date">発行 {date}</div>}
            </div>
          </div>
        </div>

        {/* 釣り銭口 */}
        <div className="mt-tray" aria-hidden />
      </div>

      {mode === "run" ? (
        <div className="mt-skip">タップでスキップ</div>
      ) : (
        <button className="mt-cta" onClick={(e) => { e.stopPropagation(); extract(); }}>
          {ctaLabel} ↓
        </button>
      )}
    </div>
  );
}
