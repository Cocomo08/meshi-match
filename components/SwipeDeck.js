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

// 大将の小さな胸像（スワイプ判定で表情が変わる・線画／札より奥・弱いぼかし）
//  yes=頼む(満足そうにうなずく) / no=見送り(少し残念) / idle=腕を組んで見ている
function SwMaster({ expr }) {
  const yes = expr === "yes";
  const no = expr === "no";
  return (
    <svg viewBox="0 0 80 94" fill="none" aria-hidden>
      {/* 法被（肩）*/}
      <path d="M12 80 Q40 66 68 80 L72 94 L8 94 Z" fill="#223a58" stroke="#16283d" strokeWidth="1.5" strokeLinejoin="round" />
      {/* 襟 */}
      <path d="M34 74 L40 88 L46 74 Z" fill="#e9ddc4" />
      {/* 腕組み（袖・胸の前でクロス）*/}
      <path d="M22 82 L50 93" stroke="#26456a" strokeWidth="9" strokeLinecap="round" />
      <path d="M58 82 L30 93" stroke="#223a58" strokeWidth="9" strokeLinecap="round" />
      {/* 首 */}
      <rect x="35.5" y="59" width="9" height="10" fill="#ecc9a0" />
      {/* 顔 */}
      <ellipse cx="40" cy="38" rx="19" ry="20" fill="#ecc9a0" stroke="#2a2520" strokeWidth="1.4" />
      {/* 顎の細い髭輪郭 */}
      <path d="M26 44 Q28 54 40 57 Q52 54 54 44" fill="none" stroke="#2a2520" strokeWidth="1.3" strokeLinecap="round" />
      {/* 鉢巻＋結び目 */}
      <path d="M22 26 Q40 18 58 26 L58 31 Q40 24 22 31 Z" fill="#d23a2c" />
      <path d="M57 27 l8 -3 l-2 5 l6 2 l-7 2 l1 -4 Z" fill="#d23a2c" />
      {/* 眉 */}
      {no ? (
        <>
          <path d="M28 31 L36 35" stroke="#2a2520" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M52 31 L44 35" stroke="#2a2520" strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M28 33 Q32 30 37 32" stroke="#2a2520" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M43 32 Q48 30 52 33" stroke="#2a2520" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* 目 */}
      {yes ? (
        <>
          <path d="M30 40 Q34 37 38 40" stroke="#2a2520" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M42 40 Q46 37 50 40" stroke="#2a2520" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="34" cy="40" r="2.1" fill="#2a2520" />
          <circle cx="46" cy="40" r="2.1" fill="#2a2520" />
        </>
      )}
      {/* 鼻 */}
      <path d="M40 42 q-1.5 4 0 5.5" stroke="#2a2520" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* 口 */}
      {yes ? (
        <path d="M33 50 Q40 55 47 50" stroke="#2a2520" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : no ? (
        <path d="M34 51 Q40 47 46 51" stroke="#2a2520" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M35 51 h10" stroke="#2a2520" strokeWidth="1.8" strokeLinecap="round" />
      )}
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
  const [pinWobble, setPinWobble] = useState(0);
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
      if (liked && stack) setPinWobble((w) => w + 1);
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

  // 丸ピンの色（カテゴリを示す場合のみ。背景では色分けしない）
  const pinColor = pinColorFor ? pinColorFor(current) : null;

  // 大将の表情（スワイプ判定に連動）：頼む=yes／見送り=no／通常=idle
  const masterExpr = leaving
    ? leaving.dir > 0 ? "yes" : "no"
    : drag.x > 26 ? "yes" : drag.x < -26 ? "no" : "idle";

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
          {/* 大将（中央上の空白・札より奥／弱くぼかす／表情がスワイプに連動）*/}
          {stack && (
            <div className="sw-master" data-expr={masterExpr} aria-hidden>
              <SwMaster expr={masterExpr} />
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

          {/* 動かない画鋲（短冊が引っ張られている表現／頼むで揺れる・色はカテゴリ）*/}
          {stack && (
            <span
              key={`pin-${pinWobble}`}
              className={`sd-pin ${pinWobble > 0 ? "wob" : ""}`}
              style={pinColor ? { background: pinColor } : undefined}
              aria-hidden
            />
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
