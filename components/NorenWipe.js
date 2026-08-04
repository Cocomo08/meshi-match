"use client";

import { useCallback, useRef, useState } from "react";

// のれんワイプ遷移（共通）
//  閉じる(0.5s) → 画面切り替え → 開く(0.5s)。減速イージング。
//  prefers-reduced-motion のときは演出せず即座に切り替える。
//  遷移中は nw-root（全画面）が操作をブロックする。

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useNorenWipe() {
  const [phase, setPhase] = useState("idle"); // idle | closing | opening
  const busy = useRef(false);

  const wipe = useCallback((apply) => {
    if (busy.current) return;
    if (prefersReduced()) {
      apply?.();
      return;
    }
    busy.current = true;
    setPhase("closing"); // のれんが左右から閉じて画面を覆う
    window.setTimeout(() => {
      apply?.(); // 覆われた状態で中身を切り替え
      setPhase("opening"); // のれんが左右に開く
      window.setTimeout(() => {
        setPhase("idle");
        busy.current = false;
      }, 500);
    }, 500);
  }, []);

  return { phase, wipe, transitioning: phase !== "idle" };
}

function Panel({ side }) {
  return (
    <div className={`nw-panel nw-${side}`}>
      <div className="nw-rod" />
      <div className="nw-body" />
      <div className="nw-hem">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export function NorenWipe({ phase }) {
  if (phase === "idle") return null;
  return (
    <div className="nw-root" data-phase={phase} aria-hidden>
      <Panel side="left" />
      <Panel side="right" />
    </div>
  );
}
