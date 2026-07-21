"use client";

import { useRef, useState } from "react";
import { playLike, playNope } from "@/components/sound";

const SWIPE_THRESHOLD = 90;

// ハート弾け演出の飛び散り方向
const HEART_PARTICLES = [
  { dx: "-72px", dy: "-64px", rot: "-25deg" },
  { dx: "72px", dy: "-64px", rot: "25deg" },
  { dx: "-96px", dy: "8px", rot: "-15deg" },
  { dx: "96px", dy: "8px", rot: "15deg" },
  { dx: "-44px", dy: "-96px", rot: "-8deg" },
  { dx: "44px", dy: "-96px", rot: "8deg" },
];

// カードの山をスワイプで消化する共通コンポーネント（Tinder風）。
// ドラッグで判定、画面全体が方向に応じて色づく。ボタンは補助。
// props:
//   loop     : true でカードを無限ループ（トップのデモ用）
//   controls : false でカウンター・ボタン・ヒントを非表示（デモ用）
//   heightClass : カード領域の高さ
export function SwipeDeck({
  cards,
  renderCard,
  onFinish,
  likeLabel = "アリ",
  nopeLabel = "パス",
  loop = false,
  controls = true,
  heightClass = "h-[60vh] max-h-[560px] min-h-[400px]",
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null); // { dir: 1 | -1 }
  const [burst, setBurst] = useState(0); // 右スワイプでインクリメントしハート弾け再生
  const likedRef = useRef([]);
  const startRef = useRef(null);

  const current = cards[index];
  const next = cards[index + 1] ?? (loop ? cards[0] : undefined);

  const commit = (liked) => {
    if (!current || leaving) return;
    if (liked) {
      likedRef.current.push(current.id);
      setBurst((b) => b + 1);
      playLike();
    } else {
      playNope();
    }
    setLeaving({ dir: liked ? 1 : -1 });
    setTimeout(() => {
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
      if (index + 1 >= cards.length) {
        if (loop) setIndex(0);
        else onFinish(likedRef.current);
      } else {
        setIndex(index + 1);
      }
    }, 200);
  };

  const onPointerDown = (e) => {
    if (leaving) return;
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
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      commit(dx > 0);
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  if (!current) return null;

  const x = leaving ? leaving.dir * 1150 : drag.x;
  const y = leaving ? -70 : drag.y * 0.25;
  const rot = x / 14;
  const likeOpacity = Math.min(Math.max(x, 0) / SWIPE_THRESHOLD, 1);
  const nopeOpacity = Math.min(Math.max(-x, 0) / SWIPE_THRESHOLD, 1);
  const progress = Math.min(Math.abs(drag.x) / (SWIPE_THRESHOLD * 2.2), 1);
  const nextScale = 0.92 + 0.08 * progress;
  const nextOpacity = 0.55 + 0.45 * progress;

  return (
    <>
      {/* 画面全体が方向に応じて色づく（Tinder風の全画面フィードバック） */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-l from-emerald-400/30 via-emerald-300/5 to-transparent"
        style={{ opacity: leaving ? (leaving.dir > 0 ? 1 : 0) : likeOpacity }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-r from-rose-400/30 via-rose-300/5 to-transparent"
        style={{ opacity: leaving ? (leaving.dir < 0 ? 1 : 0) : nopeOpacity }}
      />

      {/* 右スワイプでハートが弾ける演出 */}
      {burst > 0 && (
        <div
          key={burst}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
        >
          <div className="relative flex items-center justify-center">
            <span className="heart-pop text-8xl drop-shadow-lg">❤️</span>
            {HEART_PARTICLES.map((p, i) => (
              <span
                key={i}
                className="heart-fly absolute text-3xl"
                style={{ "--dx": p.dx, "--dy": p.dy, "--rot": p.rot }}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex w-full flex-col items-center">
        {controls && (
          <p className="mb-4 text-xs font-bold tracking-[0.3em] text-stone-400">
            あと{cards.length - index}枚
          </p>
        )}

        <div className={`relative w-full max-w-sm select-none ${heightClass}`}>
          {next && (
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
          )}

          <div
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            style={{
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
              transition:
                drag.active && !leaving
                  ? "none"
                  : leaving
                    ? "transform 0.17s cubic-bezier(0.4, 0, 0.9, 0.5)"
                    : "transform 0.3s ease-out",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {renderCard(current)}

            <span
              className="pointer-events-none absolute left-5 top-6 rotate-[-14deg] rounded-2xl border-4 border-emerald-400 px-4 py-1.5 text-2xl font-black tracking-[0.15em] text-emerald-400"
              style={{ opacity: likeOpacity }}
            >
              {likeLabel}
            </span>
            <span
              className="pointer-events-none absolute right-5 top-6 rotate-[14deg] rounded-2xl border-4 border-rose-400 px-4 py-1.5 text-2xl font-black tracking-[0.15em] text-rose-400"
              style={{ opacity: nopeOpacity }}
            >
              {nopeLabel}
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
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent"
                />
                <span className="relative">✕</span>
              </button>
              <button
                type="button"
                onClick={() => commit(true)}
                aria-label={likeLabel}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white to-stone-100 text-xl ring-1 ring-emerald-200 shadow-[0_5px_0_0_#a7f3d0,0_9px_12px_-4px_rgba(120,113,108,0.4)] transition-all duration-100 ease-out active:translate-y-[4px] active:shadow-[0_1px_0_0_#a7f3d0,0_3px_6px_-3px_rgba(120,113,108,0.35)]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent"
                />
                <span className="relative">❤️</span>
              </button>
            </div>
            <p className="mt-4 text-xs font-medium tracking-wide text-stone-400">
              左右にスワイプして選ぶ
            </p>
          </>
        ) : (
          <p className="mt-5 text-xs font-bold tracking-wide text-stone-400">
            👈 スワイプして試してみて 👉
          </p>
        )}
      </div>
    </>
  );
}
