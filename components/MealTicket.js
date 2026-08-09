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

/* ── 受け取り口（実寸の券が奥から手前へ出てくる・スロットに厚み）── */
.mt-outlet{position:relative;flex:0 0 auto;height:180px;overflow:hidden;margin-top:12px;border-radius:5px;
  background:linear-gradient(180deg,#2a1a0c,#180e06);
  box-shadow:inset 0 8px 10px -3px rgba(0,0,0,.8)}
/* スロット（券幅ぶんの開口・3Dの縁）*/
.mt-slot{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:100px;height:11px;z-index:4;
  background:#0a0705;border-radius:2px;
  box-shadow:inset 0 3px 4px rgba(0,0,0,.9), 0 2px 0 rgba(255,224,170,.16), 0 4px 5px rgba(0,0,0,.5)}

/* 小さい券（スロット幅の約85%・実寸の約1/3）。奥から手前へ出てくる */
.mt-small-pos{position:absolute;top:7px;left:50%;margin-left:-42.5px;width:85px;z-index:3;will-change:transform}
.mt-small-sway{transform-origin:50% 0}
/* 出てすぐは反っている（湾曲）。手元では平らにする */
.mt-small{width:85px;height:92px;overflow:hidden;position:relative;transform-origin:50% 0;
  transform:perspective(320px) rotateX(7deg);filter:drop-shadow(0 9px 9px rgba(0,0,0,.6))}
.mt-small-inner{width:250px;transform:scale(.34);transform-origin:top left}
/* 口の縁が券の上端に落とす影（差し込まれている表現）*/
.mt-small::before{content:"";position:absolute;left:0;right:0;top:0;height:16px;z-index:5;
  background:linear-gradient(180deg,rgba(0,0,0,.55),transparent);pointer-events:none}
.mt-small-pos.grab{cursor:grab}.mt-small-pos.grabbing{cursor:grabbing}
/* 引き抜き案内 */
.mt-pull-hint{position:absolute;left:0;right:0;bottom:14px;text-align:center;z-index:3;pointer-events:none;
  font-size:11px;letter-spacing:.12em;color:#dcc9a5;opacity:.82;font-family:var(--font-zen-maru),sans-serif}

/* ── 手元（拡大）：券売機を暗くして券だけに焦点 ── */
.mt-dim{position:fixed;inset:0;z-index:70;background:rgba(6,4,2,.72);animation:mtFade .4s ease both}
.mt-hand{position:fixed;left:50%;top:42%;z-index:71;transform:translate(-50%,-50%);will-change:transform}
.mt-hand-grow{animation:mtToHand .5s cubic-bezier(.2,.7,.3,1) both}
.mt-hand-tilt{transform-origin:50% 42%;touch-action:none;cursor:grab}
.mt-hand-tilt.spring{transition:transform .32s cubic-bezier(.34,1.5,.5,1)}

/* 釣り銭口 */
.mt-tray{flex:0 0 auto;height:16px;margin-top:12px;border-radius:4px;background:#3a2614;
  box-shadow:inset 0 3px 6px rgba(0,0,0,.6)}

/* ── 券そのもの（生成りの紙・墨の印字・落ち影）── */
.tf{position:relative;width:250px;min-height:250px;display:flex;flex-direction:column;color:#2a2520;border-radius:3px 6px 4px 7px;overflow:hidden;
  background-color:#efe3c3;
  /* 生成りの微細ムラ ＋ ごく薄い地紋（幾何学の繰り返し・不透明度5%以下）*/
  background-image:
    repeating-linear-gradient(45deg, rgba(90,70,30,.035) 0 1px, transparent 1px 11px),
    repeating-linear-gradient(-45deg, rgba(90,70,30,.03) 0 1px, transparent 1px 11px),
    radial-gradient(circle at 20% 12%, rgba(150,120,40,.06), transparent 9%),
    radial-gradient(circle at 74% 22%, rgba(160,130,50,.05), transparent 8%),
    radial-gradient(circle at 44% 52%, rgba(150,120,40,.05), transparent 10%),
    radial-gradient(circle at 82% 74%, rgba(140,110,40,.05), transparent 8%),
    radial-gradient(circle at 22% 84%, rgba(160,130,50,.05), transparent 9%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px rgba(120,95,40,.14),
    0 10px 16px -6px rgba(0,0,0,.55)}
/* 縁に沿う二重罫線（内側の細い枠）*/
.tf-frame{position:absolute;inset:5px;border:1px solid rgba(120,95,40,.34);border-radius:3px;pointer-events:none;z-index:1}
/* 半券（上部の帯）*/
.tf-stub{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;
  background:#e3d5b2;color:#6b5f42;font-size:10.5px;letter-spacing:.14em;font-weight:800;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-perf{border-top:2px dashed #b8ac8c}
/* 3段のみ（ジャンル→名前→一致/杯目）。余白を広げて各段を明確に離す。強調は墨に統一 */
.tf-body{flex:1;padding:22px 16px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.tf-genre{line-height:1.05;font-weight:800;letter-spacing:.03em;color:#221f18;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-names{color:#2a2520;letter-spacing:.04em;font-weight:600;white-space:nowrap;overflow:hidden}
.tf-names .sep{opacity:.45;margin:0 .4em;font-weight:400}
/* 3段目：一致 と 杯目 を横1行に。色の強調は「杯目の数字」1箇所のみ */
.tf-stat{display:flex;align-items:baseline;justify-content:center;gap:16px;font-size:11px;color:#2a2520;letter-spacing:.03em}
.tf-hit{color:#2a2520;font-weight:400}
.tf-hit b{font-weight:400;font-size:1.35em}
.tf-ord{color:#2a2520;font-weight:400}
.tf-ord b{color:#a83a1c;font-weight:800;font-size:1.35em;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
.tf-ord.first{color:#a83a1c;font-weight:800;font-family:var(--font-klee),var(--font-zen-maru),sans-serif}
/* 発行日時：3段目のさらに下・極小・薄いグレー */
.tf-date{font-size:9px;color:#a49a80;letter-spacing:.04em;margin-top:2px}
/* ジャンルの墨線画（スワイプ画面と同じ描き味・小さく・主役より弱く）*/
.tf-art{width:46px;height:34px;opacity:.72;margin-bottom:-2px}
.tf-art svg{width:100%;height:100%;display:block}
/* 但し書き（読ませない・薄墨）*/
.tf-note{font-size:8px;color:#9a8f72;letter-spacing:.06em;margin-top:6px}
/* 朱印（右下・手描きらしく歪ませる・主役より弱く薄い朱）*/
.tf-seal{position:absolute;right:14px;bottom:12px;width:38px;height:38px;z-index:2;
  display:flex;align-items:center;justify-content:center;transform:rotate(-9deg);
  color:#b5533a;opacity:.5;border:2px solid #b5533a;border-radius:46% 54% 47% 53% / 52% 46% 54% 48%;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif;font-weight:800;font-size:16px;letter-spacing:.02em}

/* 保存用の書き出しカード（正方形・券のみを暖色地に中央配置。画面外に配置して撮る）*/
.mt-export{position:fixed;left:-9999px;top:0;width:360px;height:360px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(120% 90% at 50% 20%, #3a2a1b, #201509);}

/* 導線（手元＝拡大後にだけ表示・最前面）*/
.mt-actions{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:72;
  display:flex;flex-direction:column;align-items:center;gap:9px;width:100%;max-width:300px;padding:0 16px;
  animation:mtFade .35s ease .35s both}
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

/* ── アニメーション ── */
/* 発券：ボタンが軽く押し込まれ、小さい券がスロットから押し出される（途中で引っかかり→ストン）*/
.mt-dispense .mt-btn.lit{animation:mtPress .2s ease .2s both}
.mt-dispense .mt-small-pos{animation:mtEject .6s .35s both}
.mt-dispense .mt-small{animation:mtCurl .6s .35s both}
/* 引き抜き待ち：わずかに左右へ揺れる（1度以内）。無操作が続くと上下に促す */
.mt-await .mt-small-sway{animation:mtSway 2.6s ease-in-out infinite}
.mt-await .mt-small-pos.nudge{animation:mtNudge 1.4s ease-in-out infinite}
@keyframes mtPress{0%{transform:translateY(0)}55%{transform:translateY(3px)}100%{transform:translateY(1px)}}
@keyframes mtEject{
  0%{transform:translateY(-118%);animation-timing-function:cubic-bezier(.2,.72,.3,1)}
  46%{transform:translateY(-40%)}
  63%{transform:translateY(-40%)}                                   /* わずかに引っかかる */
  100%{transform:translateY(0);animation-timing-function:cubic-bezier(.55,.06,.62,1)} /* ストンと出る */
}
@keyframes mtCurl{from{transform:perspective(320px) rotateX(13deg)}to{transform:perspective(320px) rotateX(7deg)}}
@keyframes mtSway{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes mtNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
/* 手元：小さいスロット位置から画面中央へ移動しつつ拡大 */
@keyframes mtToHand{0%{transform:translateY(-70px) scale(.34);opacity:.5}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes mtFade{from{opacity:0}to{opacity:1}}

@media (prefers-reduced-motion: reduce){
  /* 排出と拡大はフェード。灯りは残すが点滅なし。湾曲・揺れは無効 */
  .mt-dispense .mt-btn.lit{animation:none}
  .mt-dispense .mt-small-pos{animation:mtFade .4s ease both}
  .mt-dispense .mt-small{animation:none;transform:none}
  .mt-await .mt-small-sway{animation:none}
  .mt-await .mt-small-pos.nudge{animation:none}
  .mt-small{transform:none}
  .mt-hand-grow{animation:mtFade .35s ease both}
}
`;

// 券面（機内表示・書き出し共通）。情報は3段：ジャンル→名前→一致/杯目。
//  印刷物らしい装飾（線画・二重罫線・地紋・但し書き・朱印）を主役より弱く添える。
function TicketFace({ genre, art, name0, name1, date, matchCount, totalCount, ordinal }) {
  const nlen = Math.max((name0 || "").length, (name1 || "").length);
  const nameSize = nameFont(nlen);
  const gSize = genreFont((genre || "").length);

  const showHit = matchCount != null && matchCount > 0;
  const showOrd = ordinal != null && ordinal > 0;

  return (
    <div className="tf">
      <div className="tf-frame" aria-hidden />
      <div className="tf-stub">
        <span>半券</span>
        <span>MESHI-MACHI</span>
      </div>
      <div className="tf-perf" />
      <div className="tf-body">
        {/* ジャンルの墨線画（小・弱く）*/}
        {art && <div className="tf-art" aria-hidden>{art}</div>}
        {/* 1段目：ジャンル名（最大・墨）*/}
        <div className="tf-genre" style={{ fontSize: gSize }}>{genre}</div>
        {/* 2段目：二人の名前（中・墨）*/}
        <div className="tf-names" style={{ fontSize: nameSize }}>
          {name0}<span className="sep">×</span>{name1}
        </div>
        {/* 3段目：一致 と 杯目 を横1行（小・墨／色は杯目の数字のみ）*/}
        {(showHit || showOrd) && (
          <div className="tf-stat">
            {showHit && (
              <span className="tf-hit">一致 <b>{matchCount}</b> / {totalCount}</span>
            )}
            {showOrd && (
              ordinal >= 2
                ? <span className="tf-ord">二人の <b>{ordinal}</b> 杯目</span>
                : <span className="tf-ord first">はじめての一杯</span>
            )}
          </div>
        )}
        {/* 発行日時：極小・薄いグレー */}
        {date && <div className="tf-date">発行 {date}</div>}
        {/* 但し書き（読ませない・薄墨）*/}
        <div className="tf-note">本券は当日限り有効・再発行不可</div>
      </div>
      {/* 朱印（右下・手描き風・弱く）*/}
      <span className="tf-seal" aria-hidden>承</span>
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

  // 状態：発券中 → 引き抜き待ち → 引き抜き中 → 手元（拡大）
  //  画面を離れて戻っても、手元まで進んでいれば手元から再開する
  const handKey = `mt-hand-${ticketNo}`;
  const resumedHand =
    typeof window !== "undefined" && (() => { try { return sessionStorage.getItem(handKey) === "1"; } catch { return false; } })();
  const [stage, setStage] = useState(resumedHand ? "hand" : "dispense"); // dispense | await | pulling | hand
  const [dragY, setDragY] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [tiltSpring, setTiltSpring] = useState(false);
  const [ordinal, setOrdinal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [note, setNote] = useState("");
  const startRef = useRef(0);
  const movedRef = useRef(0);
  const draggingRef = useRef(false);
  const idleRef = useRef(null);
  const tiltElRef = useRef(null);
  const exportRef = useRef(null);

  const SMALL_H = 92;
  const PULL_THRESHOLD = SMALL_H * 0.6; // 券の高さの60%引いたら自動で抜ける

  // 発券アニメーション（0.6s＋わずかな遅延）→ 引き抜き待ちへ
  useEffect(() => {
    if (stage !== "dispense") return;
    const t = setTimeout(() => setStage("await"), reduced ? 450 : 1000);
    return () => clearTimeout(t);
  }, [stage, reduced]);

  // 引き抜き待ちで無操作が続いたら、券を上下させて促す
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

  // 手元に到達したら記録（再開用）
  useEffect(() => {
    if (stage === "hand") { try { sessionStorage.setItem(handKey, "1"); } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

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
      genres: [genre].filter(Boolean),
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
    genre,
    art,
    name0,
    name1,
    date,
    matchCount,
    totalCount,
    ordinal,
  };

  // 引き抜き完了 → 手元（拡大）へ
  const completePull = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    draggingRef.current = false;
    setNudge(false);
    setDragY(0);
    setStage("hand");
  };

  // 券をドラッグ／スワイプで引き抜く（指に追従・60%で自動排出・タップでも可）
  const onPullDown = (e) => {
    if (stage !== "await" && stage !== "pulling") return; // 発券中は受け付けない
    if (idleRef.current) clearTimeout(idleRef.current);
    setNudge(false);
    if (reduced) { completePull(); return; } // reduced：追従せず1タップで完了
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
    if (dragY >= PULL_THRESHOLD || movedRef.current < 6) {
      completePull(); // 60%到達 or ほぼ動かさずタップ → 完了
    } else {
      setDragY(0); // 途中で放したら戻る
      setStage("await");
    }
  };

  // 手元の券：タップ／ドラッグでわずかに傾く（トップの食券と同じ挙動・最大5度）
  const onTiltDown = (e) => {
    if (reduced) return;
    setTiltSpring(false);
    tiltElRef.current = e.currentTarget;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    trackTilt(e.clientX);
  };
  const onTiltMove = (e) => {
    if (!tiltElRef.current) return;
    trackTilt(e.clientX);
  };
  const trackTilt = (clientX) => {
    const el = tiltElRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    setTilt(Math.max(-5, Math.min(5, ((clientX - cx) / (r.width / 2)) * 5)));
  };
  const onTiltUp = () => {
    if (!tiltElRef.current) return;
    tiltElRef.current = null;
    setTiltSpring(true);
    setTilt(0);
  };

  // 次の画面へ（手元でのみ）
  const goNext = () => onNext?.();

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

  const inSlot = stage === "dispense" || stage === "await" || stage === "pulling";
  // dispense はCSSアニメが transform を担うので inline は付けない。
  // await/pulling は指追従＋放したときの戻りを滑らかにする。
  const posStyle =
    stage === "pulling"
      ? { transform: `translateY(${dragY}px)`, transition: "none" }
      : stage === "await"
        ? { transform: `translateY(${dragY}px)`, transition: "transform .3s cubic-bezier(.2,.7,.3,1)" }
        : undefined;

  return (
    <div className={`mt-root mt-${stage}`} role="dialog" aria-label={`思い出の食券：${genre}`}>
      <style>{CSS}</style>

      {/* 券売機（デザインは変更しない）*/}
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
          <div className="mt-slot" aria-hidden />
          {inSlot && (
            <div
              className={`mt-small-pos ${stage !== "dispense" ? "grab" : ""} ${nudge ? "nudge" : ""} ${stage === "pulling" ? "grabbing" : ""}`}
              style={posStyle}
              onPointerDown={onPullDown}
              onPointerMove={onPullMove}
              onPointerUp={onPullUp}
              onPointerCancel={onPullUp}
            >
              <div className="mt-small-sway">
                <div className="mt-small">
                  <div className="mt-small-inner"><TicketFace {...faceProps} /></div>
                </div>
              </div>
            </div>
          )}
          {(stage === "await" || stage === "pulling") && (
            <div className="mt-pull-hint">引き抜いてください</div>
          )}
        </div>

        <div className="mt-tray" aria-hidden />
      </div>

      {/* 手元（拡大）：券売機を暗くして券だけに焦点。導線もここでだけ表示 */}
      {stage === "hand" && (
        <>
          <div className="mt-dim" aria-hidden />
          <div className="mt-hand">
            <div className="mt-hand-grow">
              <div
                className={`mt-hand-tilt ${tiltSpring ? "spring" : ""}`}
                style={{ transform: `rotate(${tilt}deg)` }}
                onPointerDown={onTiltDown}
                onPointerMove={onTiltMove}
                onPointerUp={onTiltUp}
                onPointerCancel={onTiltUp}
              >
                <TicketFace {...faceProps} />
              </div>
            </div>
          </div>

          <div className="mt-actions">
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
            <button className="mt-cta" onClick={goNext}>
              {ctaLabel} ↓
            </button>
          </div>
        </>
      )}

      {/* 保存用（画面外・正方形・券のみ）*/}
      <div className="mt-export" ref={exportRef} aria-hidden>
        <TicketFace {...faceProps} />
      </div>
    </div>
  );
}
