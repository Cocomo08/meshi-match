"use client";

import { useState, useEffect, useRef } from "react";
import { GENRES, getGenre, getStoresByGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";
import {
  playPush,
  hydrateSound,
  isSoundEnabled,
  toggleSound,
  subscribeSound,
} from "@/components/sound";
import { useRoom } from "@/lib/useRoom";
import { newSeed } from "@/lib/rng";
import { MeshiSlotNet } from "@/components/MeshiSlotNet";
import { MeshiAmidaNet } from "@/components/MeshiAmidaNet";
import { MeshiBattleNet } from "@/components/MeshiBattleNet";

const genreCards = GENRES.map((g) => ({ ...g }));
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// 選べるミニゲーム（battle は次のアップデートで2台対応予定）
const MINI_GAMES = [
  { id: "slot", emoji: "🎰", name: "メシスロット", desc: "そろえて一発勝負", gradient: "from-amber-400 via-orange-500 to-yellow-600", ready: true },
  { id: "amida", emoji: "🪜", name: "運命のあみだ", desc: "たどって運だめし", gradient: "from-sky-500 via-blue-600 to-indigo-600", ready: true },
  { id: "battle", emoji: "🥊", name: "メシバトル", desc: "リズムタップ対決", gradient: "from-rose-500 via-red-600 to-orange-600", ready: true },
];

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

function StoreCard({ card }) {
  const genre = getGenre(card.genre);
  const [hasPhoto, setHasPhoto] = useState(false);
  const imgRef = useRef(null);
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setHasPhoto(true);
  }, []);
  // 店別写真(card.img)があれば優先、無ければジャンル写真を流用
  const src = `${ASSET_BASE}/images/${card.img || genre?.id}.jpg`;
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border-[3px] border-white/85 bg-[#12141f] shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(255,255,255,0.08)]">
      {/* 上：全面写真（無ければジャンル色＋絵文字）*/}
      <div className={`relative h-[46%] w-full overflow-hidden bg-gradient-to-br ${genre?.gradient || "from-orange-400 to-red-500"}`}>
        {!hasPhoto && (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-7xl drop-shadow-lg">{genre?.emoji}</span>
          </div>
        )}
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={() => setHasPhoto(true)}
          onError={() => setHasPhoto(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hasPhoto ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#12141f] via-[#12141f]/60 to-transparent" />
        <span className="absolute left-3 top-3 -skew-x-6 rounded-md border-2 border-white/80 bg-black/45 px-3 py-1 text-[11px] font-black tracking-wide text-white backdrop-blur">
          {genre?.emoji} {genre?.label}
        </span>
      </div>
      {/* 下：店情報 */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <p className="text-xl font-black italic leading-tight text-white">{card.name}</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">{card.copy}</p>
        <div className="mt-auto space-y-2 pt-3">
          <p className="text-sm font-bold text-amber-300">
            {card.price} ・ 四ツ谷駅 徒歩{card.walk}分
          </p>
          <div className="flex flex-wrap gap-2">
            {card.tags.map((t) => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
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
  const { room, code, error, myId, connect, update, bumpRound, setGame, setShared, leave, isOnline } = useRoom();
  const [view, setView] = useState("home"); // home | join | room
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const seenRound = useRef(0);

  // クライアントでのみバナー判定（SSRとの不一致を防ぐ）
  useEffect(() => setMounted(true), []);

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
  const noMatch = bothDone && matches.length === 0;
  const myRole = me?.role || "host";
  const game = room?.game || null;

  // 店マッチ（決まったジャンル → 四谷の店を2台でスワイプ）
  const decidedGenre = room?.decidedGenre || null;
  const storeDeck = decidedGenre ? getStoresByGenre(decidedGenre) : [];
  const myStoreDone = me?.storePhase === "done";
  const oppStoreDone = opp?.storePhase === "done";
  const bothStoreDone = opponentPresent && myStoreDone && oppStoreDone;
  const storeMatches = bothStoreDone
    ? storeDeck.filter((s) => (me.storeLikes || []).includes(s.id) && (opp.storeLikes || []).includes(s.id))
    : [];
  const decideGenre = (id) => setShared({ decidedGenre: id });

  // ラウンド変更（もう一回）を検知して自分のスワイプをリセット
  useEffect(() => {
    if (view !== "room" || !room) return;
    const r = room.round || 0;
    if (r !== seenRound.current) {
      seenRound.current = r;
      if (r !== 0) update({ phase: "swiping", likes: [], storePhase: "swiping", storeLikes: [] });
    }
  }, [room, view, update]);

  // マッチ不成立になったら、ホストが対戦カード＋seedを初期化（ゲーム選択へ）
  useEffect(() => {
    if (view !== "room" || !noMatch || myRole !== "host" || game) return;
    const hostId = ids.find((id) => players[id].role === "host");
    const guestId = ids.find((id) => players[id].role === "guest");
    const rnd = () => GENRES[Math.floor(Math.random() * GENRES.length)].id;
    const hostChamp = players[hostId]?.likes?.[0] || rnd();
    let guestChamp = (players[guestId]?.likes || []).find((x) => x !== hostChamp) || rnd();
    if (guestChamp === hostChamp) guestChamp = GENRES.find((g) => g.id !== hostChamp).id;
    setGame({ hostChamp, guestChamp, seed: newSeed(), id: null, phase: "pick", started: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, noMatch, myRole, game]);

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

  // 最初から遊び直す（ジャンルスワイプへ）。共有状態を初期化して両者リセット。
  const playAgain = () => setShared({ round: Date.now(), decidedGenre: null, game: null });

  // 部屋内のステージを room 状態から導出
  const stage = !opponentPresent
    ? "waiting"
    : decidedGenre
      ? storeDeck.length === 0
        ? "storeEmpty"
        : !myStoreDone
          ? "storeSwipe"
          : !bothStoreDone
            ? "storeWait"
            : "storeResult"
      : bothDone
        ? "result"
        : meDone
          ? "swipeWait"
          : "swipe";

  return (
    <div className="mm-arena relative flex flex-1 flex-col overflow-hidden px-5 py-8">
      <div className="mm-lines" aria-hidden />
      <MuteToggle />

      {mounted && !isOnline && (
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

            {/* 結果：マッチ成立 */}
            {stage === "result" && matches.length > 0 && (
              <div className="flex w-full flex-col items-center text-center">
                <span className="text-6xl drop-shadow-lg">🎉</span>
                <h2 className="mt-4 text-3xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  マッチ<span className="mm-gold">成立</span>！
                </h2>
                <p className="mt-2 text-sm font-medium text-white/70">
                  タップして、このジャンルのお店を決めよう
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  {matches.map((id) => {
                    const g = getGenre(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { playPush(); decideGenre(id); }}
                        className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border-[3px] border-white bg-gradient-to-r ${g.gradient} px-6 py-4 text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.12)] transition-all active:translate-y-[4px] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)]`}
                      >
                        <span className="btn-shine pointer-events-none absolute inset-0" />
                        <span className="relative text-lg font-black italic">{g.emoji} {g.label}</span>
                        <span className="relative -skew-x-6 text-xs font-black tracking-widest text-white/95">この店へ ▶</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex w-full flex-col gap-3">
                  <Button3D tone="neutral" onClick={playAgain} className="w-full px-8 text-sm">
                    もう一回（ジャンルから）
                  </Button3D>
                  <Button3D tone="neutral" onClick={leaveRoom} className="w-full px-8 text-sm">
                    部屋を出る
                  </Button3D>
                </div>
              </div>
            )}

            {/* 結果：不成立 → ミニゲームで決着（選択画面）*/}
            {stage === "result" && matches.length === 0 && (
              <div className="flex w-full flex-col items-center text-center">
                {!game && (
                  <div className="flex items-center gap-3 text-white/80">
                    <span className="h-3 w-3 animate-ping rounded-full bg-amber-300" />
                    <span className="text-sm font-black italic">対戦を準備中…</span>
                  </div>
                )}
                {game && game.phase === "pick" && (
                  <>
                    <span className="-skew-x-6 rounded-md border-2 border-rose-400/70 bg-rose-500/15 px-4 py-1 text-xs font-black italic tracking-widest text-rose-200">
                      意見、真っ二つ！
                    </span>
                    <h2 className="mt-3 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      勝負の<span className="mm-gold">しかた</span>を選ぼう
                    </h2>
                    <div className="mt-4 flex w-full items-center justify-center gap-2 text-white">
                      <span className="flex-1 rounded-xl border-2 border-rose-400/70 bg-rose-500/10 px-2 py-2 text-sm font-black">
                        {(myRole === "host" ? getGenre(game.hostChamp) : getGenre(game.guestChamp))?.emoji}{" "}
                        {(myRole === "host" ? getGenre(game.hostChamp) : getGenre(game.guestChamp))?.label}
                      </span>
                      <span className="text-lg font-black italic text-amber-300">VS</span>
                      <span className="flex-1 rounded-xl border-2 border-sky-400/70 bg-sky-500/10 px-2 py-2 text-sm font-black">
                        {(myRole === "host" ? getGenre(game.guestChamp) : getGenre(game.hostChamp))?.emoji}{" "}
                        {(myRole === "host" ? getGenre(game.guestChamp) : getGenre(game.hostChamp))?.label}
                      </span>
                    </div>
                    <div className="mt-6 flex w-full flex-col gap-3">
                      {MINI_GAMES.map((mg) => (
                        <button
                          key={mg.id}
                          type="button"
                          disabled={!mg.ready}
                          onClick={() => {
                            if (!mg.ready) return;
                            playPush();
                            setGame({ id: mg.id, phase: "play", started: false });
                          }}
                          className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border-[3px] px-5 py-4 text-left text-white transition-all duration-100 ease-out ${
                            mg.ready
                              ? `border-white bg-gradient-to-r ${mg.gradient} shadow-[0_6px_0_0_rgba(0,0,0,0.5),0_0_22px_rgba(255,255,255,0.12)] active:translate-y-[4px] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)]`
                              : "border-white/20 bg-white/5 opacity-55"
                          }`}
                        >
                          {mg.ready && <span className="btn-shine pointer-events-none absolute inset-0" />}
                          <span className="relative text-4xl drop-shadow">{mg.emoji}</span>
                          <span className="relative">
                            <span className="block text-lg font-black italic drop-shadow">{mg.name}</span>
                            <span className="block text-xs font-bold text-white/85">{mg.desc}</span>
                          </span>
                          <span className="relative ml-auto text-xl font-black italic text-white/80">{mg.ready ? "▶" : "🔒"}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {game && game.phase === "play" && (
                  <div className="flex items-center gap-3 text-white/70">
                    <span className="h-3 w-3 animate-ping rounded-full bg-amber-300" />
                    <span className="text-sm font-black italic">対戦中…</span>
                  </div>
                )}
                <Button3D tone="neutral" onClick={leaveRoom} className="mt-8 px-10 text-sm">
                  部屋を出る
                </Button3D>
              </div>
            )}

            {/* 店マッチ：このジャンルの四谷の店を2台でスワイプ */}
            {stage === "storeSwipe" && (
              <div className="flex w-full flex-col items-center">
                <p className="mb-3 -skew-x-6 rounded-md border-2 border-amber-300/70 bg-amber-400/15 px-4 py-1 text-xs font-black italic tracking-widest text-amber-200">
                  🍽️ {getGenre(decidedGenre)?.label}の店をスワイプ！
                </p>
                <SwipeDeck
                  key={`store-${decidedGenre}-${room?.round || 0}`}
                  cards={storeDeck}
                  renderCard={(card) => <StoreCard card={card} />}
                  likeLabel="行きたい"
                  nopeLabel="パス"
                  onFinish={(liked) => update({ storeLikes: liked, storePhase: "done" })}
                />
              </div>
            )}

            {stage === "storeWait" && (
              <div className="flex w-full flex-col items-center text-center">
                <span className="text-6xl drop-shadow-lg">✅</span>
                <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  お店えらび完了！
                </h2>
                <div className="mt-6 flex items-center gap-3 text-white/80">
                  <span className="h-3 w-3 animate-ping rounded-full bg-sky-300" />
                  <span className="text-sm font-black italic">相手がえらび中…</span>
                </div>
                <Button3D tone="neutral" onClick={leaveRoom} className="mt-8 px-10 text-sm">
                  部屋を出る
                </Button3D>
              </div>
            )}

            {stage === "storeResult" && (
              <div className="flex w-full flex-col items-center text-center">
                {storeMatches.length > 0 ? (
                  <>
                    <span className="text-6xl drop-shadow-lg">🥳</span>
                    <h2 className="mt-4 text-3xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      お店<span className="mm-gold">決定</span>！
                    </h2>
                    <p className="mt-2 text-sm font-medium text-white/70">二人とも「行きたい」お店</p>
                    <div className="mt-6 flex w-full flex-col gap-3">
                      {storeMatches.map((s) => (
                        <div key={s.id} className="mm-panel rounded-2xl border-2 border-amber-300/70 p-5 text-left">
                          <p className="text-lg font-black italic text-white">{s.name}</p>
                          <p className="mt-1 text-sm font-medium text-white/65">{s.copy}</p>
                          <p className="mt-3 text-sm font-bold text-amber-300">{s.price} ・ 四ツ谷駅 徒歩{s.walk}分</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-6xl drop-shadow-lg">🤝</span>
                    <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      完全一致はなし…
                    </h2>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                      どちらかが「行きたい」お店から選ぼう
                    </p>
                    <div className="mt-6 flex w-full flex-col gap-3">
                      {storeDeck
                        .filter((s) => (me.storeLikes || []).includes(s.id) || (opp.storeLikes || []).includes(s.id))
                        .map((s) => (
                          <div key={s.id} className="mm-panel rounded-2xl border border-white/20 p-4 text-left">
                            <p className="font-black italic text-white">{s.name}</p>
                            <p className="mt-1 text-xs font-medium text-white/55">{s.price} ・ 徒歩{s.walk}分</p>
                          </div>
                        ))}
                    </div>
                  </>
                )}
                <div className="mt-8 flex w-full flex-col gap-3">
                  <Button3D onClick={playAgain} className="w-full px-8 text-base">
                    もう一回あそぶ
                  </Button3D>
                  <Button3D tone="neutral" onClick={leaveRoom} className="w-full px-8 text-sm">
                    部屋を出る
                  </Button3D>
                </div>
              </div>
            )}

            {stage === "storeEmpty" && (
              <div className="flex w-full flex-col items-center text-center">
                <span className="text-6xl drop-shadow-lg">🙇</span>
                <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  {getGenre(decidedGenre)?.label}の四谷の店は準備中
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                  このジャンルの四谷のお店は、まだ登録されていません。
                  <br />
                  店マッチは今のところ<span className="font-bold text-amber-300">四谷限定</span>です。
                </p>
                <div className="mt-8 flex w-full flex-col gap-3">
                  <Button3D onClick={playAgain} className="w-full px-8 text-base">
                    もう一回あそぶ
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

      {/* ミニゲーム本体（全画面オーバーレイ・ルート直下）*/}
      {view === "room" &&
        stage === "result" &&
        matches.length === 0 &&
        game &&
        game.phase === "play" &&
        (() => {
          const props = {
            hostGenre: getGenre(game.hostChamp),
            guestGenre: getGenre(game.guestChamp),
            myRole,
            seed: game.seed,
            started: !!game.started,
            onStart: () => setGame({ started: true }),
            onRematch: () => setGame({ seed: newSeed(), started: false }),
            onChangeGame: () => setGame({ id: null, phase: "pick", started: false, seed: newSeed() }),
            onLeave: leaveRoom,
            onDecided: (genreId) => decideGenre(genreId),
          };
          if (game.id === "slot") return <MeshiSlotNet {...props} />;
          if (game.id === "amida") return <MeshiAmidaNet {...props} />;
          if (game.id === "battle")
            return (
              <MeshiBattleNet
                hostGenre={getGenre(game.hostChamp)}
                guestGenre={getGenre(game.guestChamp)}
                myRole={myRole}
                battle={game.battle}
                writeBattle={(b) => setGame({ battle: b })}
                onRematch={() => setGame({ battle: { phase: "vs" } })}
                onChangeGame={() => setGame({ id: null, phase: "pick", started: false, battle: null })}
                onLeave={leaveRoom}
                onDecided={(genreId) => decideGenre(genreId)}
              />
            );
          return null;
        })()}
    </div>
  );
}
