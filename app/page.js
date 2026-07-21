"use client";

import { useState, useEffect, useRef } from "react";
import { GENRES, getGenre, getStoresByGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";
import { MeshiBattle } from "@/components/MeshiBattle";
import { playPush } from "@/components/sound";

const genreCards = GENRES.map((g) => ({ ...g }));

// 画像は public/images/<id>.jpg を参照（basePath込み）。無ければ絵文字にフォールバック
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// 立体感＋つや＋押し込み演出の共通ボタン
const BTN_TONES = {
  primary:
    "bg-gradient-to-b from-orange-400 to-orange-600 text-white ring-orange-300/60 shadow-[0_7px_0_0_#9a3412,0_12px_18px_-4px_rgba(234,88,12,0.55)] hover:from-orange-400 hover:to-orange-500 active:shadow-[0_1px_0_0_#9a3412,0_4px_10px_-3px_rgba(234,88,12,0.5)]",
  neutral:
    "bg-gradient-to-b from-white to-stone-100 text-stone-700 ring-stone-300/70 shadow-[0_6px_0_0_#d6d3d1,0_10px_16px_-4px_rgba(120,113,108,0.35)] hover:to-stone-50 active:shadow-[0_1px_0_0_#d6d3d1,0_4px_8px_-3px_rgba(120,113,108,0.3)]",
};

function Button3D({ children, onClick, tone = "primary", gradient, className = "", type = "button" }) {
  const light = tone === "neutral";
  const toneCls =
    tone === "genre"
      ? `bg-gradient-to-b ${gradient} text-white ring-white/40 shadow-[0_6px_0_0_rgba(0,0,0,0.30),0_12px_18px_-5px_rgba(0,0,0,0.35)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.30),0_4px_10px_-4px_rgba(0,0,0,0.3)]`
      : BTN_TONES[tone];
  return (
    <button
      type={type}
      onClick={(e) => {
        playPush();
        onClick?.(e);
      }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full py-4 font-black tracking-wide ring-1 transition-all duration-100 ease-out active:translate-y-[6px] ${toneCls} ${className}`}
    >
      {/* 上部のつや（光沢ハイライト） */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-1.5 top-1 h-[45%] rounded-full bg-gradient-to-b ${light ? "from-white/70" : "from-white/55"} to-transparent`}
      />
      {/* 走るツヤ */}
      <span aria-hidden className="btn-shine pointer-events-none absolute inset-0" />
      <span className={`relative ${light ? "" : "drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"}`}>
        {children}
      </span>
    </button>
  );
}

function GenreCard({ card }) {
  // 画像が読み込めたら全面写真、失敗したら絵文字表示にフォールバック
  const [hasPhoto, setHasPhoto] = useState(false);
  const imgRef = useRef(null);
  // SSRで既に読み込み完了している画像は onLoad が発火しないため、マウント時に判定
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setHasPhoto(true);
  }, []);
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br ${card.gradient} text-center text-white shadow-xl`}
    >
      {/* 絵文字ベース（写真が無い/読込前はこれが見える） */}
      {!hasPhoto && (
        <>
          <span className="text-8xl drop-shadow-lg">{card.emoji}</span>
          <p className="mt-6 text-3xl font-black tracking-wide drop-shadow">
            {card.label}
          </p>
          <p className="mt-2 text-sm font-bold text-white/85">
            今日の気分はコレ？
          </p>
        </>
      )}

      {/* 全面写真（object-cover）＋下部グラデ＋白のジャンル名 */}
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
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <p className="absolute inset-x-0 bottom-8 text-3xl font-black tracking-wide text-white drop-shadow-lg">
            {card.label}
          </p>
        </>
      )}
    </div>
  );
}

function StoreCard({ card }) {
  const genre = getGenre(card.genre);
  return (
    <div className="flex h-full w-full flex-col rounded-[2rem] border border-orange-100 bg-white p-6 shadow-xl">
      <div
        className={`flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${genre.gradient}`}
      >
        <span className="text-7xl drop-shadow-lg">{genre.emoji}</span>
      </div>
      <p className="mt-5 text-xl font-black text-stone-800">{card.name}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-stone-500">
        {card.copy}
      </p>
      <div className="mt-auto space-y-2 pt-4">
        <p className="text-sm font-bold text-orange-600">
          {card.price} ・ 四ツ谷駅 徒歩{card.walk}分
        </p>
        <div className="flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700"
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
      <h2 className="mt-6 text-2xl font-black text-stone-800">
        {player}の番！
      </h2>
      <p className="mt-3 text-sm font-medium leading-relaxed text-stone-500">
        スマホを{player}に渡してね。
        <br />
        {phase === "genre" ? "食べたいジャンル" : "気になるお店"}を直感でスワイプ！
      </p>
      <Button3D onClick={onReady} className="mt-8 px-10 text-base">
        準備OK、スタート
      </Button3D>
    </div>
  );
}

export default function MeshiMatchPage() {
  // step: intro → g1 → g1swipe → g2 → g2swipe → genreResult → gate → s1 → s1swipe → s2 → s2swipe → storeResult → notYotsuya
  const [step, setStep] = useState("intro");
  const [genreLikes, setGenreLikes] = useState({ p1: [], p2: [] });
  const [storeLikes, setStoreLikes] = useState({ p1: [], p2: [] });
  const [chosenGenre, setChosenGenre] = useState(null);
  const [battlePair, setBattlePair] = useState(null); // メシバトルの対戦カード
  const [battleWinner, setBattleWinner] = useState(null); // バトルで決まったジャンルID

  const genreMatches = genreLikes.p1.filter((id) => genreLikes.p2.includes(id));
  // マッチ成立ならその一覧、なければバトルの勝者を「決まったジャンル」として扱う
  const decidedGenres =
    genreMatches.length > 0 ? genreMatches : battleWinner ? [battleWinner] : [];
  const storeDeck = chosenGenre ? getStoresByGenre(chosenGenre) : [];
  const storeMatches = storeDeck.filter(
    (s) => storeLikes.p1.includes(s.id) && storeLikes.p2.includes(s.id)
  );

  // 好みが重ならなかった二人の「代表選手」を1品ずつ選ぶ（p1/p2は重複なし）
  const pickChampions = (p1, p2) => {
    const pool = GENRES.map((g) => g.id);
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const youId = p1[0] || rand(pool);
    const oppId = p2.find((id) => id !== youId) || rand(pool.filter((id) => id !== youId));
    return { you: getGenre(youId), opp: getGenre(oppId) };
  };

  const reset = () => {
    setStep("intro");
    setGenreLikes({ p1: [], p2: [] });
    setStoreLikes({ p1: [], p2: [] });
    setChosenGenre(null);
    setBattlePair(null);
    setBattleWinner(null);
  };

  const startStoreMatch = (genreId) => {
    setChosenGenre(genreId);
    setStoreLikes({ p1: [], p2: [] });
    // このジャンルの四谷サンプル店が無ければ「準備中」画面へ
    setStep(getStoresByGenre(genreId).length > 0 ? "s1" : "storeEmpty");
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-orange-50 via-rose-50 to-amber-50 px-5 py-8">
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== トップ：着地した瞬間にスワイプを試せる ===== */}
        {step === "intro" && (
          <div className="flex w-full flex-col items-center">
            <h1 className="mb-6 text-center text-3xl font-black leading-snug tracking-wide text-stone-800">
              「どこでもいい」を
              <br />
              <span className="text-orange-500">卒業</span>しよう
            </h1>

            <SwipeDeck
              key="demo"
              cards={genreCards}
              loop
              controls={false}
              heightClass="h-[42vh] max-h-[400px] min-h-[280px]"
              renderCard={(card) => <GenreCard key={card.id} card={card} />}
              onFinish={() => {}}
            />

            <Button3D onClick={() => setStep("g1")} className="mt-8 px-14 text-lg">
              二人ではじめる
            </Button3D>
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
            renderCard={(card) => <GenreCard key={card.id} card={card} />}
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
            renderCard={(card) => <GenreCard key={card.id} card={card} />}
            onFinish={(liked) => {
              setGenreLikes((prev) => ({ ...prev, p2: liked }));
              const matches = genreLikes.p1.filter((id) => liked.includes(id));
              if (matches.length > 0) {
                setStep("genreResult");
              } else {
                // マッチなし → メシバトルで決着をつける
                setBattlePair(pickChampions(genreLikes.p1, liked));
                setBattleWinner(null);
                setStep("battle");
              }
            }}
          />
        )}

        {/* ===== マッチしなかったらメシバトルで決着 ===== */}
        {step === "battle" && battlePair && (
          <MeshiBattle
            you={battlePair.you}
            opp={battlePair.opp}
            onDecided={(genreId) => {
              setBattleWinner(genreId);
              setStep("gate");
            }}
            onQuit={() => {
              // バトルをやめる → もう一周ジャンル選びからやり直す
              setBattlePair(null);
              setGenreLikes({ p1: [], p2: [] });
              setStep("g1");
            }}
          />
        )}

        {step === "genreResult" && (
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-6xl">🎉</span>
            <h2 className="mt-4 text-2xl font-black text-stone-800">
              マッチ成立！
            </h2>
            <p className="mt-2 text-sm font-medium text-stone-500">
              二人とも「アリ」だったジャンル
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
                    <span className="text-xs font-black tracking-widest text-white/90">
                      MATCH
                    </span>
                  </div>
                );
              })}
            </div>
            <Button3D
              onClick={() => setStep("gate")}
              className="mt-8 w-full px-8 text-base"
            >
              次へ：お店を決める
            </Button3D>
            <button
              type="button"
              onClick={() => {
                playPush();
                reset();
              }}
              className="mt-5 text-xs font-bold tracking-wide text-stone-400 underline underline-offset-4 transition hover:text-stone-600"
            >
              最初からやり直す
            </button>
          </div>
        )}

        {/* ===== 2階への分岐ゲート ===== */}
        {step === "gate" && (
          <div className="flex w-full flex-col items-center text-center">
            {battleWinner && genreMatches.length === 0 && (
              <div className="mb-5 rounded-full bg-orange-100 px-5 py-2 text-sm font-black text-orange-700 shadow-sm">
                🔥 メシバトルの結果、{getGenre(battleWinner)?.emoji}
                {getGenre(battleWinner)?.label}に決定！
              </div>
            )}
            <span className="text-6xl">📍</span>
            <h2 className="mt-4 text-2xl font-black text-stone-800">
              いま、四ツ谷にいる？
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-stone-500">
              四ツ谷にいるなら、厳選30店の店マッチへ！
            </p>
            <div className="mt-8 flex w-full flex-col gap-3">
              {decidedGenres.map((id) => {
                const g = getGenre(id);
                return (
                  <Button3D
                    key={id}
                    tone="genre"
                    gradient={g.gradient}
                    onClick={() => startStoreMatch(id)}
                    className="w-full px-6 text-base"
                  >
                    {g.emoji} {g.label}のお店を選ぶ
                  </Button3D>
                );
              })}
            </div>
            <Button3D
              tone="neutral"
              onClick={() => setStep("notYotsuya")}
              className="mt-6 w-full px-8 text-sm"
            >
              四ツ谷にはいない
            </Button3D>
          </div>
        )}

        {/* ===== 四谷圏外エンド ===== */}
        {step === "notYotsuya" && (
          <div className="flex flex-col items-center text-center">
            <span className="text-6xl">🗾</span>
            <h2 className="mt-4 text-2xl font-black text-stone-800">
              ジャンルは決まった！
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-stone-500">
              マッチしたジャンルのお店を地図アプリで探そう。
              <br />
              <span className="font-bold text-orange-500">
                店マッチは今のところ四谷限定。
              </span>
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {decidedGenres.map((id) => {
                const g = getGenre(id);
                return (
                  <span
                    key={id}
                    className={`rounded-full bg-gradient-to-r ${g.gradient} px-4 py-2 text-sm font-black text-white shadow`}
                  >
                    {g.emoji} {g.label}
                  </span>
                );
              })}
            </div>
            <Button3D onClick={reset} className="mt-8 px-10 text-base">
              もう一回あそぶ
            </Button3D>
          </div>
        )}

        {/* ===== このジャンルの店が未登録 ===== */}
        {step === "storeEmpty" && (
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-6xl">🙇</span>
            <h2 className="mt-4 text-2xl font-black text-stone-800">
              {getGenre(chosenGenre)?.label}のお店は準備中
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-stone-500">
              このジャンルの四谷のお店は、まだ登録されていません。
              <br />
              別のジャンルを選んでみてね。
            </p>
            <div className="mt-8 flex w-full flex-col gap-3">
              <Button3D
                onClick={() => setStep("gate")}
                className="w-full px-8 text-base"
              >
                別のジャンルを選ぶ
              </Button3D>
              <Button3D
                tone="neutral"
                onClick={reset}
                className="w-full px-8 text-sm"
              >
                最初からやり直す
              </Button3D>
            </div>
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
                <span className="text-6xl">🥳</span>
                <h2 className="mt-4 text-2xl font-black text-stone-800">
                  お店が決まった！
                </h2>
                <p className="mt-2 text-sm font-medium text-stone-500">
                  二人とも「行きたい」お店
                </p>
                <div className="mt-6 flex w-full flex-col gap-4">
                  {storeMatches.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border-2 border-orange-200 bg-white p-5 text-left shadow-md"
                    >
                      <p className="text-lg font-black text-stone-800">{s.name}</p>
                      <p className="mt-1 text-sm font-medium text-stone-500">
                        {s.copy}
                      </p>
                      <p className="mt-3 text-sm font-bold text-orange-600">
                        {s.price} ・ 四ツ谷駅 徒歩{s.walk}分
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="text-6xl">🤔</span>
                <h2 className="mt-4 text-2xl font-black text-stone-800">
                  完全一致はなし…
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-stone-500">
                  どちらかが「行きたい」お店から選んでみよう
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
                        className="rounded-2xl border border-orange-100 bg-white p-4 text-left shadow-sm"
                      >
                        <p className="font-black text-stone-800">{s.name}</p>
                        <p className="mt-1 text-xs font-medium text-stone-400">
                          {s.price} ・ 徒歩{s.walk}分
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
            <Button3D onClick={reset} className="mt-8 px-10 text-base">
              もう一回あそぶ
            </Button3D>
          </div>
        )}
      </div>

      <p className="relative z-10 mt-8 text-center text-[10px] font-medium tracking-wide text-stone-400">
        ※ 店舗情報はデモ用のサンプルデータです
      </p>
    </div>
  );
}
