"use client";

import { useEffect, useRef, useState } from "react";
import { SwMaster } from "./SwipeDeck";

// マッチ成立画面（夜の屋台テーマで統一）
//  成立したジャンルを短冊で扇状に並べ、大将が唸ってから一枚を選び差し出す。
//  ・世界観：板壁と提灯（背景は呼び出し元の StallWall）／墨一色の線画／生成りの紙
//  ・グラデーションは提灯の光のみ・絵文字なし・画像なし（CSS/SVG）

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 大将のセリフ（選定根拠に対応。根拠と違うセリフは出さない）
const REASON_LINE = {
  earliest: "二人とも真っ先に選んだからな",
  fast: "二人とも即決だったぞ",
  random: "どれも捨てがたいが、今日はこれだ",
};

// 成立ジャンルから一枚を選ぶ（乱数だけで選ばない・両端末で同じ結果になるよう純粋関数）
//  ids は canonical 順（両端末で同一）。likes は各自のスワイプ順、meta[id].sec は所要秒。
export function chooseMatch({ ids, likesH = [], likesG = [], metaH = {}, metaG = {}, seed = 0 }) {
  if (!ids || ids.length === 0) return null;
  if (ids.length === 1) return { id: ids[0], reason: "earliest" };
  const seq = (id, likes) => {
    const i = likes.indexOf(id);
    return i < 0 ? 999 : i; // 0始まり＝真っ先に選んだ順
  };
  const cseq = (id) => seq(id, likesH) + seq(id, likesG);
  const ctime = (id) => (metaH[id]?.sec ?? 9) + (metaG[id]?.sec ?? 9);

  // 1) 二人とも早い順番で「頼む」を選んだもの（合算の選択順が最小）
  const minSeq = Math.min(...ids.map(cseq));
  const cand1 = ids.filter((id) => cseq(id) === minSeq);
  if (cand1.length === 1) return { id: cand1[0], reason: "earliest" };

  // 2) その中で二人とも判断が速かったもの（合算の所要秒が最小）
  const minTime = Math.min(...cand1.map(ctime));
  const cand2 = cand1.filter((id) => Math.abs(ctime(id) - minTime) < 0.05);
  if (cand2.length === 1) return { id: cand2[0], reason: "fast" };

  // 3) 同点はその中からランダム（共有 seed で決定＝両端末で一致）
  const h = cand2.reduce((a, s) => (a * 31 + String(s).charCodeAt(0)) >>> 0, seed >>> 0);
  return { id: cand2[h % cand2.length], reason: "random" };
}

const CSS = `
.mr { display:flex; flex-direction:column; align-items:center; width:100%; gap:14px;
  color:#f0e6d2; font-family: var(--font-zen-maru), sans-serif; }

/* 見出し：木札の意匠（生成りの札に墨字・上に画鋲・提灯の光をわずかに受ける）*/
.mr-head { position:relative; }
.mr-kifuda { position:relative; background:#efe3c3; color:#2a2520; border-radius:3px 3px 5px 5px;
  padding:9px 30px 8px; font-weight:900; letter-spacing:.14em; font-size:19px;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 12px 12px -11px rgba(255,201,140,.55),
    inset 0 -10px 10px -9px rgba(60,40,20,.4), 0 6px 12px -4px rgba(0,0,0,.5); }
.mr-kifuda::before { content:""; position:absolute; left:50%; top:-5px; width:11px; height:11px; transform:translateX(-50%);
  border-radius:50%; background:#e0483b; border:1px solid #9e1b14;
  box-shadow: inset 0 1.5px 1.5px rgba(255,255,255,.55), inset 0 -2px 2px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.4); }
.mr-sub { margin-top:9px; font-size:12.5px; font-weight:800; letter-spacing:.06em; color:#f0e6d2; opacity:.82; text-align:center; }

/* 舞台：大将＋扇状の短冊 */
.mr-stage { position:relative; width:100%; max-width:360px; height:346px; margin-top:2px; }

/* 大将（唸る→差し出す）*/
.mr-master { position:absolute; left:50%; top:-10px; width:130px; margin-left:-65px; z-index:30;
  opacity:0; transform:translateY(10px); transition:opacity .5s ease, transform .5s ease; pointer-events:none; }
.mr[data-phase="think"] .mr-master,
.mr[data-phase="pick"] .mr-master,
.mr[data-phase="speak1"] .mr-master,
.mr[data-phase="speak2"] .mr-master,
.mr[data-phase="done"] .mr-master { opacity:1; transform:translateY(0); }
.mr-body { width:100%; display:block; filter: drop-shadow(0 8px 12px rgba(0,0,0,.5)); }
.mr-face { position:absolute; left:50%; top:-2px; width:74px; margin-left:-37px; z-index:2; }
.mr-face svg { width:100%; display:block; }
/* 唸り：小刻みに左右へ・眉間に力（think の間だけ）*/
.mr[data-phase="think"] .mr-master { animation: mrGroan 1s ease-in-out infinite; }
@keyframes mrGroan { 0%,100%{ transform:translate(-1px,0) rotate(-1deg);} 50%{ transform:translate(1px,0) rotate(1deg);} }
/* 腕の出し分け：通常＝腕組み／pick 以降＝差し出す腕 */
.mr-arm-cross, .mr-arm-give { transition: opacity .3s ease; }
.mr-arm-give { opacity:0; }
.mr[data-phase="pick"] .mr-arm-cross,
.mr[data-phase="speak1"] .mr-arm-cross,
.mr[data-phase="speak2"] .mr-arm-cross,
.mr[data-phase="done"] .mr-arm-cross { opacity:0; }
.mr[data-phase="pick"] .mr-arm-give,
.mr[data-phase="speak1"] .mr-arm-give,
.mr[data-phase="speak2"] .mr-arm-give,
.mr[data-phase="done"] .mr-arm-give { opacity:1; }

/* 唸りの気配（think の間だけ・墨の点）*/
.mr-mumble { position:absolute; left:calc(50% + 46px); top:2px; z-index:31; display:flex; gap:4px;
  opacity:0; transition:opacity .3s ease; }
.mr[data-phase="think"] .mr-mumble { opacity:1; }
.mr-mumble i { width:5px; height:5px; border-radius:50%; background:#f0e6d2; opacity:.5; animation: mrDot 1.2s ease-in-out infinite; }
.mr-mumble i:nth-child(2){ animation-delay:.2s; } .mr-mumble i:nth-child(3){ animation-delay:.4s; }
@keyframes mrDot { 0%,100%{ opacity:.2; transform:translateY(0);} 50%{ opacity:.7; transform:translateY(-3px);} }

/* 扇状の短冊 */
.mr-fan { position:absolute; inset:0; z-index:10; }
.mr-fuda { position:absolute; left:50%; top:112px; width:73px; height:190px; margin-left:-36.5px;
  transform-origin:50% 50%; transition: transform .4s cubic-bezier(.2,.7,.2,1), opacity .2s ease, filter .2s ease;
  will-change: transform, opacity, filter; }
.mr-fuda.selected { z-index:20; }
.mr-fuda.dim { opacity:.42; filter: brightness(.66) blur(.4px); }
.mr-paper { position:relative; width:100%; height:100%; color:#2a2520; border-radius:3px 3px 7px 7px; overflow:hidden;
  background-color:#efe3c3;
  background-image:
    radial-gradient(circle at 24% 14%, rgba(150,120,40,.07), transparent 9%),
    radial-gradient(circle at 70% 22%, rgba(160,130,50,.06), transparent 8%),
    radial-gradient(circle at 42% 46%, rgba(150,120,40,.05), transparent 10%),
    radial-gradient(circle at 80% 66%, rgba(140,110,40,.055), transparent 8%),
    radial-gradient(circle at 22% 80%, rgba(160,130,50,.05), transparent 9%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 10px 12px -10px rgba(255,201,140,.5),
    inset 0 -12px 12px -10px rgba(60,40,20,.4), 3px 7px 12px -5px rgba(0,0,0,.4);
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:12% 0 8%; gap:4%; }
.mr-pin { position:absolute; top:-7px; left:50%; transform:translateX(-50%); width:15px; height:15px; border-radius:50%;
  background:#e0483b; border:1px solid #9e1b14; z-index:2;
  box-shadow: inset 0 2px 2px rgba(255,255,255,.55), inset 0 -3px 3px rgba(0,0,0,.35), 0 2px 3px rgba(0,0,0,.4); }
.mr-fuda .tz-art { flex:0 0 auto; width:60%; aspect-ratio:80/60; display:block; }
.mr-name { writing-mode:vertical-rl; text-orientation:upright;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; font-weight:600;
  font-size: clamp(19px, 6vw, 27px); line-height:1.16; letter-spacing:.03em; color:#2a2520;
  -webkit-text-stroke:.5px #2a2520; max-height:60%; }

/* 選ばれた札：手前に強い落ち影（拡大の transform はインラインで付与）*/
.mr[data-phase="pick"] .mr-fuda.selected,
.mr[data-phase="speak1"] .mr-fuda.selected,
.mr[data-phase="speak2"] .mr-fuda.selected,
.mr[data-phase="done"] .mr-fuda.selected { filter: drop-shadow(0 14px 18px rgba(0,0,0,.5)); }

/* セリフ（木札／墨字）*/
.mr-speech { min-height:52px; display:flex; flex-direction:column; align-items:center; gap:6px; }
.mr-line { background:#efe3c3; color:#2a2520; border-radius:3px; padding:7px 18px; font-weight:900; font-size:15px;
  letter-spacing:.03em; font-family: var(--font-klee), var(--font-zen-maru), sans-serif;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d, 0 3px 8px -3px rgba(0,0,0,.5);
  opacity:0; transform:translateY(4px); transition:opacity .35s ease, transform .35s ease; }
.mr-line.show { opacity:1; transform:none; }
.mr-line.reason { background:transparent; box-shadow:none; color:#f0e6d2; opacity:0; font-size:13px; font-weight:800;
  letter-spacing:.04em; padding:2px 8px; }
.mr-line.reason.show { opacity:.9; }

/* 導線：この店へ（1つだけ）＋ 控えめな副導線 */
.mr-cta { display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:300px;
  opacity:0; transform:translateY(6px); transition:opacity .4s ease, transform .4s ease; }
.mr[data-phase="done"] .mr-cta { opacity:1; transform:none; }
.mr-go { width:100%; border:none; border-radius:5px; padding:14px 20px; cursor:pointer;
  font-family: var(--font-klee), var(--font-zen-maru), sans-serif; font-weight:900; font-size:16px; letter-spacing:.1em;
  color:#2a2520; background:#efe3c3;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -2px 0 #b0a37d, 0 6px 0 -1px #b0864b, 0 10px 16px -6px rgba(0,0,0,.5); }
.mr-go:active { transform:translateY(4px); box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d, 0 2px 0 -1px #b0864b; }
.mr-more { background:none; border:none; cursor:pointer; color:#f0e6d2; opacity:.7; font-size:12.5px; font-weight:700;
  letter-spacing:.05em; text-decoration:underline; text-underline-offset:3px; font-family:var(--font-zen-maru),sans-serif; }
.mr-more:active { opacity:1; }
.mr-others { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; width:100%; }
.mr-chip { background:#efe3c3; color:#2a2520; border:1px solid #cabf9d; border-radius:3px; padding:6px 12px;
  font-family:var(--font-klee),var(--font-zen-maru),sans-serif; font-weight:800; font-size:13px; cursor:pointer;
  box-shadow: inset 0 1px 0 #fffdf5; }
.mr-chip:active { transform:translateY(1px); }
.mr-foot { display:flex; gap:18px; margin-top:2px; }
.mr-foot button { background:none; border:none; cursor:pointer; color:#f0e6d2; opacity:.55; font-size:12px; font-weight:700;
  letter-spacing:.05em; font-family:var(--font-zen-maru),sans-serif; }
.mr-foot button:active { opacity:.9; }

@media (prefers-reduced-motion: reduce) {
  .mr-master, .mr-fuda, .mr-line, .mr-cta, .mr-arm-cross, .mr-arm-give { transition:none !important; animation:none !important; }
  .mr[data-phase="think"] .mr-master { animation:none; }
  .mr-mumble i { animation:none; }
}
`;

// 大将の胴と腕（法被・墨線）。腕組み／差し出しの2状態を重ねて opacity で切替。
function MasterBody() {
  return (
    <svg className="mr-body" viewBox="0 0 160 132" fill="none" aria-hidden>
      {/* 法被（藍）*/}
      <path d="M40 90 Q80 78 120 90 L130 132 L30 132 Z" fill="#223a58" stroke="#16283d" strokeWidth="2" strokeLinejoin="round" />
      {/* 襟 */}
      <path d="M70 86 L80 112 L90 86 Z" fill="#e9ddc4" />
      {/* 帯 */}
      <rect x="36" y="116" width="88" height="9" rx="1" fill="#7a1f16" />

      {/* ── 腕組み（think）── */}
      <g className="mr-arm-cross">
        <path d="M52 96 Q76 104 104 112" stroke="#223a58" strokeWidth="15" fill="none" strokeLinecap="round" />
        <path d="M108 96 Q84 104 56 112" stroke="#223a58" strokeWidth="15" fill="none" strokeLinecap="round" />
        <path d="M52 96 Q76 104 104 112" stroke="#16283d" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".6" />
        {/* 手（袖口から覗く）*/}
        <ellipse cx="106" cy="112" rx="7" ry="6" fill="#ecc9a0" stroke="#b98a5e" strokeWidth="1" />
        <ellipse cx="54" cy="112" rx="7" ry="6" fill="#ecc9a0" stroke="#b98a5e" strokeWidth="1" />
      </g>

      {/* ── 差し出す腕（pick 以降・片腕を上げて手のひらで札を支える）── */}
      <g className="mr-arm-give">
        {/* 休めている左腕 */}
        <path d="M50 96 Q46 110 52 122" stroke="#223a58" strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* 差し出す右腕（肩→前へ）*/}
        <path d="M110 94 Q98 100 84 104" stroke="#223a58" strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* 手のひら（上向き・指を数本）*/}
        <path d="M86 100 Q74 100 70 108 Q74 114 84 112 Q92 110 92 104 Q90 100 86 100 Z" fill="#ecc9a0" stroke="#b98a5e" strokeWidth="1" />
        <path d="M72 104 q-2 -3 1 -5 M76 102 q-1 -3 2 -5 M81 101.5 q0 -3 3 -4" stroke="#b98a5e" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function MatchReveal({
  ids = [],
  selectedId,
  reasonKey = "earliest",
  getGenre,
  renderArt,
  onDecide,
  onReplay,
  onLeave,
}) {
  const isRed = useRef(reduced());
  const [phase, setPhase] = useState("fan"); // fan → think → pick → speak1 → speak2 → done
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    const red = isRed.current;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    if (red) {
      // reduced：扇の展開/拡大/退場はフェード。唸りは0.5秒だけ残す。結果は静止で確実に読める
      at(150, () => setPhase("think"));
      at(650, () => setPhase("pick"));
      at(700, () => setPhase("speak1"));
      at(1000, () => setPhase("speak2"));
      at(1200, () => setPhase("done"));
    } else {
      at(700, () => setPhase("think")); // 札が並び終える
      at(2700, () => setPhase("pick")); // 唸りの間 2.0秒（短縮しない）
      at(3100, () => setPhase("speak1")); // 差し出し 0.4秒 → セリフ
      at(3600, () => setPhase("speak2")); // 0.5秒後に理由
      at(4000, () => setPhase("done"));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const picked = phase === "pick" || phase === "speak1" || phase === "speak2" || phase === "done";
  const others = ids.filter((id) => id !== selectedId);

  // 扇状の配置：中央を軸に横へ広げつつ弧を描く。
  //  枚数が多いほど横の間隔を詰めて（重なりを深く）全体を画面内に収める。
  //  各札の名前が読めるよう、間隔は名前の列が覗く幅を確保する。
  const n = ids.length;
  const dx = n <= 1 ? 0 : Math.min(56, 250 / (n - 1)); // 横の間隔(px)
  const da = n <= 1 ? 0 : Math.min(7, 42 / (n - 1)); // 傾き(度)
  const mid = (n - 1) / 2;
  const fanTransform = (i) => {
    const off = i - mid;
    return `translateX(${off * dx}px) translateY(${Math.abs(off) * 7}px) rotate(${off * da}deg)`;
  };
  const fudaTransform = (i, isSel) => {
    if (isSel && picked) return "translateY(-6px) scale(1.16) rotate(0deg)"; // 選ばれた札：正面へ拡大
    if (picked && !isSel) return `${fanTransform(i)} scale(.82) translateY(16px)`; // 他：後方へ下がる
    return fanTransform(i);
  };

  return (
    <div className="mr" data-phase={phase}>
      <style>{CSS}</style>

      <div className="mr-head">
        <div className="mr-kifuda">マッチ成立</div>
      </div>
      <p className="mr-sub">
        {n > 1 ? "大将が今日の一杯を選ぶ" : "大将が今日の一杯を差し出す"}
      </p>

      <div className="mr-stage">
        {/* 大将（唸る→差し出す）*/}
        <div className="mr-master">
          <MasterBody />
          <div className="mr-face">
            <SwMaster expr={picked ? "yes" : "idle"} />
          </div>
        </div>
        <div className="mr-mumble" aria-hidden><i /><i /><i /></div>

        {/* 扇状の短冊 */}
        <div className="mr-fan">
          {ids.map((id, i) => {
            const g = getGenre?.(id);
            const isSel = id === selectedId;
            const dimmed = picked && !isSel;
            const cls = `mr-fuda${isSel ? " selected" : ""}${dimmed ? " dim" : ""}`;
            return (
              <div
                key={id}
                className={cls}
                style={{
                  transform: fudaTransform(i, isSel),
                  opacity: phase === "fan" && isRed.current ? 0 : undefined,
                  zIndex: isSel ? 20 : 10 + Math.round(n - Math.abs(i - mid)),
                }}
              >
                <div className="mr-paper">
                  <span className="mr-pin" aria-hidden />
                  {renderArt ? renderArt(id) : null}
                  <span className="mr-name">{g?.label || id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* セリフ */}
      <div className="mr-speech">
        <div className={`mr-line${phase === "speak1" || phase === "speak2" || phase === "done" ? " show" : ""}`}>
          今日はこれだろう
        </div>
        <div className={`mr-line reason${phase === "speak2" || phase === "done" ? " show" : ""}`}>
          「{REASON_LINE[reasonKey] || REASON_LINE.earliest}」
        </div>
      </div>

      {/* 導線 */}
      <div className="mr-cta">
        <button type="button" className="mr-go" onClick={() => onDecide?.(selectedId)}>
          {getGenre?.(selectedId)?.label} の店へ
        </button>

        {others.length > 0 &&
          (showOthers ? (
            <div className="mr-others">
              {others.map((id) => (
                <button key={id} type="button" className="mr-chip" onClick={() => onDecide?.(id)}>
                  {getGenre?.(id)?.label}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="mr-more" onClick={() => setShowOthers(true)}>
              他のジャンルも見る
            </button>
          ))}

        <div className="mr-foot">
          <button type="button" onClick={onReplay}>もう一回</button>
          <button type="button" onClick={onLeave}>部屋を出る</button>
        </div>
      </div>
    </div>
  );
}
