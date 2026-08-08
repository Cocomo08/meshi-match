"use client";

import { useEffect, useRef, useState } from "react";
import { playLike, playNope } from "@/components/sound";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1〜99 を漢数字に（残り枚数表示用）
function toKanjiNum(n) {
  const d = "〇一二三四五六七八九";
  if (n <= 0) return "〇";
  if (n < 10) return d[n];
  if (n < 20) return "十" + (n > 10 ? d[n - 10] : "");
  const t = Math.floor(n / 10), o = n % 10;
  return d[t] + "十" + (o ? d[o] : "");
}

// 剥がれ落ちる紙（退場演出・装飾）
const PEELS = [
  { left: "16%", delay: 0 },
  { left: "40%", delay: 0.05 },
  { left: "62%", delay: 0.02 },
  { left: "80%", delay: 0.08 },
];

// 残り枚数に応じた「後ろに重なる札」の枚数（＝残り札数の見た目一致）
//  残り10枚以上=3 / 5〜9=2 / 2〜4=1 / 最後(1)=0
function behindCountFor(remaining) {
  if (remaining >= 10) return 3;
  if (remaining >= 5) return 2;
  if (remaining >= 2) return 1;
  return 0;
}

// 大将の顔（頭部のみ・CookWait と同じ顔）。札の裏から覗くので、口から下は札に隠れ
//  目から上だけが札の上端から出る想定で配置する。表情は眉と口だけ差し替え。
function SwMaster({ expr }) {
  const yes = expr === "yes";
  const no = expr === "no";
  return (
    <svg viewBox="92 68 56 66" fill="none" aria-hidden>
      {/* ── 顔（CookWait と同一）── */}
      {/* 髪 */}
      <path d="M97,88 Q95,75 108,72 Q120,70 132,72 Q145,75 143,88 Q120,81 97,88 Z" fill="#2a2520" />
      {/* 耳 */}
      <path d="M98,102 Q93,105 97,112 Q99,108 100,104 Z" fill="#ecc9a0" />
      <path d="M142,102 Q147,105 143,112 Q141,108 140,104 Z" fill="#ecc9a0" />
      <path d="M97,105 q2,2 1,5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M143,105 q-2,2 -1,5" fill="none" stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" />
      {/* 肌 */}
      <path d="M99,88 C96,96 97,101 97,104 C97,110 99,113 100,116 C101,121 103,124 106,126 C110,129 116,131 120,131 C124,131 130,129 134,126 C137,124 139,121 140,116 C141,113 143,110 143,104 C143,101 144,96 141,88 C133,84 107,84 99,88 Z" fill="#ecc9a0" />
      {/* 影 */}
      <path d="M105,124 Q112,129.5 120,131 Q128,129.5 135,124 Q136,126 133,128 Q127,130.5 120,130 Q113,130.5 107,128 Q104,126 105,124 Z" fill="#d3a575" />
      {/* 顎の細い髭輪郭 */}
      <path d="M96.5,104 Q98,111 99,116 Q100.5,122 105,126 Q112,130.5 120,132 Q128,130.5 135,126 Q139.5,122 141,116 Q142,111 143.5,104 L142,104 Q140.5,111 139,116 Q137.5,121 134,124 Q127,128.5 120,129.6 Q113,128.5 106,124 Q102.5,121 101,116 Q99.5,111 98,104 Z" fill="#2a2520" />
      {/* 鉢巻 */}
      <path d="M96,86 Q120,77 144,86 L144,90 Q120,82 96,90 Z" fill="#d23a2c" />
      <path d="M96,90 Q120,82 144,90 L144,92.5 Q120,85 96,92.5 Z" fill="#a82418" />
      <path d="M143,86 l9,-3 l-2,5 l7,3 l-8,2 l1,-4 Z" fill="#d23a2c" />
      <path d="M143,89 l8,1 l-7,3 Z" fill="#a82418" />
      <path d="M104,85 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M118,83 q1,3 0,6" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M132,84 q1,3 0,5" fill="none" stroke="#a82418" strokeWidth="0.7" strokeLinecap="round" />
      {/* 眉（表情で変化）*/}
      {no ? (
        <>
          <path d="M103,96.5 Q110,93 118,91.5 Q111,95.5 103,96.5 Z" fill="#2a2520" />
          <path d="M122,91.5 Q130,93 137,96.5 Q130,94.5 122,91.5 Z" fill="#2a2520" />
        </>
      ) : yes ? (
        <>
          <path d="M103,94.5 Q110,89 118,91 Q111,95 103,94.5 Z" fill="#2a2520" />
          <path d="M122,91 Q130,89 137,92.5 Q130,94.3 122,91 Z" fill="#2a2520" />
        </>
      ) : (
        <>
          <path d="M103,96 Q110,90 118,92.5 Q111,96.5 103,96 Z" fill="#2a2520" />
          <path d="M122,92.5 Q130,90 137,94 Q130,95.8 122,92.5 Z" fill="#2a2520" />
        </>
      )}
      {/* 左目 */}
      <ellipse cx="111" cy="103.5" rx="3" ry="3.8" fill="#2a2520" />
      <path d="M118,100 Q111,100.4 104,104 Q110,103 117,101.6 Z" fill="#2a2520" />
      <circle cx="109.6" cy="102" r="1" fill="#f0e6d2" />
      <circle cx="112" cy="105.4" r="0.8" fill="#f0e6d2" opacity="0.5" />
      {/* 右目 */}
      <ellipse cx="129" cy="103.5" rx="3" ry="3.8" fill="#2a2520" />
      <path d="M122,100 Q129,100.4 136,104 Q130,103 123,101.6 Z" fill="#2a2520" />
      <circle cx="127.6" cy="102" r="1" fill="#f0e6d2" />
      <circle cx="130" cy="105.4" r="0.8" fill="#f0e6d2" opacity="0.5" />
      {/* 鼻 */}
      <path d="M120.4,103.5 Q118.7,108 120.1,110.2 Q121.4,111 122.6,110.1" fill="none" stroke="#2a2520" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="118.4" cy="110.1" r="0.7" fill="#2a2520" />
      {/* 頬 */}
      <path d="M101,110 Q105,107.5 109,110 Q106,113.5 105,113.5 Q102,113.5 101,110 Z" fill="#e58a72" />
      <path d="M131,110 Q135,107.5 139,110 Q136,113.5 135,113.5 Q132,113.5 131,110 Z" fill="#e58a72" />
      {/* 口（表情で変化）*/}
      {yes ? (
        <path d="M109,116.5 Q120,124 131,116.5 Q120,120.6 109,116.5 Z" fill="#2a2520" />
      ) : no ? (
        <path d="M112,120 Q120,117 128,120 Q120,119.2 112,120 Z" fill="#2a2520" />
      ) : (
        <path d="M111,117 Q120,122 129,117 Q120,119.4 111,117 Z" fill="#2a2520" />
      )}
      {/* 笑い皺 */}
      <path d="M102.4,105.4 q-2,2.5 -1,4.6" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M103.6,106.8 q-1.8,1.7 -0.8,3.2" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M137.6,105.4 q2,2.5 1,4.6" fill="none" stroke="#2a2520" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M136.4,106.8 q1.8,1.7 0.8,3.2" fill="none" stroke="#2a2520" strokeWidth="0.7" strokeLinecap="round" />
      {/* 眼鏡 */}
      <path d="M104,102.6 Q101,101.4 98.6,101.7" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M136,102.6 Q139,101.4 141.4,101.7" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="111" cy="103" rx="7" ry="5.8" fill="none" stroke="#2a2520" strokeWidth="1.3" />
      <ellipse cx="129" cy="103" rx="7" ry="5.8" fill="none" stroke="#2a2520" strokeWidth="1.3" />
      <path d="M118,102 Q120,99.8 122,102" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M106.2,100.6 L108.6,98.4" fill="none" stroke="#f0e6d2" strokeWidth="1" strokeLinecap="round" />
      <path d="M124.2,100.6 L126.6,98.4" fill="none" stroke="#f0e6d2" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// 大将の手（札の上端を掴んで引き下げる形）。手の甲がこちら向き、指を揃えて軽く曲げ、
//  札の手前側に第一〜第二関節まで回り込ませる（手のひら全体は見せない／親指は札裏で不可視）。
//  ※手首から先だけを描き、根元は札の上端に隠れて腕とつながって見せる。
function SwHand({ x, y = 0, rot = 0, flip }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} 1)`}>
      {/* 手の甲（縁の上・こちら向き。上端は札/顔に隠れる）*/}
      <path d="M-11 -2 Q0 -5 11 -2 L10 7 Q0 9 -10 7 Z" fill="#ecc9a0" stroke="#2a2520" strokeWidth="1.1" strokeLinejoin="round" />
      {/* 指4本（揃えて軽く曲げ、縁に回り込む・第二関節まで）*/}
      <g fill="#ecc9a0" stroke="#2a2520" strokeWidth="0.9" strokeLinejoin="round">
        <path d="M-9.5 6 q-0.4 7 1.2 8.6 q1.8 -0.2 1.6 -3.4 l-0.1 -5.2 Z" />
        <path d="M-4.4 7 q-0.4 8 1.2 9.4 q1.8 -0.2 1.6 -3.6 l-0.1 -5.8 Z" />
        <path d="M0.8 7 q-0.4 8 1.2 9.4 q1.8 -0.2 1.6 -3.6 l-0.1 -5.8 Z" />
        <path d="M6 6 q-0.4 7 1.2 8.6 q1.8 -0.2 1.6 -3.4 l-0.1 -5.2 Z" />
      </g>
      {/* 関節の陰（1段）*/}
      <path d="M-10 5.5 Q0 8.5 10 5.5 Q10 8 0 8.6 Q-10 8 -10 5.5 Z" fill="#d3a575" opacity=".85" />
    </g>
  );
}
function SwHands() {
  return (
    <svg viewBox="0 0 74 30" fill="none" aria-hidden>
      {/* 左右は鏡像にせず、高さと角度をわずかに変える */}
      <SwHand x={19} y={4} rot={-6} />
      <SwHand x={55} y={1} rot={7} flip />
    </svg>
  );
}

// カードの山をスワイプで消化する共通コンポーネント。
//  右＝「頼む」／左＝「見送り」。矢印キー対応。連打ロック。
//  stack=true（短冊）：束の厚み・ピンから引っ張られる手応え・頼む＝右上へ飛ぶ／見送り＝裏返り左下へ。
export function SwipeDeck({
  cards,
  renderCard,
  onFinish,
  likeLabel = "頼む",
  nopeLabel = "見送り",
  stampYes = "頼む",
  stampNo = "またこんど",
  loop = false,
  controls = true,
  stack = false,
  pinColorFor = null,
  heightClass = "h-[60vh] max-h-[560px] min-h-[400px]",
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null); // { dir, sx, sy, srot }
  const [burst, setBurst] = useState(0);
  const [pressed, setPressed] = useState(false); // 頼む：朱色の丸印を押す（stack）
  const [focusSide, setFocusSide] = useState(null); // reduced-motion：ボタンフォーカスで文字表示
  const [screenW, setScreenW] = useState(0);
  const [phase, setPhase] = useState(stack ? "intro" : "live"); // intro | live | outro
  const likedRef = useRef([]);
  const startRef = useRef(null);
  const lockRef = useRef(false);
  const hapticRef = useRef(false); // このドラッグで判定振動を1度だけ

  const isRed = prefersReducedMotion();
  const current = cards[index];
  const remaining = cards.length - index;

  // 画面幅（判定しきい値＝25%）
  useEffect(() => {
    const upd = () => setScreenW(window.innerWidth);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);
  const threshold = (screenW || 390) * 0.25;

  // 入場ロック解除（降下0.6s／reduced-motionは即）
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("live"), isRed ? 200 : 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const afterLeave = () => {
    setLeaving(null);
    setPressed(false);
    setDrag({ x: 0, y: 0, active: false });
    lockRef.current = false;
    if (index + 1 >= cards.length) {
      if (loop) setIndex(0);
      else if (stack) {
        setPhase("outro");
        setTimeout(() => onFinish(likedRef.current), isRed ? 250 : 500);
      } else {
        onFinish(likedRef.current);
      }
    } else {
      setIndex(index + 1);
    }
  };
  const afterLeaveRef = useRef(afterLeave);
  afterLeaveRef.current = afterLeave;

  const commit = (liked) => {
    if (!current || phase !== "live" || lockRef.current) return;
    lockRef.current = true;
    const sx = drag.x, sy = drag.y * 0.25, srot = drag.x / 14;
    if (liked) { likedRef.current.push(current.id); playLike(); } else { playNope(); }

    const fly = () => {
      setLeaving({ dir: liked ? 1 : -1, sx, sy, srot });
      const dur = isRed ? 250 : stack ? (liked ? 450 : 500) : liked ? 350 : 500;
      setTimeout(() => afterLeaveRef.current(), dur);
    };

    if (liked && stack) {
      // 朱色の丸印を押す（0.15s／reduced-motionは静止表示）→ 飛ぶ
      setPressed(true);
      if (isRed) fly();
      else setTimeout(fly, 150);
    } else {
      if (liked && !stack) setBurst((b) => b + 1); // 店スワイプはハート
      fly();
    }
  };

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); commitRef.current(true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); commitRef.current(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e) => {
    if (phase !== "live" || leaving || lockRef.current) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    hapticRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!startRef.current || leaving) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // 判定に届いた瞬間、一度だけ短い振動（対応端末のみ・iOSは無反応でも成立）
    if (!hapticRef.current && Math.abs(dx) >= threshold) {
      hapticRef.current = true;
      if (!isRed && typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(8); } catch { /* noop */ }
      }
    }
    setDrag({ x: dx, y: dy, active: true });
  };
  const onPointerUp = () => {
    if (!startRef.current || leaving) return;
    const dx = drag.x;
    startRef.current = null;
    if (Math.abs(dx) > threshold) commit(dx > 0);
    else setDrag({ x: 0, y: 0, active: false });
  };

  if (!current) return null;

  const dragRot = drag.x / 14;
  // 文字の濃さ：移動20pxで出現→80pxで完全（reduced-motionはボタンフォーカスで表示）
  const labelOp = (v) => Math.min(Math.max((v - 20) / 60, 0), 1);
  const yesOp = isRed
    ? (focusSide === "yes" ? 1 : 0)
    : leaving ? (leaving.dir > 0 ? 1 : 0) : labelOp(drag.x);
  const noOp = isRed
    ? (focusSide === "no" ? 1 : 0)
    : leaving ? (leaving.dir < 0 ? 1 : 0) : labelOp(-drag.x);
  const progress = Math.min(Math.abs(drag.x) / (threshold * 1.1), 1);
  const nextScale = 0.92 + 0.08 * progress;
  const nextOpacity = 0.55 + 0.45 * progress;

  const leaveClass = leaving
    ? isRed
      ? "sd-leave-fade"
      : stack
        ? leaving.dir > 0 ? "sd-order-up" : "sd-decline-flip"
        : leaving.dir > 0 ? "sd-leave-order" : "sd-leave-decline"
    : "";

  // 入場の降下ラッパ（短冊のみ・マウント時1回）
  const drop = (node, delay, rot) =>
    stack ? (
      <div className="sd-drop" style={{ animationDelay: `${delay}s`, "--dropRot": rot }}>{node}</div>
    ) : (
      node
    );

  // 束の厚み（後ろに重なる札・残り枚数と一致）※stack時のみ構築（store等の無駄な再描画を防ぐ）
  const behindCount = stack ? behindCountFor(remaining) : 0;
  const behindNodes = [];
  for (let k = Math.min(behindCount, cards.length - 1 - index); k >= 1; k--) {
    const c = cards[index + k] ?? (loop ? cards[(index + k) % cards.length] : undefined);
    if (!c) continue;
    const base = { x: k * 4, y: k * 8, b: 1 - k * 0.15 };
    const go = { x: (k - 1) * 4, y: (k - 1) * 8, b: 1 - (k - 1) * 0.15 };
    behindNodes.push(
      <div
        key={c.id ?? k}
        className={`sd-behind absolute inset-0 ${leaving ? "go" : ""}`}
        style={{
          transform: `translate(${leaving ? go.x : base.x}px, ${leaving ? go.y : base.y}px)`,
          filter: `brightness(${leaving ? go.b : base.b})`,
          zIndex: 10 - k,
        }}
      >
        {drop(renderCard(c), 0.05 * k, k % 2 ? "5deg" : "-6deg")}
      </div>
    );
  }

  const next = cards[index + 1] ?? (loop ? cards[0] : undefined);

  // 大将の表情（スワイプ判定に連動）：頼む=yes／見送り=no／通常=idle
  const masterExpr = leaving
    ? leaving.dir > 0 ? "yes" : "no"
    : drag.x > 26 ? "yes" : drag.x < -26 ? "no" : "idle";
  // 顔の動き（reduced-motionでは動かさず表情のみ）：
  //  スワイプ中=傾ける／頼む確定=大きく顔を出す／見送り確定=札の裏に引っ込む
  let masterFig = "";
  if (!isRed) {
    if (leaving && masterExpr === "yes") masterFig = "translateY(-9px)";
    else if (leaving && masterExpr === "no") masterFig = "translateY(20px)";
    else if (drag.x) masterFig = `rotate(${Math.max(-7, Math.min(7, drag.x / 16))}deg)`;
  }

  return (
    <>
      {burst > 0 && (
        <div key={burst} aria-hidden className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="heart-pop text-8xl drop-shadow-lg">❤️</span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex w-full flex-col items-center">
        {controls && <p className="sd-count mb-4 text-sm font-black">のこり{toKanjiNum(remaining)}枚</p>}

        <div className={`relative w-full max-w-sm select-none ${heightClass}`} style={{ opacity: phase === "outro" ? 0 : 1 }}>
          {/* 大将の顔（札より奥・わずかに暗い／目から上だけ札の上端から覗く）*/}
          {stack && (
            <div className="sw-master" data-expr={masterExpr} aria-hidden>
              <div className="sw-master-fig" style={{ transform: masterFig || undefined }}>
                <SwMaster expr={masterExpr} />
              </div>
            </div>
          )}
          {stack ? (
            behindNodes
          ) : (
            next && (
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${nextScale}) translateY(${(1 - progress) * 12}px)`,
                  opacity: nextOpacity,
                  transition: drag.active && !leaving ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
                }}
              >
                {renderCard(next)}
              </div>
            )
          )}

          <div
            className={`absolute inset-0 cursor-grab touch-none active:cursor-grabbing ${leaveClass}`}
            style={
              leaving
                ? { "--sx": `${leaving.sx}px`, "--sy": `${leaving.sy}px`, "--srot": `${leaving.srot}deg`, zIndex: 15 }
                : {
                    transform: isRed
                      ? "none"
                      : `translate(${drag.x}px, ${drag.y * 0.25}px) rotate(${dragRot}deg) scale(${1 + progress * 0.03})`,
                    transformOrigin: stack ? "50% 8%" : "center",
                    filter: isRed ? "none" : `drop-shadow(0 ${8 + progress * 18}px ${6 + progress * 13}px rgba(0,0,0,${0.34 + progress * 0.3}))`,
                    transition: drag.active ? "none" : "transform 0.25s ease-out",
                    zIndex: 15,
                  }
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {drop(renderCard(current), 0.1, "-3deg")}
            <span className="sd-stamp yes" aria-hidden style={{ opacity: yesOp }}>{stampYes}</span>
            <span className="sd-stamp no" aria-hidden style={{ opacity: noOp }}>{stampNo}</span>
            {/* 頼む：朱色の丸印（押印）*/}
            {pressed && <span className={`sd-press ${isRed ? "still" : ""}`} aria-hidden />}
          </div>

          {/* 大将が札の上端に落とす影（札より手前・指より奥）*/}
          {stack && <div className="sw-mshadow" data-expr={masterExpr} aria-hidden />}
          {/* 大将の指（札の上端を掴む・札より手前）*/}
          {stack && (
            <div className="sw-hands" data-expr={masterExpr} aria-hidden>
              <SwHands />
            </div>
          )}
        </div>

        {controls ? (
          <>
            <div className="mt-6 flex items-center gap-5">
              <button
                type="button"
                onClick={() => commit(false)}
                disabled={phase !== "live"}
                className="sd-tag no"
                onFocus={() => setFocusSide("no")}
                onBlur={() => setFocusSide((s) => (s === "no" ? null : s))}
                onPointerEnter={() => isRed && setFocusSide("no")}
                onPointerLeave={() => isRed && setFocusSide((s) => (s === "no" ? null : s))}
              >
                {nopeLabel}
              </button>
              <button
                type="button"
                onClick={() => commit(true)}
                disabled={phase !== "live"}
                className="sd-tag yes"
                onFocus={() => setFocusSide("yes")}
                onBlur={() => setFocusSide((s) => (s === "yes" ? null : s))}
                onPointerEnter={() => isRed && setFocusSide("yes")}
                onPointerLeave={() => isRed && setFocusSide((s) => (s === "yes" ? null : s))}
              >
                {likeLabel}
              </button>
            </div>
            <p className="sd-hint mt-4 text-xs font-bold">左右にスワイプして選ぶ</p>
          </>
        ) : (
          <p className="sd-hint mt-5 text-xs font-bold">スワイプして試してみて</p>
        )}
      </div>

      {/* 退場：紙が剥がれて暗転 */}
      {phase === "outro" && (
        <div className="sd-outro" aria-hidden>
          {PEELS.map((p, i) => (
            <div key={i} className="sd-peel" style={{ left: p.left, animationDelay: `${p.delay}s` }} />
          ))}
        </div>
      )}
    </>
  );
}
