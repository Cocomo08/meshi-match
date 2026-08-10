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

  const connect = useCallback(async (roomCode, create, name) => {
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
      // 入室のたびに現在の入力値で name を上書きする。
      //  （IME不具合時代に保存された1文字などの壊れた name を、再入室で必ず直すため）
      await t.setPlayer(idRef.current, {
        role: create ? "host" : "guest",
        name: (name || "").trim().slice(0, 12) || "ゲスト",
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

  const setGame = useCallback((partial) => {
    tRef.current?.setGame(partial);
  }, []);

  const setShared = useCallback((partial) => {
    tRef.current?.setRoom(partial);
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

  return { room, code, error, myId: idRef.current, connect, update, bumpRound, setGame, setShared, leave, isOnline };
}
