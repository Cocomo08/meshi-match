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

// カードの山をスワイプで消化する共通コンポーネント。
//  右＝「頼む」／左＝「見送り」。画面幅25%以上で確定。矢印キー対応。連打ロック。
//  stack=true（短冊）のとき、入場＝上から降下、退場＝一斉に剥がれ落ちる紙の演出。
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
  heightClass = "h-[60vh] max-h-[560px] min-h-[400px]",
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null); // { dir, sx, sy, srot }
  const [burst, setBurst] = useState(0);
  const [screenW, setScreenW] = useState(0);
  const [phase, setPhase] = useState(stack ? "intro" : "live"); // intro | live | outro
  const likedRef = useRef([]);
  const startRef = useRef(null);
  const lockRef = useRef(false);

  const current = cards[index];
  const next = cards[index + 1] ?? (loop ? cards[0] : undefined);
  const third = cards[index + 2] ?? (loop ? cards[(index + 2) % cards.length] : undefined);

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
    const t = setTimeout(() => setPhase("live"), prefersReducedMotion() ? 200 : 600);
    return () => clearTimeout(t);
  }, [phase]);

  const commit = (liked) => {
    if (!current || phase !== "live" || lockRef.current) return;
    lockRef.current = true;
    const sx = drag.x, sy = drag.y * 0.25, srot = drag.x / 14;
    if (liked) {
      likedRef.current.push(current.id);
      setBurst((b) => b + 1);
      playLike();
    } else {
      playNope();
    }
    setLeaving({ dir: liked ? 1 : -1, sx, sy, srot });
    const dur = prefersReducedMotion() ? 250 : liked ? 350 : 500;
    setTimeout(() => {
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
      lockRef.current = false;
      if (index + 1 >= cards.length) {
        if (loop) setIndex(0);
        else if (stack) {
          // 最後の1枚 → 紙が剥がれて暗転 → 遷移
          setPhase("outro");
          setTimeout(() => onFinish(likedRef.current), prefersReducedMotion() ? 250 : 500);
        } else {
          onFinish(likedRef.current);
        }
      } else {
        setIndex(index + 1);
      }
    }, dur);
  };

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        commitRef.current(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        commitRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e) => {
    if (phase !== "live" || leaving || lockRef.current) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!startRef.current || leaving) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y, active: true });
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
  const yesOp = leaving ? (leaving.dir > 0 ? 1 : 0) : Math.min(Math.max(drag.x, 0) / threshold, 1);
  const noOp = leaving ? (leaving.dir < 0 ? 1 : 0) : Math.min(Math.max(-drag.x, 0) / threshold, 1);
  const progress = Math.min(Math.abs(drag.x) / (threshold * 1.1), 1);
  const nextScale = 0.92 + 0.08 * progress;
  const nextOpacity = 0.55 + 0.45 * progress;

  const leaveClass = leaving
    ? prefersReducedMotion()
      ? "sd-leave-fade"
      : leaving.dir > 0
        ? "sd-leave-order"
        : "sd-leave-decline"
    : "";

  // 入場の降下ラッパ（短冊のみ・マウント時1回）
  const drop = (node, delay, rot) =>
    stack ? (
      <div className="sd-drop" style={{ animationDelay: `${delay}s`, "--dropRot": rot }}>
        {node}
      </div>
    ) : (
      node
    );

  return (
    <>
      {/* 画面全体が方向に応じて色づく */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-l from-emerald-400/30 via-emerald-300/5 to-transparent" style={{ opacity: yesOp }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-r from-rose-400/30 via-rose-300/5 to-transparent" style={{ opacity: noOp }} />

      {burst > 0 && (
        <div key={burst} aria-hidden className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="heart-pop text-8xl drop-shadow-lg">❤️</span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex w-full flex-col items-center">
        {controls && <p className="sd-count mb-4 text-sm font-black">のこり{toKanjiNum(cards.length - index)}枚</p>}

        <div className={`relative w-full max-w-sm select-none ${heightClass}`} style={{ opacity: phase === "outro" ? 0 : 1 }}>
          {stack ? (
            <>
              {third && (
                <div
                  className={`sd-behind absolute inset-0 ${leaving ? "go" : ""}`}
                  style={{ transform: `translate(${leaving ? 4 : 8}px, ${leaving ? 8 : 16}px)`, filter: `brightness(${leaving ? 0.85 : 0.7})` }}
                >
                  {drop(renderCard(third), 0, "-6deg")}
                </div>
              )}
              {next && (
                <div
                  className={`sd-behind absolute inset-0 ${leaving ? "go" : ""}`}
                  style={{ transform: `translate(${leaving ? 0 : 4}px, ${leaving ? 0 : 8}px)`, filter: `brightness(${leaving ? 1 : 0.85})` }}
                >
                  {drop(renderCard(next), 0.05, "5deg")}
                </div>
              )}
            </>
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
                ? { "--sx": `${leaving.sx}px`, "--sy": `${leaving.sy}px`, "--srot": `${leaving.srot}deg` }
                : { transform: `translate(${drag.x}px, ${drag.y * 0.25}px) rotate(${dragRot}deg)`, transition: drag.active ? "none" : "transform 0.25s ease-out" }
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {drop(renderCard(current), 0.1, "-3deg")}
            <span className="sd-stamp yes" aria-hidden style={{ opacity: yesOp }}>{stampYes}</span>
            <span className="sd-stamp no" aria-hidden style={{ opacity: noOp }}>{stampNo}</span>
          </div>
        </div>

        {controls ? (
          <>
            <div className="mt-6 flex items-center gap-5">
              <button type="button" onClick={() => commit(false)} disabled={phase !== "live"} className="sd-tag no">
                {nopeLabel}
              </button>
              <button type="button" onClick={() => commit(true)} disabled={phase !== "live"} className="sd-tag yes">
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
