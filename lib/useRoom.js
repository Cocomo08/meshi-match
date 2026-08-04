"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openRoom, getMyId, isOnline } from "./net";

// 部屋への接続・状態購読・自分の状態更新をまとめたフック。
export function useRoom() {
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState(null);
  const [error, setError] = useState("");
  const tRef = useRef(null);
  const unsubRef = useRef(null);
  const idRef = useRef(null);
  if (idRef.current === null && typeof window !== "undefined") idRef.current = getMyId();

  const cleanup = useCallback(() => {
    const t = tRef.current;
    if (t) {
      unsubRef.current?.();
      t.removePlayer(idRef.current);
      t.close?.();
    }
    tRef.current = null;
    unsubRef.current = null;
  }, []);

  const connect = useCallback(async (roomCode, create) => {
    setError("");
    try {
      const t = await openRoom(roomCode);
      if (create) {
        await t.ensureRoom();
      } else {
        const exists = await t.exists();
        if (!exists) {
          setError("その部屋コードは見つかりませんでした");
          t.close?.();
          return false;
        }
      }
      tRef.current = t;
      unsubRef.current = t.subscribe(setRoom);
      await t.setPlayer(idRef.current, {
        role: create ? "host" : "guest",
        phase: "swiping",
        likes: [],
        joinedAt: Date.now(),
      });
      setCode(roomCode);
      return true;
    } catch (e) {
      setError("接続に失敗しました。もう一度お試しください");
      return false;
    }
  }, []);

  const update = useCallback((partial) => {
    tRef.current?.setPlayer(idRef.current, partial);
  }, []);

  const bumpRound = useCallback(() => {
    tRef.current?.setRoom({ round: Date.now() });
  }, []);

  const leave = useCallback(() => {
    cleanup();
    setRoom(null);
    setCode(null);
    setError("");
  }, [cleanup]);

  // アンマウント時に退室
  useEffect(() => cleanup, [cleanup]);
  // タブを閉じる/離れるときに退室（ローカル通信の掃除・Firebaseは onDisconnect が担う）
  useEffect(() => {
    const onHide = () => tRef.current?.removePlayer(idRef.current);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  return { room, code, error, myId: idRef.current, connect, update, bumpRound, leave, isOnline };
}
