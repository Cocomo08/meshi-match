"use client";

import { useState } from "react";
import { GENRES, getGenre, getStoresByGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";

const genreCards = GENRES.map((g) => ({ ...g }));

// トップ画面の背景：実写の料理写真を横に流し続ける
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PHOTOS = Array.from(
  { length: 9 },
  (_, i) => `food-${String(i + 1).padStart(2, "0")}.jpg`
);

// 各行で開始位置をずらして同じ写真が縦に並ばないようにする
const PHOTO_ROWS = [
  { offset: 0, dir: "left", dur: "55s" },
  { offset: 3, dir: "right", dur: "72s" },
  { offset: 6, dir: "left", dur: "62s" },
  { offset: 1, dir: "right", dur: "80s" },
];

function rotate(arr, n) {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

function PhotoMarqueeRow({ offset, dir, dur }) {
  // items+items で translateX(-50%) がちょうど1周分になり継ぎ目なくループする
  const seq = [...rotate(PHOTOS, offset), ...rotate(PHOTOS, offset)];
  return (
    <div
      className="food-marquee-row flex"
      style={{ animation: `food-marquee-${dir} ${dur} linear infinite` }}
    >
      {seq.map((name, i) => (
        <div
          key={i}
          className="mx-2 h-32 w-48 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-xl sm:h-40 sm:w-60"
        >
          <img
            src={`${ASSET_BASE}/photos/${name}`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function FoodMarqueeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-neutral-950" />
      {/* 横に流れ続ける料理写真 */}
      <div className="absolute inset-0 flex flex-col justify-center gap-3 sm:gap-4">
        {PHOTO_ROWS.map((row, i) => (
          <PhotoMarqueeRow key={i} offset={row.offset} dir={row.dir} dur={row.dur} />
        ))}
      </div>
      {/* 黒基調のシックなスクリム（写真を落ち着かせ高級感を出す） */}
      <div className="absolute inset-0 bg-neutral-950/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-neutral-950/85" />
    </div>
  );
}

// 金の細い区切り線（高級感のアクセント）
function GoldRule() {
  return <div className="my-4 h-px w-12 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />;
}

function GenreCard({ card }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-8 text-center shadow-2xl shadow-black/60">
      {/* ジャンルの色をほのかな光として残す */}
      <div
        className={`pointer-events-none absolute inset-x-10 top-8 h-36 rounded-full bg-gradient-to-br ${card.gradient} opacity-25 blur-3xl`}
      />
      <span className="relative text-8xl drop-shadow-lg">{card.emoji}</span>
      <p className="relative mt-6 text-3xl font-semibold tracking-[0.15em] text-amber-50">
        {card.label}
      </p>
      <p className="relative mt-3 text-xs tracking-widest text-stone-400">
        今日の気分はコレ？
      </p>
    </div>
  );
}

function StoreCard({ card }) {
  const genre = getGenre(card.genre);
  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-white/10 bg-neutral-900 p-6 shadow-2xl shadow-black/60">
      <div
        className={`relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${genre.gradient}`}
      >
        <div className="absolute inset-0 bg-neutral-950/25" />
        <span className="relative text-7xl drop-shadow-lg">{genre.emoji}</span>
      </div>
      <p className="mt-5 text-xl font-semibold tracking-wide text-amber-50">
        {card.name}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{card.copy}</p>
      <div className="mt-auto space-y-2 pt-4">
        <p className="text-sm font-medium text-amber-200/90">
          {card.price} ・ 四ツ谷駅 徒歩{card.walk}分
        </p>
        <div className="flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Handoff({ player, phase, onReady }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-6xl">📱</span>
      <h2 className="mt-6 text-2xl font-semibold tracking-wide text-amber-50">
        {player}の番
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-stone-400">
        スマホを{player}に渡してください。
        <br />
        {phase === "genre" ? "食べたいジャンル" : "気になるお店"}を直感でスワイプ。
      </p>
      <button
        type="button"
        onClick={onReady}
        className="mt-8 rounded-full border border-amber-200/40 bg-white/5 px-10 py-4 text-base font-medium tracking-wide text-amber-100 backdrop-blur-sm transition hover:bg-white/10 active:scale-95"
      >
        準備OK、スタート
      </button>
    </div>
  );
}

// 主要CTA（金）
const goldBtn =
  "rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 px-10 py-4 text-base font-bold tracking-wide text-neutral-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-95";
// 補助ボタン（アウトライン）
const outlineBtn =
  "rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-medium tracking-wide text-stone-200 transition hover:bg-white/10 active:scale-95";

export default function MeshiMatchPage() {
  // step: intro → g1 → g1swipe → g2 → g2swipe → genreResult → gate → s1 → s1swipe → s2 → s2swipe → storeResult → notYotsuya
  const [step, setStep] = useState("intro");
  const [genreLikes, setGenreLikes] = useState({ p1: [], p2: [] });
  const [storeLikes, setStoreLikes] = useState({ p1: [], p2: [] });
  const [chosenGenre, setChosenGenre] = useState(null);

  const genreMatches = genreLikes.p1.filter((id) => genreLikes.p2.includes(id));
  const storeDeck = chosenGenre ? getStoresByGenre(chosenGenre) : [];
  const storeMatches = storeDeck.filter(
    (s) => storeLikes.p1.includes(s.id) && storeLikes.p2.includes(s.id)
  );

  const reset = () => {
    setStep("intro");
    setGenreLikes({ p1: [], p2: [] });
    setStoreLikes({ p1: [], p2: [] });
    setChosenGenre(null);
  };

  const startStoreMatch = (genreId) => {
    setChosenGenre(genreId);
    setStoreLikes({ p1: [], p2: [] });
    setStep("s1");
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-neutral-950 px-5 py-10">
      {step === "intro" && <FoodMarqueeBackground />}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== イントロ ===== */}
        {step === "intro" && (
          <div className="flex w-full flex-col items-center rounded-[2rem] border border-amber-200/25 bg-neutral-950/70 px-6 py-9 text-center shadow-2xl shadow-black/60 backdrop-blur-md">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.45em] text-amber-300">
              MESHIMACHI
            </p>
            <GoldRule />
            <h1 className="text-3xl font-semibold leading-snug tracking-wide text-stone-50">
              今日なに食べる？は
              <br />
              スワイプで決める
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-stone-300">
              二人で交代でスワイプして、
              <br />
              お互い惹かれたジャンルがマッチ。
              <br />
              全国どこでも、今日から。
            </p>
            <div className="mt-7 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left text-xs leading-relaxed text-stone-300">
              <p className="font-semibold tracking-wide text-amber-200">二層構成</p>
              <p className="mt-2">壱 ― ジャンルマッチ（全国どこでも）</p>
              <p className="mt-1">弐 ― 店マッチ（四谷限定・厳選30店）</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("g1")}
              className={`mt-8 px-12 ${goldBtn}`}
            >
              二人ではじめる
            </button>
          </div>
        )}

        {/* ===== 1階：ジャンルマッチ ===== */}
        {step === "g1" && (
          <Handoff player="1人目" phase="genre" onReady={() => setStep("g1swipe")} />
        )}
        {step === "g1swipe" && (
          <SwipeDeck
            key="g1"
            cards={genreCards}
            renderCard={(card) => <GenreCard card={card} />}
            onFinish={(liked) => {
              setGenreLikes((prev) => ({ ...prev, p1: liked }));
              setStep("g2");
            }}
          />
        )}
        {step === "g2" && (
          <Handoff player="2人目" phase="genre" onReady={() => setStep("g2swipe")} />
        )}
        {step === "g2swipe" && (
          <SwipeDeck
            key="g2"
            cards={genreCards}
            renderCard={(card) => <GenreCard card={card} />}
            onFinish={(liked) => {
              setGenreLikes((prev) => ({ ...prev, p2: liked }));
              setStep("genreResult");
            }}
          />
        )}

        {step === "genreResult" && (
          <div className="flex w-full flex-col items-center text-center">
            {genreMatches.length > 0 ? (
              <>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-amber-300">
                  MATCH
                </p>
                <GoldRule />
                <h2 className="text-2xl font-semibold tracking-wide text-stone-50">
                  マッチ成立
                </h2>
                <p className="mt-3 text-sm text-stone-400">
                  二人がともに惹かれたジャンル
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  {genreMatches.map((id) => {
                    const g = getGenre(id);
                    return (
                      <div
                        key={id}
                        className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 px-6 py-4 text-left"
                      >
                        <div
                          className={`pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r ${g.gradient} opacity-30 blur-2xl`}
                        />
                        <span className="relative text-lg font-semibold tracking-wide text-amber-50">
                          {g.emoji} {g.label}
                        </span>
                        <span className="relative text-[0.65rem] font-semibold tracking-[0.3em] text-amber-300">
                          MATCH
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("gate")}
                  className={`mt-8 w-full ${goldBtn}`}
                >
                  次へ ― お店を決める
                </button>
              </>
            ) : (
              <>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-stone-500">
                  NO MATCH
                </p>
                <GoldRule />
                <h2 className="text-2xl font-semibold tracking-wide text-stone-50">
                  マッチなし
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  二人の「好き」が重なりませんでした。
                  <br />
                  少しゆるめに、もう一周。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setGenreLikes({ p1: [], p2: [] });
                    setStep("g1");
                  }}
                  className={`mt-8 ${goldBtn}`}
                >
                  もう一周する
                </button>
              </>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-5 text-xs tracking-wide text-stone-500 underline underline-offset-4 transition hover:text-stone-300"
            >
              最初からやり直す
            </button>
          </div>
        )}

        {/* ===== 2階への分岐ゲート ===== */}
        {step === "gate" && (
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-5xl">📍</span>
            <h2 className="mt-5 text-2xl font-semibold tracking-wide text-stone-50">
              いま、四ツ谷にいますか
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              四ツ谷エリアにいるなら、厳選30店の
              <br />
              「店マッチ」へ進めます（四谷限定）。
            </p>
            <div className="mt-8 flex w-full flex-col gap-3">
              {genreMatches.map((id) => {
                const g = getGenre(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => startStoreMatch(id)}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 px-6 py-4 text-base font-semibold tracking-wide text-amber-50 transition hover:border-amber-200/40 active:scale-95"
                  >
                    <span
                      className={`pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r ${g.gradient} opacity-30 blur-2xl`}
                    />
                    <span className="relative">
                      {g.emoji} {g.label}のお店を選ぶ
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setStep("notYotsuya")}
              className={`mt-6 w-full ${outlineBtn}`}
            >
              四ツ谷にはいない
            </button>
          </div>
        )}

        {/* ===== 四谷圏外エンド ===== */}
        {step === "notYotsuya" && (
          <div className="flex flex-col items-center text-center">
            <span className="text-5xl">🗾</span>
            <h2 className="mt-5 text-2xl font-semibold tracking-wide text-stone-50">
              ジャンルは決まった
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              マッチしたジャンルのお店を、地図アプリで探そう。
              <br />
              <span className="text-amber-200/90">
                店マッチは現在、四谷エリア限定。
              </span>
              <br />
              あなたの街にも欲しかったら、声を。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {genreMatches.map((id) => {
                const g = getGenre(id);
                return (
                  <span
                    key={id}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium tracking-wide text-amber-50"
                  >
                    {g.emoji} {g.label}
                  </span>
                );
              })}
            </div>
            <button type="button" onClick={reset} className={`mt-8 ${goldBtn}`}>
              もう一度あそぶ
            </button>
          </div>
        )}

        {/* ===== 2階:店マッチ（四谷限定） ===== */}
        {step === "s1" && (
          <Handoff player="1人目" phase="store" onReady={() => setStep("s1swipe")} />
        )}
        {step === "s1swipe" && (
          <SwipeDeck
            key="s1"
            cards={storeDeck}
            renderCard={(card) => <StoreCard card={card} />}
            likeLabel="行きたい"
            nopeLabel="パス"
            onFinish={(liked) => {
              setStoreLikes((prev) => ({ ...prev, p1: liked }));
              setStep("s2");
            }}
          />
        )}
        {step === "s2" && (
          <Handoff player="2人目" phase="store" onReady={() => setStep("s2swipe")} />
        )}
        {step === "s2swipe" && (
          <SwipeDeck
            key="s2"
            cards={storeDeck}
            renderCard={(card) => <StoreCard card={card} />}
            likeLabel="行きたい"
            nopeLabel="パス"
            onFinish={(liked) => {
              setStoreLikes((prev) => ({ ...prev, p2: liked }));
              setStep("storeResult");
            }}
          />
        )}

        {step === "storeResult" && (
          <div className="flex w-full flex-col items-center text-center">
            {storeMatches.length > 0 ? (
              <>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-amber-300">
                  DECIDED
                </p>
                <GoldRule />
                <h2 className="text-2xl font-semibold tracking-wide text-stone-50">
                  お店が決まった
                </h2>
                <p className="mt-3 text-sm text-stone-400">
                  二人がともに「行きたい」お店
                </p>
                <div className="mt-6 flex w-full flex-col gap-4">
                  {storeMatches.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-amber-200/30 bg-neutral-900 p-5 text-left shadow-lg shadow-black/50"
                    >
                      <p className="text-lg font-semibold tracking-wide text-amber-50">
                        {s.name}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">{s.copy}</p>
                      <p className="mt-3 text-sm font-medium text-amber-200/90">
                        {s.price} ・ 四ツ谷駅 徒歩{s.walk}分
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-stone-500">
                  ALMOST
                </p>
                <GoldRule />
                <h2 className="text-2xl font-semibold tracking-wide text-stone-50">
                  完全一致はなし
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  どちらかが「行きたい」お店から選んでみよう。
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  {storeDeck
                    .filter(
                      (s) =>
                        storeLikes.p1.includes(s.id) || storeLikes.p2.includes(s.id)
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-white/10 bg-neutral-900 p-4 text-left"
                      >
                        <p className="font-semibold tracking-wide text-amber-50">
                          {s.name}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {s.price} ・ 徒歩{s.walk}分
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
            <button type="button" onClick={reset} className={`mt-8 ${goldBtn}`}>
              もう一度あそぶ
            </button>
          </div>
        )}
      </div>

      <p className="relative z-10 mt-10 text-center text-[10px] tracking-widest text-stone-600">
        ※ 店舗情報はデモ用のサンプルデータです
      </p>
    </div>
  );
}
