"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 90;

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
  const likedRef = useRef([]);
  const startRef = useRef(null);

  const current = cards[index];
  const next = cards[index + 1] ?? (loop ? cards[0] : undefined);

  const commit = (liked) => {
    if (!current || leaving) return;
    if (liked) likedRef.current.push(current.id);
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
    }, 300);
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

  const x = leaving ? leaving.dir * 900 : drag.x;
  const y = leaving ? -60 : drag.y * 0.25;
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

      <div className="relative z-10 flex w-full flex-col items-center">
        {controls && (
          <p className="mb-4 text-xs font-bold tracking-[0.3em] text-stone-400">
            {index + 1} / {cards.length}
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
              transition: drag.active && !leaving ? "none" : "transform 0.3s ease-out",
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
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-xl shadow-md transition hover:border-rose-300 active:scale-90"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => commit(true)}
                aria-label={likeLabel}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-xl shadow-md transition hover:border-emerald-300 active:scale-90"
              >
                ❤️
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
