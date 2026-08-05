"use client";

import { useEffect, useRef, useState } from "react";
import { playLike, playNope } from "@/components/sound";

// ハート弾け演出の飛び散り方向
const HEART_PARTICLES = [
  { dx: "-72px", dy: "-64px", rot: "-25deg" },
  { dx: "72px", dy: "-64px", rot: "25deg" },
  { dx: "-96px", dy: "8px", rot: "-15deg" },
  { dx: "96px", dy: "8px", rot: "15deg" },
  { dx: "-44px", dy: "-96px", rot: "-8deg" },
  { dx: "44px", dy: "-96px", rot: "8deg" },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// カードの山をスワイプで消化する共通コンポーネント。
//  右スワイプ＝「頼む」（右下の注文票へ吸い込まれる）
//  左スワイプ＝「今日はいいや」（ひらひら落下）
//  画面幅の25%以上で確定。未満は元へ戻る。矢印キー対応。連打ロックあり。
// props:
//   stack     : true で背後2枚を積み重ね表示（短冊用）
//   stampYes/stampNo : 判子スタンプの文言
export function SwipeDeck({
  cards,
  renderCard,
  onFinish,
  likeLabel = "アリ",
  nopeLabel = "パス",
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
  const likedRef = useRef([]);
  const startRef = useRef(null);
  const lockRef = useRef(false); // 連打・二重発火の同期ロック

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

  const commit = (liked) => {
    if (!current || lockRef.current) return;
    lockRef.current = true;
    const sx = drag.x;
    const sy = drag.y * 0.25;
    const srot = drag.x / 14;
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
        else onFinish(likedRef.current);
      } else {
        setIndex(index + 1);
      }
    }, dur);
  };

  // 最新の commit を参照（キーボード用に stale closure を避ける）
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // 矢印キー操作
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
    if (leaving || lockRef.current) return;
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
    if (Math.abs(dx) > threshold) {
      commit(dx > 0);
    } else {
      setDrag({ x: 0, y: 0, active: false }); // 元の位置へ（0.25s・バウンドなし）
    }
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

  return (
    <>
      {/* 画面全体が方向に応じて色づく */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-l from-emerald-400/30 via-emerald-300/5 to-transparent"
        style={{ opacity: yesOp }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-r from-rose-400/30 via-rose-300/5 to-transparent"
        style={{ opacity: noOp }}
      />

      {/* 右スワイプでハートが弾ける演出 */}
      {burst > 0 && (
        <div key={burst} aria-hidden className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="heart-pop text-8xl drop-shadow-lg">❤️</span>
            {HEART_PARTICLES.map((p, i) => (
              <span key={i} className="heart-fly absolute text-3xl" style={{ "--dx": p.dx, "--dy": p.dy, "--rot": p.rot }}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex w-full flex-col items-center">
        {controls && (
          <p className="mb-4 -skew-x-6 text-xs font-black italic tracking-[0.3em] text-white/60">
            あと{cards.length - index}枚
          </p>
        )}

        <div className={`relative w-full max-w-sm select-none ${heightClass}`}>
          {stack ? (
            <>
              {third && (
                <div
                  className={`sd-behind absolute inset-0 ${leaving ? "go" : ""}`}
                  style={{
                    transform: `translate(${leaving ? 4 : 8}px, ${leaving ? 8 : 16}px)`,
                    filter: `brightness(${leaving ? 0.85 : 0.7})`,
                  }}
                >
                  {renderCard(third)}
                </div>
              )}
              {next && (
                <div
                  className={`sd-behind absolute inset-0 ${leaving ? "go" : ""}`}
                  style={{
                    transform: `translate(${leaving ? 0 : 4}px, ${leaving ? 0 : 8}px)`,
                    filter: `brightness(${leaving ? 1 : 0.85})`,
                  }}
                >
                  {renderCard(next)}
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
                : {
                    transform: `translate(${drag.x}px, ${drag.y * 0.25}px) rotate(${dragRot}deg)`,
                    transition: drag.active ? "none" : "transform 0.25s ease-out",
                  }
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {renderCard(current)}

            {/* 判子風スタンプ（右：頼む／左：またこんど）*/}
            <span className="sd-stamp yes" aria-hidden style={{ opacity: yesOp }}>
              {stampYes}
            </span>
            <span className="sd-stamp no" aria-hidden style={{ opacity: noOp }}>
              {stampNo}
            </span>
          </div>
        </div>

        {controls ? (
          <>
            <div className="mt-6 flex items-center gap-10">
              <button
                type="button"
                onClick={() => commit(false)}
                aria-label={nopeLabel}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white to-stone-100 text-xl text-stone-500 ring-1 ring-rose-200 shadow-[0_5px_0_0_#fecdd3,0_9px_12px_-4px_rgba(120,113,108,0.4)] transition-all duration-100 ease-out active:translate-y-[4px] active:shadow-[0_1px_0_0_#fecdd3,0_3px_6px_-3px_rgba(120,113,108,0.35)]"
              >
                <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent" />
                <span className="relative">✕</span>
              </button>
              <button
                type="button"
                onClick={() => commit(true)}
                aria-label={likeLabel}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white to-stone-100 text-xl ring-1 ring-emerald-200 shadow-[0_5px_0_0_#a7f3d0,0_9px_12px_-4px_rgba(120,113,108,0.4)] transition-all duration-100 ease-out active:translate-y-[4px] active:shadow-[0_1px_0_0_#a7f3d0,0_3px_6px_-3px_rgba(120,113,108,0.35)]"
              >
                <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent" />
                <span className="relative">❤️</span>
              </button>
            </div>
            <p className="mt-4 text-xs font-medium tracking-wide text-white/55">左右にスワイプして選ぶ</p>
          </>
        ) : (
          <p className="mt-5 text-xs font-bold tracking-wide text-white/70">👈 スワイプして試してみて 👉</p>
        )}
      </div>
    </>
  );
}
