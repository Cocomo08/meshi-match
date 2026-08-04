"use client";

import { useEffect, useState } from "react";

// 食券発行アニメーション（1ファイル自己完結・標準CSSアニメのみ・外部画像なし）
//
// タイムライン（合計1.5s・厳守）
//  0.0-0.3s  確定ジャンルのボタンだけ点灯
//  0.3-0.5s  ボタンが押し込まれる（縮んで発光）
//  0.5-0.9s  取り出し口から食券がせり出す（減速）
//  0.9-1.4s  中央へ浮き上がり、3度傾いて静止
//  1.4s-     券面の文字フェードイン＋CTA表示
//
// props（ハードコードしない）
//  genre      : 確定ジャンル名（必須）
//  ticketNo   : 通し番号。number ならNo.0000000形式、string ならそのまま
//  issuedAt   : 発行日時。Date でも "2026.08.04 20:15" のような string でも可
//  nicknames  : 二人のニックネーム配列 ["たろ", "はな"]（本名・顔写真は載せない）
//  onNext     : CTA / タップで次へ
//  ctaLabel   : CTAの文言（既定 "つぎへ"）

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

const CSS = `
.mt-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
  background:#14161c;color:#efe7d3;overflow:hidden;padding:24px;
  font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,"Courier New",monospace;
  -webkit-tap-highlight-color:transparent;user-select:none;cursor:pointer}
.mt-stage{position:relative;width:100%;max-width:360px;flex:1;min-height:0}

/* ── 券売機（マットな金属・ツヤ/グラデ無し）── */
.mt-kb{position:absolute;top:2%;left:50%;transform:translateX(-50%);width:88%;height:66%;
  background:#54585f;border:2px solid #3a3d43;border-radius:10px;padding:14px}
.mt-kb-head{font-size:12px;letter-spacing:.35em;color:#c9ccd1;text-align:center;border-bottom:1px solid #4a4e55;padding-bottom:8px}
.mt-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}
.mt-btn{height:42px;border-radius:5px;background:#23272e;color:#464b53;border:1px solid #191c21;
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
  padding:0 6px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mt-btn.active{background:#e7dcbf;color:#23231f;box-shadow:0 0 0 2px #f2e9cf inset;transform:scale(.96)}
.mt-slot{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);width:64%;height:14px;
  background:#15171b;border-radius:3px;border:1px solid #0f1013;box-shadow:0 2px 0 #696d74}

/* ── 食券（感熱紙・生成り色・等幅無骨）── */
.mt-ticket{position:absolute;top:45%;left:50%;width:78%;max-width:280px;transform:translate(-50%,-50%);
  transform-origin:50% 0;background:#efe7d3;color:#2b2a24;border:1px solid #cbbf9f;border-radius:4px;padding-bottom:16px;z-index:5}
.mt-ticket::before,.mt-ticket::after{content:"";position:absolute;top:41px;width:16px;height:16px;border-radius:50%;background:#14161c}
.mt-ticket::before{left:-9px}
.mt-ticket::after{right:-9px}
.mt-stub{display:flex;align-items:center;justify-content:space-between;background:#ddceac;color:#514c3c;
  padding:7px 12px;font-size:11px;letter-spacing:.18em;font-weight:700}
.mt-stub .brand{opacity:.8;letter-spacing:.12em}
.mt-perf{border-top:2px dashed #b8ac8c}
.mt-body{padding:14px 16px 0;text-align:center}
.mt-no{font-size:12px;letter-spacing:.12em;color:#6b6552;text-align:right}
.mt-cap{font-size:10px;letter-spacing:.35em;color:#8a836c;margin-top:6px}
.mt-genre{font-size:30px;line-height:1.15;font-weight:800;letter-spacing:.04em;margin:6px 0 12px;color:#26251f}
.mt-names{font-size:13px;color:#4a463a;letter-spacing:.06em}
.mt-date{font-size:11px;color:#7a7460;margin-top:12px;border-top:1px dashed #cbbf9f;padding-top:8px}
.mt-cta{flex:0 0 auto;background:#e7dcbf;color:#23231f;border:none;border-radius:6px;padding:14px 34px;
  font-family:inherit;font-size:15px;font-weight:800;letter-spacing:.08em;cursor:pointer}
.mt-cta:active{transform:translateY(1px)}
.mt-skip{position:absolute;bottom:14px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:.2em;color:#5a5f68}

/* ── アニメーション（.anim のときだけ再生。base=最終状態）── */
.mt-root.anim .mt-btn.active{animation:mtBtnLight .3s ease-out both, mtBtnPress .2s ease .3s both}
.mt-root.anim .mt-ticket{animation:mtTicket .9s .5s both}
.mt-root.anim .mt-body{animation:mtFade .35s ease 1.4s both}
.mt-root.anim .mt-cta{animation:mtFade .35s ease 1.42s both}

@keyframes mtBtnLight{from{background:#23272e;color:#464b53;box-shadow:none}to{background:#e7dcbf;color:#23231f;box-shadow:0 0 0 2px #f2e9cf inset}}
@keyframes mtBtnPress{0%{transform:scale(1)}55%{transform:scale(.9)}100%{transform:scale(.96)}}
@keyframes mtTicket{
  0%{transform:translate(-50%,calc(-50% + 150px)) scaleY(0);opacity:.85;animation-timing-function:cubic-bezier(.15,.75,.3,1)}
  44%{transform:translate(-50%,calc(-50% + 150px)) scaleY(1);opacity:1;animation-timing-function:cubic-bezier(.4,0,.35,1)}
  60%{transform:translate(-50%,calc(-50% + 28px)) rotate(-6deg)}
  74%{transform:translate(-50%,calc(-50% - 8px)) rotate(5deg)}
  86%{transform:translate(-50%,calc(-50% + 5px)) rotate(-3deg)}
  100%{transform:translate(-50%,-50%) rotate(0deg)}
}
@keyframes mtFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

@media (prefers-reduced-motion: reduce){
  .mt-root.anim .mt-btn.active,.mt-root.anim .mt-ticket,.mt-root.anim .mt-body,.mt-root.anim .mt-cta{animation:none}
}
`;

export default function MealTicket({ genre, ticketNo, issuedAt, nicknames = [], onNext, ctaLabel = "つぎへ" }) {
  // reduced-motion なら最初から最終状態（done）
  const [mode, setMode] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "done"
      : "run"
  );

  // 1.5秒の演出が終わったら done へ（スキップ表示を消し、以降のタップは次へ）
  useEffect(() => {
    if (mode !== "run") return;
    const t = setTimeout(() => setMode("done"), 1500);
    return () => clearTimeout(t);
  }, [mode]);

  const no = typeof ticketNo === "number" ? "No." + String(ticketNo).padStart(7, "0") : ticketNo || "";
  const date = fmtDate(issuedAt);
  const names = (nicknames || []).filter(Boolean).join("  ×  ");

  // タップ：アニメ中はスキップ、終わっていれば次へ
  const onRoot = () => {
    if (mode === "run") setMode("done");
    else onNext?.();
  };
  const onCta = (e) => {
    e.stopPropagation();
    onNext?.();
  };

  // 券売機のダミーボタン配置（確定ジャンルを1つだけ点灯）
  const cells = [genre, "", "", "", "", ""];

  return (
    <div
      className={`mt-root ${mode === "run" ? "anim" : ""}`}
      onClick={onRoot}
      role="button"
      tabIndex={0}
      aria-label={`食券：${genre}`}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onRoot()}
    >
      <style>{CSS}</style>

      <div className="mt-stage">
        {/* 券売機 */}
        <div className="mt-kb" aria-hidden>
          <div className="mt-kb-head">食券機</div>
          <div className="mt-grid">
            {cells.map((label, i) => (
              <div key={i} className={`mt-btn ${i === 0 ? "active" : ""}`}>
                {i === 0 ? label : "―"}
              </div>
            ))}
          </div>
          <div className="mt-slot" />
        </div>

        {/* 食券 */}
        <div className="mt-ticket">
          <div className="mt-stub">
            <span>半券</span>
            <span className="brand">MESHI-MACHI</span>
          </div>
          <div className="mt-perf" />
          <div className="mt-body">
            <div className="mt-no">{no}</div>
            <div className="mt-cap">本日のマッチ</div>
            <div className="mt-genre">{genre}</div>
            {names && <div className="mt-names">{names}</div>}
            {date && <div className="mt-date">発行 {date}</div>}
          </div>
        </div>

        {mode === "run" && <div className="mt-skip">タップでスキップ</div>}
      </div>

      <button className="mt-cta" onClick={onCta}>
        {ctaLabel}
      </button>
    </div>
  );
}
