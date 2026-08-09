"use client";

import { useEffect, useRef, useState } from "react";
import { recordMatch } from "@/lib/keepsake";

// 食券発行アニメーション（券売機・自己完結・標準CSS＋SVG／外部画像なし）
//  夜の屋台の世界観：木製の券売機・生成りの紙・墨の印字。
//  発券後の券は「二人の思い出の記録」として、画像で保存・共有できる。
//
// タイムライン（合計1.5s）※prefers-reduced-motion 時はフェードのみ
//  0.0-0.3s  確定ジャンルのボタンだけ暖色に灯る（点滅させない）
//  0.3-0.5s  ボタンが軽く押し込まれる
//  0.5-0.9s  受け取り口から券が下へせり出す（減速）
//  0.9-1.4s  少し揺れて静止 → 1.4s 券面フェードイン
//
// props（券面はハードコードしない）
//  genre / ticketNo / issuedAt / nicknames / matchCount / totalCount /
//  matchedLabels / onNext / ctaLabel

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

// 券売機の飾りメニュー（装飾・券面データではない）3x3
const FILLER = ["ラーメン", "餃子", "カレー", "カツ丼", "生姜焼", "唐揚定食", "肉うどん", "親子丼", "日替り"];
const PRICES = ["¥900", "¥350", "¥800", "¥900", "¥950", "¥900", "¥750", "¥850", "¥850"];
const FALLBACK_INDEX = 4;

// 名前の文字数に応じた自動サイズ（6文字までは同サイズ→段階的に縮小）
function nameFont(len) {
  if (len <= 6) return 15;
  if (len <= 8) return 13;
  if (len <= 10) return 11.5;
  return 10;
}
function genreFont(len) {
  if (len <= 4) return 30;
  if (len <= 5) return 26;
  if (len <= 6) return 22;
  return 19;
}

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

.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}
/* ボタン＝琺瑯風のフラットな札（金属光沢・グラデーションノイズなし）*/
.mt-btn{height:40px;border-radius:4px;background:#efe3c3;color:#4a4636;
  border:1px solid #b0a37d;box-shadow:inset 0 1px 0 #fffdf5, 0 2px 0 #705227;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0 4px}
.mt-btn .lbl{font-size:11px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.mt-btn .prc{font-size:9px;opacity:.7}
/* 選ばれたジャンルだけ提灯と同じ暖色で灯る（点滅なし）*/
.mt-btn.lit{background:#ffd98a;color:#3a2a12;border-color:#e0a94e;
  box-shadow:inset 0 1px 0 #fff3d0, 0 0 14px rgba(255,190,90,.7), 0 2px 0 #a9772f;transform:translateY(1px)}
.mt-btn.lit .prc{color:#6b4a1c;opacity:1;font-weight:700}

/* ── 受け取り口（券が下へ垂れ下がる）── */
.mt-outlet{position:relative;flex:0 0 auto;height:270px;overflow:hidden;margin-top:12px;border-radius:5px;
  background:linear-gradient(180deg,#3f2a15,#2c1c0d);
  box-shadow:inset 0 6px 8px -3px rgba(0,0,0,.7)}
.mt-slit{position:absolute;top:0;left:12px;right:12px;height:5px;background:#120c06;border-radius:0 0 3px 3px;z-index:3}

/* 機内でのせり出し（券は natural サイズ）*/
.mt-ticket{position:absolute;left:50%;top:-46px;transform:translateX(-50%);transform-origin:50% 0;z-index:2}
.mt-ticket.grab{cursor:grab}.mt-ticket.grabbing{cursor:grabbing}

/* 釣り銭口 */
.mt-tray{flex:0 0 auto;height:16px;margin-top:12px;border-radius:4px;background:#3a2614;
  box-shadow:inset 0 3px 6px rgba(0,0,0,.6)}

/* ── 券そのもの（生成りの紙・墨の印字・落ち影）── */
.tf{position:relative;width:250px;color:#2a2520;border-radius:3px 6px 4px 7px;overflow:hidden;
  background-color:#efe3c3;
  background-image:
    radial-gradient(circle at 20% 12%, rgba(150,120,40,.07), transparent 9%),
    radial-gradient(circle at 74% 22%, rgba(160,130,50,.06), transparent 8%),
    radial-gradient(circle at 44% 52%, rgba(150,120,40,.05), transparent 10%),
    radial-gradient(circle at 82% 74%, rgba(140,110,40,.05), transparent 8%),
    radial-gradient(circle at 22% 84%, rgba(160,130,50,.05), transparent 9%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px rgba(120,95,40,.14),
    0 10px 16px -6px rgba(0,0,0,.55)}
/* 半券（上部の帯）*/
.tf-stub{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;
  background:#e3d5b2;color:#6b5f42;font-size:10.5px;letter-spacing:.14em;font-weight:800;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-perf{border-top:2px dashed #b8ac8c}
.tf-body{padding:7px 14px 12px;text-align:center}
.tf-no{font-size:10.5px;letter-spacing:.08em;color:#7a6f52;text-align:right}
.tf-cap{font-size:9px;letter-spacing:.34em;color:#8a7f60;margin-top:1px}
.tf-genre{line-height:1.04;font-weight:800;letter-spacing:.03em;margin:3px 0 6px;color:#221f18;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-names{color:#3a352a;letter-spacing:.04em;font-weight:700;white-space:nowrap;overflow:hidden}
.tf-names .sep{opacity:.5;margin:0 .35em;font-weight:400}
.tf-date{font-size:9px;color:#8a7f60;margin-top:4px}
/* 記録欄（印刷物らしく小さく詰める）*/
.tf-rec{margin-top:9px;padding-top:8px;border-top:1px solid #cabf9d;display:flex;flex-direction:column;gap:4px}
.tf-row{display:flex;align-items:baseline;justify-content:center;gap:6px;font-size:10.5px;color:#4a453a;letter-spacing:.02em}
.tf-row .k{color:#8a7f60;font-size:9px;letter-spacing:.08em;white-space:nowrap}
.tf-row .hit{font-weight:800;color:#221f18;font-size:12px;letter-spacing:.04em;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
/* 二人が選んだジャンル：ラベルを上、一覧を下に（語の途中で折れない）*/
.tf-reclist{display:flex;flex-direction:column;align-items:center;gap:1px}
.tf-list{font-weight:700;color:#3a352a;font-size:10.5px;line-height:1.3;text-align:center}
.tf-ord{font-weight:800;color:#8a3b1e;letter-spacing:.04em;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}

/* 保存用の書き出しカード（正方形・券のみを暖色地に中央配置。画面外に配置して撮る）*/
.mt-export{position:fixed;left:-9999px;top:0;width:360px;height:360px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(120% 90% at 50% 20%, #3a2a1b, #201509);}

/* 導線 */
.mt-actions{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:9px;width:100%;max-width:300px}
.mt-cta{width:100%;background:#efe3c3;color:#2a2520;border:1px solid #b0a37d;border-radius:6px;padding:12px 20px;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-size:15px;font-weight:900;letter-spacing:.08em;cursor:pointer;
  box-shadow:inset 0 1px 0 #fffdf5, 0 4px 0 #a9772f}
.mt-cta:active{transform:translateY(3px);box-shadow:inset 0 1px 0 #fffdf5,0 1px 0 #a9772f}
.mt-save{width:100%;background:#3a2614;color:#f0e6d2;border:1px solid #1f1408;border-radius:6px;padding:11px 20px;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-size:14px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,220,170,.22), 0 4px 0 #140d05}
.mt-save:active{transform:translateY(3px);box-shadow:inset 0 1px 0 rgba(255,220,170,.22),0 1px 0 #140d05}
.mt-save:disabled{opacity:.6;cursor:default}
.mt-note{font-size:11px;color:#e6d9bd;opacity:.85;text-align:center;letter-spacing:.03em;max-width:280px}
.mt-preview{display:flex;flex-direction:column;align-items:center;gap:6px}
.mt-preview img{width:200px;max-width:70vw;border-radius:6px;box-shadow:0 8px 18px rgba(0,0,0,.5)}
.mt-preview span{font-size:11px;color:#e6d9bd;opacity:.85}
.mt-skip{font-size:11px;letter-spacing:.2em;color:#b7a988}

/* ── アニメーション（.anim のときだけ）── */
.mt-root.anim .mt-btn.lit{animation:mtPress .2s ease .3s both}
.mt-root.anim .mt-ticket{animation:mtEmerge .9s .5s both}
.mt-root.anim .tf-body,.mt-root.anim .tf-stub{animation:mtFade .35s ease 1.4s both}
@keyframes mtPress{0%{transform:translateY(0)}55%{transform:translateY(3px)}100%{transform:translateY(1px)}}
@keyframes mtEmerge{
  0%{transform:translate(-50%,-150px);animation-timing-function:cubic-bezier(.15,.75,.3,1)}
  55%{transform:translate(-50%,6px);animation-timing-function:ease-in-out}
  70%{transform:translate(-50%,-4px) rotate(-.8deg)}
  84%{transform:translate(-50%,3px) rotate(.6deg)}
  94%{transform:translate(-50%,-1px) rotate(-.2deg)}
  100%{transform:translate(-50%,0) rotate(0)}
}
@keyframes mtFade{from{opacity:0}to{opacity:1}}

@media (prefers-reduced-motion: reduce){
  /* 発券はフェードに置換。ボタンの灯りは残すが点滅させない */
  .mt-root.anim .mt-btn.lit{animation:none}
  .mt-root.anim .mt-ticket{animation:mtFade .4s ease both}
  .mt-root.anim .tf-body,.mt-root.anim .tf-stub{animation:mtFade .4s ease both}
}
`;

// 券面（機内表示・書き出し共通）
function TicketFace({ no, cap, genre, name0, name1, date, matchCount, totalCount, matchedLabels, ordinal }) {
  const nlen = Math.max((name0 || "").length, (name1 || "").length);
  const nameSize = nameFont(nlen);
  const gSize = genreFont((genre || "").length);

  // 同時に選んだジャンル：上位3つ＋「ほか」
  const list = (matchedLabels || []).filter(Boolean);
  const listText = list.length ? list.slice(0, 3).join("・") + (list.length > 3 ? " ほか" : "") : "";

  const showHit = matchCount != null && matchCount > 0;
  const showList = list.length > 0;
  const showOrd = ordinal != null && ordinal > 0;
  const ordText = ordinal >= 2 ? `二人の ${ordinal} 杯目` : "はじめての一杯";

  return (
    <div className="tf">
      <div className="tf-stub">
        <span>半券</span>
        <span>MESHI-MACHI</span>
      </div>
      <div className="tf-perf" />
      <div className="tf-body">
        {no && <div className="tf-no">{no}</div>}
        <div className="tf-cap">{cap}</div>
        <div className="tf-genre" style={{ fontSize: gSize }}>{genre}</div>
        <div className="tf-names" style={{ fontSize: nameSize }}>
          {name0}<span className="sep">×</span>{name1}
        </div>
        {date && <div className="tf-date">発行 {date}</div>}

        {(showHit || showList || showOrd) && (
          <div className="tf-rec">
            {showHit && (
              <div className="tf-row">
                <span className="k">一致</span>
                <span className="hit">{matchCount} / {totalCount}</span>
              </div>
            )}
            {showList && (
              <div className="tf-reclist">
                <span className="k">二人が選んだ</span>
                <span className="tf-list">{listText}</span>
              </div>
            )}
            {showOrd && (
              <div className="tf-row">
                <span className="tf-ord">{ordText}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MealTicket({
  genre,
  ticketNo,
  issuedAt,
  nicknames = [],
  matchCount = 0,
  totalCount = 12,
  matchedLabels = [],
  onNext,
  ctaLabel = "お店をさがす",
}) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [mode, setMode] = useState(() => (reduced ? "done" : "run")); // run | done | gone
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ordinal, setOrdinal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [note, setNote] = useState("");
  const startRef = useRef(0);
  const exportRef = useRef(null);

  useEffect(() => {
    if (mode !== "run") return;
    const t = setTimeout(() => setMode("done"), 1500);
    return () => clearTimeout(t);
  }, [mode]);

  const no = typeof ticketNo === "number" ? "No." + String(ticketNo).padStart(7, "0") : ticketNo || "";
  const date = fmtDate(issuedAt);
  const name0 = (nicknames[0] || "").trim() || "きみ";
  const name1 = (nicknames[1] || "").trim() || "あいて";

  // 通算回数を記録し「何杯目か」を得る（同じ ticketNo は二重計上しない・保存先は keepsake に集約）
  useEffect(() => {
    const n = recordMatch({
      a: name0,
      b: name1,
      ticketNo,
      matchCount,
      genres: matchedLabels,
      at: typeof issuedAt === "number" ? issuedAt : Date.now(),
    });
    setOrdinal(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNo]);

  // 券売機ボタン：確定ジャンルのボタンだけ灯す
  const found = FILLER.indexOf(genre);
  const activeIdx = found >= 0 ? found : FALLBACK_INDEX;
  const cells = FILLER.map((label, i) => {
    if (i === activeIdx) return { label: found >= 0 ? label : genre, active: true };
    return { label, price: PRICES[i], active: false };
  });

  const faceProps = {
    no,
    cap: "本日のマッチ",
    genre,
    name0,
    name1,
    date,
    matchCount,
    totalCount,
    matchedLabels,
    ordinal,
  };

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
    setDragY(Math.min(Math.max(0, e.clientY - startRef.current), 320));
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

  // 券を画像として書き出す（券だけ・正方形に近い比率）
  const saveTicket = async (e) => {
    e?.stopPropagation?.();
    if (saving) return;
    setSaving(true);
    setNote("書き出し中…");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const node = exportRef.current;
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const url = canvas.toDataURL("image/png");
      setImgSrc(url);
      // 端末保存を試みる（iOS Safari 等では無視されることがある）
      let downloaded = false;
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `meshi-match-${(no || "ticket").replace(/[^\w.-]/g, "")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        downloaded = true;
      } catch {
        downloaded = false;
      }
      setNote(downloaded ? "保存しました。できない場合は下の画像を長押しで保存できます" : "下の画像を長押しで保存できます");
    } catch (err) {
      setNote("保存に失敗しました。少し待って、もう一度お試しください");
    } finally {
      setSaving(false);
    }
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
    <div className={`mt-root ${mode === "run" ? "anim" : ""}`} onClick={onRoot} role="dialog" aria-label={`思い出の食券：${genre}`}>
      <style>{CSS}</style>

      <div className="mt-kb">
        <div className="mt-head"><span>めしまち券売機</span></div>

        <div className="mt-grid" aria-hidden>
          {cells.map((c, i) => (
            <div key={i} className={`mt-btn ${c.active ? "lit" : ""}`}>
              <span className="lbl">{c.label}</span>
              <span className="prc">{c.active ? "本日のマッチ" : c.price}</span>
            </div>
          ))}
        </div>

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
            <TicketFace {...faceProps} />
          </div>
        </div>

        <div className="mt-tray" aria-hidden />
      </div>

      {mode === "run" ? (
        <div className="mt-skip">タップでスキップ</div>
      ) : (
        <div className="mt-actions" onClick={(e) => e.stopPropagation()}>
          <button className="mt-save" onClick={saveTicket} disabled={saving}>
            {saving ? "書き出し中…" : "この券を保存"}
          </button>
          {note && <div className="mt-note">{note}</div>}
          {imgSrc && (
            <div className="mt-preview">
              <img src={imgSrc} alt="思い出の食券" />
              <span>長押しで保存できます</span>
            </div>
          )}
          <button className="mt-cta" onClick={(e) => { e.stopPropagation(); extract(); }}>
            {ctaLabel} ↓
          </button>
        </div>
      )}

      {/* 保存用（画面外・正方形・券のみ）*/}
      <div className="mt-export" ref={exportRef} aria-hidden>
        <TicketFace {...faceProps} />
      </div>
    </div>
  );
}
