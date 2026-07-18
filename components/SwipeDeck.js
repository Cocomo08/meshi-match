"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 90;

// カードの山をスワイプ（ドラッグ or ボタン）で消化する共通コンポーネント。
// cards: { id, render } の配列。onSwipe(card, liked) を全カード消化まで呼び、最後に onFinish(likedIds)。
export function SwipeDeck({ cards, renderCard, onFinish, likeLabel = "アリ！", nopeLabel = "パス" }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null); // { dir: 1 | -1 }
  const likedRef = useRef([]);
  const startRef = useRef(null);

  const current = cards[index];
  const next = cards[index + 1];

  const commit = (liked) => {
    if (!current || leaving) return;
    if (liked) likedRef.current.push(current.id);
    setLeaving({ dir: liked ? 1 : -1 });
    setTimeout(() => {
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
      if (index + 1 >= cards.length) {
        onFinish(likedRef.current);
      } else {
        setIndex(index + 1);
      }
    }, 260);
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

  const x = leaving ? leaving.dir * 600 : drag.x;
  const y = leaving ? -40 : drag.y * 0.3;
  const rot = x / 18;
  const likeOpacity = Math.min(Math.max(x, 0) / SWIPE_THRESHOLD, 1);
  const nopeOpacity = Math.min(Math.max(-x, 0) / SWIPE_THRESHOLD, 1);

  return (
    <div className="flex w-full flex-col items-center">
      <p className="mb-3 text-xs font-medium tracking-widest text-stone-500">
        {index + 1} / {cards.length}
      </p>

      <div className="relative h-[420px] w-full max-w-sm select-none">
        {next && (
          <div className="absolute inset-0 scale-[0.94] translate-y-3 opacity-60">
            {renderCard(next)}
          </div>
        )}

        <div
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          style={{
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
            transition: drag.active && !leaving ? "none" : "transform 0.26s ease-out",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {renderCard(current)}

          <span
            className="absolute left-4 top-4 rotate-[-12deg] rounded-lg border-2 border-amber-300 px-3 py-1 text-xl font-semibold tracking-widest text-amber-300"
            style={{ opacity: likeOpacity }}
          >
            {likeLabel}
          </span>
          <span
            className="absolute right-4 top-4 rotate-[12deg] rounded-lg border-2 border-stone-400 px-3 py-1 text-xl font-semibold tracking-widest text-stone-400"
            style={{ opacity: nopeOpacity }}
          >
            {nopeLabel}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-8">
        <button
          type="button"
          onClick={() => commit(false)}
          aria-label={nopeLabel}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-neutral-900 text-2xl text-stone-300 shadow-lg shadow-black/50 transition hover:border-white/30 active:scale-90"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => commit(true)}
          aria-label={likeLabel}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/50 bg-amber-300/10 text-2xl shadow-lg shadow-amber-500/10 transition hover:bg-amber-300/20 active:scale-90"
        >
          ❤️
        </button>
      </div>
      <p className="mt-3 text-xs tracking-wide text-stone-600">
        左右にスワイプ、またはボタンで選択
      </p>
    </div>
  );
}
