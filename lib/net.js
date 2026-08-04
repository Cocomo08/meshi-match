"use client";

// 部屋通信の抽象化。
//  - 本番: Firebase Realtime Database（設定があるとき）
//  - 検証/オフライン: 同一オリジンのタブ間通信（BroadcastChannel + localStorage）
// どちらも同じ API を返すので、アプリ側は違いを意識しない。

import { firebaseConfig, hasFirebase } from "./firebaseConfig";

// ?net=local を付けると、Firebase設定があってもローカル通信（タブ間）に切り替える。
// 開発環境からはFirebaseへ直接アクセスできないため、2画面テストに使う。
const forceLocal =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("net") === "local";

const useFirebase = hasFirebase && !forceLocal;
export const isOnline = useFirebase;

// このタブの参加者ID（リロードしても同じになるよう sessionStorage に保存）
export function getMyId() {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("meshi-uid");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("meshi-uid", id);
  }
  return id;
}

// ── ローカル通信（BroadcastChannel + localStorage）──
function localTransport(code) {
  const key = `meshi-room:${code}`;
  const chan = new BroadcastChannel(`meshi-room:${code}`);
  const listeners = new Set();
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const notify = () => {
    const r = read();
    listeners.forEach((fn) => fn(r));
  };
  const write = (room) => {
    localStorage.setItem(key, JSON.stringify(room));
    notify(); // 自分自身にも即反映（BroadcastChannelは他タブにしか届かない）
    chan.postMessage("update");
  };
  return {
    async exists() {
      return !!read();
    },
    async ensureRoom() {
      if (!read()) write({ createdAt: Date.now(), round: 0, players: {} });
    },
    async setPlayer(id, data) {
      const r = read() || { players: {} };
      r.players = r.players || {};
      r.players[id] = { ...(r.players[id] || {}), ...data };
      write(r);
    },
    async removePlayer(id) {
      const r = read();
      if (r?.players?.[id]) {
        delete r.players[id];
        write(r);
      }
    },
    async setRoom(partial) {
      const r = read() || { players: {} };
      write({ ...r, ...partial });
    },
    async setGame(partial) {
      const r = read() || { players: {} };
      r.game = partial === null ? null : { ...(r.game || {}), ...partial };
      write(r);
    },
    subscribe(cb) {
      listeners.add(cb);
      const handler = () => cb(read());
      chan.addEventListener("message", handler);
      cb(read());
      return () => {
        listeners.delete(cb);
        chan.removeEventListener("message", handler);
      };
    },
    close() {
      listeners.clear();
      chan.close();
    },
  };
}

// ── Firebase Realtime Database ──
async function firebaseTransport(code) {
  const [{ initializeApp, getApps }, dbmod] = await Promise.all([
    import("firebase/app"),
    import("firebase/database"),
  ]);
  const { getDatabase, ref, onValue, update, remove, set, get, onDisconnect } = dbmod;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const roomRef = ref(db, `rooms/${code}`);
  const playerRef = (id) => ref(db, `rooms/${code}/players/${id}`);
  return {
    async exists() {
      const snap = await get(roomRef);
      return snap.exists();
    },
    async ensureRoom() {
      const snap = await get(roomRef);
      if (!snap.exists()) await set(roomRef, { createdAt: Date.now(), round: 0, players: {} });
    },
    async setPlayer(id, data) {
      const pRef = playerRef(id);
      await update(pRef, data);
      // 切断時に自動退室
      onDisconnect(pRef).remove();
    },
    async removePlayer(id) {
      await remove(playerRef(id));
    },
    async setRoom(partial) {
      await update(roomRef, partial);
    },
    async setGame(partial) {
      const gRef = ref(db, `rooms/${code}/game`);
      if (partial === null) await remove(gRef);
      else await update(gRef, partial);
    },
    subscribe(cb) {
      return onValue(roomRef, (snap) => cb(snap.val()));
    },
    close() {},
  };
}

export async function openRoom(code) {
  return useFirebase ? firebaseTransport(code) : localTransport(code);
}
