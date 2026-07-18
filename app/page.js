"use client";

import { useState } from "react";
import { GENRES, getGenre, getStoresByGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";

const genreCards = GENRES.map((g) => ({ ...g }));

// トップ画面の背景：ジャンル横断でよだれが出そうな料理を横に流し続ける
const MARQUEE_ROWS = [
  { items: "🍜🍣🍕🍔🍟🌮🍤🍱🍛🥟🍲🍢🌭🥘", dir: "left", dur: "42s" },
  { items: "🥩🍖🍗🥓🧀🥪🍝🍠🍥🥮🍚🍙🫕🍲", dir: "right", dur: "58s" },
  { items: "🍩🍰🧁🍨🍧🍦🍫🍬🍭🥞🧇🥐🍮🍯", dir: "left", dur: "50s" },
  { items: "🍎🍓🍇🍑🍊🍌🥑🍅🌽🥕🫐🍒🥝🍉", dir: "right", dur: "64s" },
  { items: "🍜🍣🍕🍔🍟🌮🍤🍱🍛🥟🍲🍢🌭🥘", dir: "left", dur: "46s" },
];

function MarqueeRow({ items, dir, dur }) {
  const seq = [...(items + items)];
  return (
    <div
      className="food-marquee-row flex"
      style={{ animation: `food-marquee-${dir} ${dur} linear infinite` }}
    >
      {seq.map((emoji, i) => (
        <span
          key={i}
          className="mx-1.5 select-none text-6xl drop-shadow-lg sm:mx-3 sm:text-7xl"
        >
          {emoji}
        </span>
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
      {/* 食欲をそそる暖色グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500" />
      {/* 横に流れ続ける料理たち（画面いっぱいに敷き詰める） */}
      <div className="absolute inset-0 flex flex-col justify-center gap-1 sm:gap-2">
        {MARQUEE_ROWS.map((row, i) => (
          <MarqueeRow key={i} items={row.items} dir={row.dir} dur={row.dur} />
        ))}
      </div>
      {/* ほんのり温かみを足す程度のごく薄いビネット（色は残す） */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/15 via-transparent to-amber-100/10" />
    </div>
  );
}

function GenreCard({ card }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${card.gradient} p-8 text-white shadow-xl`}
    >
      <span className="text-8xl drop-shadow-lg">{card.emoji}</span>
      <p className="mt-6 text-3xl font-black tracking-wide drop-shadow">{card.label}</p>
      <p className="mt-2 text-sm font-medium text-white/80">今日の気分はコレ？</p>
    </div>
  );
}

function StoreCard({ card }) {
  const genre = getGenre(card.genre);
  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div
        className={`flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${genre.gradient}`}
      >
        <span className="text-7xl drop-shadow-lg">{genre.emoji}</span>
      </div>
      <p className="mt-5 text-xl font-bold text-slate-900">{card.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.copy}</p>
      <div className="mt-auto space-y-2 pt-4">
        <p className="text-sm font-semibold text-slate-800">
          {card.price} ・ 四ツ谷駅 徒歩{card.walk}分
        </p>
        <div className="flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
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
      <h2 className="mt-6 text-2xl font-black text-slate-900">
        {player}の番！
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        スマホを{player}に渡してください。
        <br />
        {phase === "genre" ? "食べたいジャンル" : "気になるお店"}を直感でスワイプ！
      </p>
      <button
        type="button"
        onClick={onReady}
        className="mt-8 rounded-full bg-slate-900 px-10 py-4 text-base font-bold text-white shadow-lg transition active:scale-95"
      >
        準備OK、スタート
      </button>
    </div>
  );
}

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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-orange-50 via-rose-50 to-slate-50 px-5 py-10">
      {step === "intro" && <FoodMarqueeBackground />}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== イントロ ===== */}
        {step === "intro" && (
          <div className="flex w-full flex-col items-center rounded-[2rem] border border-white/70 bg-white/60 px-6 py-8 text-center shadow-2xl shadow-orange-900/20 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-600">
              メシマチ
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 drop-shadow-sm">
              今日なに食べる？は
              <br />
              スワイプで決める
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">
              二人で交代でスワイプして、
              <br />
              お互い「アリ！」だったジャンルがマッチ。
              <br />
              全国どこでも、今日から使えます。
            </p>
            <div className="mt-6 w-full rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-left text-xs leading-relaxed text-amber-800">
              <p className="font-bold">🏢 2階構成</p>
              <p className="mt-1">1階：ジャンルマッチ（全国どこでも）</p>
              <p>2階：店マッチ（四谷限定・厳選30店）</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("g1")}
              className="mt-8 rounded-full bg-rose-500 px-12 py-4 text-lg font-black text-white shadow-lg shadow-rose-300/60 transition hover:bg-rose-600 active:scale-95"
            >
              二人でスタート 🍽️
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
                <span className="text-6xl">🎉</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">マッチ成立！</h2>
                <p className="mt-2 text-sm text-slate-600">
                  二人とも「アリ！」だったジャンル
                </p>
                <div className="mt-6 flex w-full flex-col gap-3">
                  {genreMatches.map((id) => {
                    const g = getGenre(id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between rounded-2xl bg-gradient-to-r ${g.gradient} px-6 py-4 text-white shadow-md`}
                      >
                        <span className="text-lg font-black">
                          {g.emoji} {g.label}
                        </span>
                        <span className="text-xs font-bold text-white/90">MATCH</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("gate")}
                  className="mt-8 w-full rounded-full bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-lg transition active:scale-95"
                >
                  次へ：お店を決める →
                </button>
              </>
            ) : (
              <>
                <span className="text-6xl">😢</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  マッチなし…
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  二人の「アリ！」が重なりませんでした。
                  <br />
                  少しゆるめにもう一周してみよう！
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setGenreLikes({ p1: [], p2: [] });
                    setStep("g1");
                  }}
                  className="mt-8 rounded-full bg-rose-500 px-10 py-4 text-base font-black text-white shadow-lg transition active:scale-95"
                >
                  もう一周する 🔁
                </button>
              </>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-4 text-xs font-medium text-slate-400 underline"
            >
              最初からやり直す
            </button>
          </div>
        )}

        {/* ===== 2階への分岐ゲート ===== */}
        {step === "gate" && (
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-6xl">📍</span>
            <h2 className="mt-4 text-2xl font-black text-slate-900">
              いま、四ツ谷にいる？
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              四ツ谷エリアにいるなら、厳選30店から
              <br />
              「お店マッチ」に進めます（四谷限定機能）
            </p>
            <div className="mt-8 flex w-full flex-col gap-3">
              {genreMatches.map((id) => {
                const g = getGenre(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => startStoreMatch(id)}
                    className={`rounded-2xl bg-gradient-to-r ${g.gradient} px-6 py-4 text-base font-black text-white shadow-md transition active:scale-95`}
                  >
                    {g.emoji} {g.label}のお店を二人で選ぶ →
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setStep("notYotsuya")}
              className="mt-6 w-full rounded-full border-2 border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-600 transition active:scale-95"
            >
              四ツ谷にはいない
            </button>
          </div>
        )}

        {/* ===== 四谷圏外エンド ===== */}
        {step === "notYotsuya" && (
          <div className="flex flex-col items-center text-center">
            <span className="text-6xl">🗾</span>
            <h2 className="mt-4 text-2xl font-black text-slate-900">
              ジャンルは決まった！
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              マッチしたジャンルのお店を、いつもの地図アプリで探そう。
              <br />
              <span className="font-bold text-rose-500">
                お店マッチは現在、四谷エリア限定。
              </span>
              <br />
              あなたの街にも欲しかったら、声を聞かせてください！
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {genreMatches.map((id) => {
                const g = getGenre(id);
                return (
                  <span
                    key={id}
                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow"
                  >
                    {g.emoji} {g.label}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-8 rounded-full bg-slate-900 px-10 py-4 text-base font-bold text-white shadow-lg transition active:scale-95"
            >
              もう一回あそぶ
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
            likeLabel="行きたい！"
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
            likeLabel="行きたい！"
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
                <span className="text-6xl">🥳</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  お店が決まった！
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  二人とも「行きたい！」のお店
                </p>
                <div className="mt-6 flex w-full flex-col gap-4">
                  {storeMatches.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border-2 border-rose-300 bg-white p-5 text-left shadow-lg"
                    >
                      <p className="text-lg font-black text-slate-900">{s.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{s.copy}</p>
                      <p className="mt-3 text-sm font-semibold text-rose-500">
                        {s.price} ・ 四ツ谷駅 徒歩{s.walk}分
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="text-6xl">🤔</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  完全一致はなし…
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  どちらかが「行きたい！」したお店から選んでみよう
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
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow"
                      >
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.price} ・ 徒歩{s.walk}分
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-8 rounded-full bg-slate-900 px-10 py-4 text-base font-bold text-white shadow-lg transition active:scale-95"
            >
              もう一回あそぶ
            </button>
          </div>
        )}
      </div>

      <p className="mt-10 text-center text-[10px] text-slate-400">
        ※ 店舗情報はデモ用のサンプルデータです
      </p>
    </div>
  );
}
