"use client";

import { useState, useEffect, useRef } from "react";
import { GENRES, getGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";
import {
  playPush,
  hydrateSound,
  isSoundEnabled,
  toggleSound,
  subscribeSound,
} from "@/components/sound";
import { useRoom } from "@/lib/useRoom";

const genreCards = GENRES.map((g) => ({ ...g }));
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// 部屋コード（紛らわしい文字を除いた4桁）
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genCode = () =>
  Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

// スマブラ風の立体ボタン（斜体・白フチ・グロー＋押し込み）
const BTN_TONES = {
  primary:
    "text-stone-900 bg-gradient-to-b from-amber-200 to-amber-500 border-white shadow-[0_7px_0_0_#b45309,0_0_26px_rgba(255,200,80,0.5)] active:shadow-[0_2px_0_0_#b45309,0_0_26px_rgba(255,200,80,0.5)]",
  neutral:
    "text-white bg-white/10 border-white/60 shadow-[0_6px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5)]",
};

function Button3D({ children, onClick, tone = "primary", gradient, className = "", type = "button", disabled }) {
  const gold = tone === "primary";
  const toneCls =
    tone === "genre"
      ? `text-white border-white bg-gradient-to-b ${gradient} shadow-[0_6px_0_0_rgba(0,0,0,0.5),0_0_22px_rgba(255,255,255,0.18)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5),0_0_22px_rgba(255,255,255,0.18)]`
      : BTN_TONES[tone];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={(e) => {
        playPush();
        onClick?.(e);
      }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl border-[3px] py-4 font-black italic tracking-wide transition-all duration-100 ease-out active:translate-y-[5px] disabled:cursor-default disabled:opacity-50 disabled:active:translate-y-0 ${toneCls} ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-1.5 top-1 h-[42%] rounded-lg bg-gradient-to-b ${gold ? "from-white/70" : "from-white/35"} to-transparent`}
      />
      <span aria-hidden className="btn-shine pointer-events-none absolute inset-0" />
      <span className={`relative ${gold ? "" : "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"}`}>{children}</span>
    </button>
  );
}

// 本体共通の消音トグル
function MuteToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(hydrateSound());
    return subscribeSound(setOn);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setOn(toggleSound())}
      aria-label={on ? "音を消す" : "音を出す"}
      aria-pressed={!on}
      className={`fixed right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-lg text-white shadow-[0_2px_0_0_rgba(0,0,0,0.5)] backdrop-blur transition active:translate-y-[2px] ${
        on ? "" : "opacity-55"
      }`}
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}

function GenreCard({ card }) {
  const [hasPhoto, setHasPhoto] = useState(false);
  const imgRef = useRef(null);
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setHasPhoto(true);
  }, []);
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-[3px] border-white/85 bg-gradient-to-br ${card.gradient} text-center text-white shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_28px_rgba(255,255,255,0.12)]`}
    >
      <span className="absolute left-3 top-3 z-20 -skew-x-6 rounded-md border-2 border-white/80 bg-black/45 px-3 py-1 text-[11px] font-black tracking-wide text-white backdrop-blur">
        {card.category}
      </span>
      {!hasPhoto && (
        <>
          <span className="text-8xl drop-shadow-lg">{card.emoji}</span>
          <p className="mt-6 text-3xl font-black italic tracking-wide drop-shadow">{card.label}</p>
          <p className="mt-2 text-sm font-bold text-white/85">今日の気分はコレ？</p>
        </>
      )}
      <img
        ref={imgRef}
        src={`${ASSET_BASE}/images/${card.id}.jpg`}
        alt=""
        onLoad={() => setHasPhoto(true)}
        onError={() => setHasPhoto(false)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          hasPhoto ? "opacity-100" : "opacity-0"
        }`}
      />
      {hasPhoto && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <p className="absolute inset-x-0 bottom-8 -skew-x-6 text-3xl font-black italic tracking-wide text-white [text-shadow:0_3px_8px_rgba(0,0,0,0.8)]">
            {card.label}
          </p>
        </>
      )}
    </div>
  );
}

// 待機中に自分/相手の状態を示すバッジ
function StatusChip({ label, ready, color }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-black ${
        ready ? color : "border-white/25 bg-white/5 text-white/60"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs font-bold">{ready ? "✓ 完了" : "…スワイプ中"}</span>
    </div>
  );
}

export default function MeshiMatchPage() {
  const { room, code, error, myId, connect, update, bumpRound, leave, isOnline } = useRoom();
  const [view, setView] = useState("home"); // home | join | room
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const seenRound = useRef(0);

  const players = room?.players || {};
  const ids = Object.keys(players);
  const me = players[myId];
  const oppId = ids.find((id) => id !== myId);
  const opp = oppId ? players[oppId] : null;
  const opponentPresent = !!opp;
  const meDone = me?.phase === "done";
  const oppDone = opp?.phase === "done";
  const bothDone = opponentPresent && meDone && oppDone;
  const matches = bothDone ? (me.likes || []).filter((id) => (opp.likes || []).includes(id)) : [];

  // ラウンド変更（もう一回）を検知して自分のスワイプをリセット
  useEffect(() => {
    if (view !== "room" || !room) return;
    const r = room.round || 0;
    if (r !== seenRound.current) {
      seenRound.current = r;
      if (r !== 0) update({ phase: "swiping", likes: [] });
    }
  }, [room, view, update]);

  const createRoom = async () => {
    setBusy(true);
    const c = genCode();
    const ok = await connect(c, true);
    setBusy(false);
    if (ok) {
      seenRound.current = 0;
      setView("room");
    }
  };

  const joinRoom = async () => {
    const c = joinCode.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true);
    const ok = await connect(c, false);
    setBusy(false);
    if (ok) {
      seenRound.current = 0;
      setView("room");
    }
  };

  const copyCode = async () => {
    playPush();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* クリップボード不可でも無視 */
    }
  };

  const leaveRoom = () => {
    leave();
    setView("home");
    setJoinCode("");
    seenRound.current = 0;
  };

  // 部屋内のステージを room 状態から導出
  const stage = !opponentPresent ? "waiting" : bothDone ? "result" : meDone ? "swipeWait" : "swipe";

  return (
    <div className="mm-arena relative flex flex-1 flex-col overflow-hidden px-5 py-8">
      <div className="mm-lines" aria-hidden />
      <MuteToggle />

      {!isOnline && (
        <div className="relative z-20 mx-auto mb-3 max-w-md rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-center text-[11px] font-bold text-amber-200/90">
          ⚙️ オフライン検証モード（Firebase未設定）— 同じ端末のタブ間でのみ動作します
        </div>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== ホーム：部屋を作る / 入る ===== */}
        {view === "home" && (
          <div className="flex w-full flex-col items-center">
            <span className="mb-3 -skew-x-6 rounded-md border-2 border-white/70 bg-white/10 px-4 py-1 text-sm font-black italic tracking-widest text-white backdrop-blur">
              🍜 メシマチ
            </span>
            <h1 className="text-center text-[2.1rem] font-black italic leading-tight tracking-tight text-white [text-shadow:0_3px_12px_rgba(0,0,0,0.6)]">
              「どこでもいい」を
              <br />
              <span className="mm-gold">卒業</span>しよう
            </h1>
            <p className="mb-8 mt-3 text-center text-xs font-bold tracking-wide text-white/70">
              二人がそれぞれの端末でスワイプ → マッチで今日のごはんを決める
            </p>

            <div className="flex w-full flex-col gap-3">
              <Button3D onClick={createRoom} disabled={busy} className="w-full px-8 text-lg">
                部屋をつくる
              </Button3D>
              <Button3D tone="neutral" onClick={() => { setView("join"); }} className="w-full px-8 text-base">
                部屋に入る
              </Button3D>
            </div>
            <p className="mt-8 text-center text-[11px] font-medium leading-relaxed text-white/45">
              登録不要。部屋コードを共有して、
              <br />
              二人でリアルタイムに対戦できます。
            </p>
          </div>
        )}

        {/* ===== 部屋コードを入力して参加 ===== */}
        {view === "join" && (
          <div className="flex w-full flex-col items-center text-center">
            <h2 className="text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              部屋コードを入力
            </h2>
            <p className="mt-2 text-xs font-bold text-white/60">相手から聞いた4文字を入れてね</p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              inputMode="text"
              autoCapitalize="characters"
              placeholder="ABCD"
              className="mt-6 w-full max-w-[240px] rounded-xl border-[3px] border-white/60 bg-white/10 py-4 text-center text-3xl font-black italic tracking-[0.4em] text-white placeholder-white/25 outline-none focus:border-amber-300"
            />
            {error && <p className="mt-3 text-xs font-bold text-rose-300">{error}</p>}
            <div className="mt-6 flex w-full flex-col gap-3">
              <Button3D onClick={joinRoom} disabled={busy || joinCode.length < 4} className="w-full px-8 text-lg">
                {busy ? "接続中…" : "入る"}
              </Button3D>
              <Button3D tone="neutral" onClick={() => { setView("home"); setJoinCode(""); }} className="w-full px-8 text-sm">
                もどる
              </Button3D>
            </div>
          </div>
        )}

        {/* ===== 部屋の中（待機→スワイプ→結果）===== */}
        {view === "room" && (
          <>
            {/* 待機：相手を待つ */}
            {stage === "waiting" && (
              <div className="flex w-full flex-col items-center text-center">
                <p className="text-xs font-black tracking-widest text-white/60">部屋コード</p>
                <button
                  onClick={copyCode}
                  className="mt-2 flex items-center gap-3 rounded-2xl border-[3px] border-amber-300 bg-amber-400/10 px-8 py-4 text-5xl font-black italic tracking-[0.2em] text-amber-200 shadow-[0_0_26px_rgba(255,200,80,0.3)]"
                >
                  {code}
                  <span className="text-base not-italic">{copied ? "✓" : "📋"}</span>
                </button>
                <p className="mt-2 text-[11px] font-bold text-white/45">タップでコピー</p>

                <div className="mt-8 flex items-center gap-3 text-white/80">
                  <span className="h-3 w-3 animate-ping rounded-full bg-amber-300" />
                  <span className="text-sm font-black italic">相手を待っています…</span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-white/55">
                  このコードを相手に伝えて、
                  <br />
                  「部屋に入る」から入ってもらってね。
                </p>

                <Button3D tone="neutral" onClick={leaveRoom} className="mt-8 px-10 text-sm">
                  部屋を出る
                </Button3D>
              </div>
            )}

            {/* スワイプ：自分の端末で選ぶ */}
            {stage === "swipe" && (
              <div className="flex w-full flex-col items-center">
                <p className="mb-3 -skew-x-6 rounded-md border-2 border-emerald-400/60 bg-emerald-500/15 px-4 py-1 text-xs font-black italic tracking-widest text-emerald-200">
                  🟢 相手も入室中！スワイプで選ぼう
                </p>
                <SwipeDeck
                  key={`swipe-${room?.round || 0}`}
                  cards={genreCards}
                  renderCard={(card) => <GenreCard key={card.id} card={card} />}
                  onFinish={(liked) => update({ likes: liked, phase: "done" })}
                />
              </div>
            )}

            {/* 自分は完了、相手待ち */}
            {stage === "swipeWait" && (
              <div className="flex w-full flex-col items-center text-center">
                <span className="text-6xl drop-shadow-lg">✅</span>
                <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  スワイプ完了！
                </h2>
                <div className="mt-6 flex items-center gap-3 text-white/80">
                  <span className="h-3 w-3 animate-ping rounded-full bg-sky-300" />
                  <span className="text-sm font-black italic">相手がスワイプ中…</span>
                </div>
                <Button3D tone="neutral" onClick={leaveRoom} className="mt-8 px-10 text-sm">
                  部屋を出る
                </Button3D>
              </div>
            )}

            {/* 結果：両者のマッチ */}
            {stage === "result" && (
              <div className="flex w-full flex-col items-center text-center">
                {matches.length > 0 ? (
                  <>
                    <span className="text-6xl drop-shadow-lg">🎉</span>
                    <h2 className="mt-4 text-3xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      マッチ<span className="mm-gold">成立</span>！
                    </h2>
                    <p className="mt-2 text-sm font-medium text-white/70">二人とも「アリ」だったジャンル</p>
                    <div className="mt-6 flex w-full flex-col gap-3">
                      {matches.map((id) => {
                        const g = getGenre(id);
                        return (
                          <div
                            key={id}
                            className={`flex items-center justify-between rounded-2xl border-2 border-white/70 bg-gradient-to-r ${g.gradient} px-6 py-4 text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)]`}
                          >
                            <span className="text-lg font-black italic">
                              {g.emoji} {g.label}
                            </span>
                            <span className="-skew-x-6 text-xs font-black tracking-widest text-white/95">MATCH</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-6xl drop-shadow-lg">⚔️</span>
                    <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      意見、真っ二つ！
                    </h2>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                      共通の「アリ」はありませんでした。
                      <br />
                      <span className="font-bold text-amber-300">2台対応のミニゲーム決着は近日アップデート予定！</span>
                    </p>
                  </>
                )}

                <div className="mt-8 flex w-full flex-col gap-3">
                  <Button3D onClick={() => { bumpRound(); }} className="w-full px-8 text-base">
                    もう一回（同じ部屋で）
                  </Button3D>
                  <Button3D tone="neutral" onClick={leaveRoom} className="w-full px-8 text-sm">
                    部屋を出る
                  </Button3D>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="relative z-10 mt-8 text-center text-[10px] font-medium tracking-wide text-white/40">
        ※ 店舗情報はデモ用のサンプルデータです
      </p>
    </div>
  );
}
