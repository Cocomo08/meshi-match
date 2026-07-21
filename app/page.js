"use client";

import { useState, useEffect, useRef } from "react";
import { GENRES, getGenre, getStoresByGenre } from "./data";
import { SwipeDeck } from "@/components/SwipeDeck";
import { MeshiBattle } from "@/components/MeshiBattle";
import {
  playPush,
  hydrateSound,
  isSoundEnabled,
  toggleSound,
  subscribeSound,
} from "@/components/sound";

const genreCards = GENRES.map((g) => ({ ...g }));

// 画像は public/images/<id>.jpg を参照（basePath込み）。無ければ絵文字にフォールバック
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// スマブラ風の立体ボタン（斜体・白フチ・グロー＋押し込み）
const BTN_TONES = {
  // ゴールドメタリック（メイン）
  primary:
    "text-stone-900 bg-gradient-to-b from-amber-200 to-amber-500 border-white shadow-[0_7px_0_0_#b45309,0_0_26px_rgba(255,200,80,0.5)] active:shadow-[0_2px_0_0_#b45309,0_0_26px_rgba(255,200,80,0.5)]",
  // ダークガラス（サブ）
  neutral:
    "text-white bg-white/10 border-white/60 shadow-[0_6px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5)]",
};

// 本体共通の消音トグル（メシバトルとも状態を共有）
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

function Button3D({ children, onClick, tone = "primary", gradient, className = "", type = "button" }) {
  const gold = tone === "primary";
  const toneCls =
    tone === "genre"
      ? `text-white border-white bg-gradient-to-b ${gradient} shadow-[0_6px_0_0_rgba(0,0,0,0.5),0_0_22px_rgba(255,255,255,0.18)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5),0_0_22px_rgba(255,255,255,0.18)]`
      : BTN_TONES[tone];
  return (
    <button
      type={type}
      onClick={(e) => {
        playPush();
        onClick?.(e);
      }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl border-[3px] py-4 font-black italic tracking-wide transition-all duration-100 ease-out active:translate-y-[5px] ${toneCls} ${className}`}
    >
      {/* 上部のつや（光沢ハイライト） */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-1.5 top-1 h-[42%] rounded-lg bg-gradient-to-b ${gold ? "from-white/70" : "from-white/35"} to-transparent`}
      />
      {/* 走るツヤ */}
      <span aria-hidden className="btn-shine pointer-events-none absolute inset-0" />
      <span className={`relative ${gold ? "" : "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"}`}>
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
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-[3px] border-white/85 bg-gradient-to-br ${card.gradient} text-center text-white shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_28px_rgba(255,255,255,0.12)]`}
    >
      {/* カテゴリバッジ（斜め） */}
      <span className="absolute left-3 top-3 z-20 -skew-x-6 rounded-md border-2 border-white/80 bg-black/45 px-3 py-1 text-[11px] font-black tracking-wide text-white backdrop-blur">
        {card.category}
      </span>

      {/* 絵文字ベース（写真が無い/読込前はこれが見える） */}
      {!hasPhoto && (
        <>
          <span className="text-8xl drop-shadow-lg">{card.emoji}</span>
          <p className="mt-6 text-3xl font-black italic tracking-wide drop-shadow">
            {card.label}
          </p>
          <p className="mt-2 text-sm font-bold text-white/85">今日の気分はコレ？</p>
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
  return (
    <div className="mm-panel flex h-full w-full flex-col rounded-3xl border-[3px] border-white/85 p-6">
      <div
        className={`flex h-40 w-full items-center justify-center rounded-2xl border-2 border-white/40 bg-gradient-to-br ${genre.gradient}`}
      >
        <span className="text-7xl drop-shadow-lg">{genre.emoji}</span>
      </div>
      <p className="mt-5 text-xl font-black italic text-white">{card.name}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">
        {card.copy}
      </p>
      <div className="mt-auto space-y-2 pt-4">
        <p className="text-sm font-bold text-amber-300">
          {card.price} ・ 四ツ谷駅 徒歩{card.walk}分
        </p>
        <div className="flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/80"
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
  const isP1 = player.startsWith("1");
  const accent = isP1 ? "text-rose-400" : "text-sky-400";
  const ring = isP1 ? "border-rose-400/70 shadow-[0_0_26px_rgba(229,72,77,0.4)]" : "border-sky-400/70 shadow-[0_0_26px_rgba(47,111,237,0.4)]";
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className={`mm-panel flex w-full flex-col items-center rounded-2xl border-2 ${ring} px-6 py-8`}>
        <span className="text-6xl drop-shadow-lg">📱</span>
        <h2 className="mt-5 text-2xl font-black italic text-white">
          <span className={accent}>{player}</span>の番！
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
          スマホを{player}に渡してね。
          <br />
          {phase === "genre" ? "食べたいジャンル" : "気になるお店"}を直感でスワイプ！
        </p>
        <Button3D onClick={onReady} className="mt-7 px-10 text-base">
          準備OK、スタート
        </Button3D>
      </div>
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
    <div className="mm-arena relative flex flex-1 flex-col overflow-hidden px-5 py-8">
      <div className="mm-lines" aria-hidden />
      {/* バトル中はメシバトル側のトグルが前面に出るので、非表示にはしない（z-40＜バトルz-50） */}
      {step !== "battle" && <MuteToggle />}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== トップ：着地した瞬間にスワイプを試せる ===== */}
        {step === "intro" && (
          <div className="flex w-full flex-col items-center">
            <span className="mb-3 -skew-x-6 rounded-md border-2 border-white/70 bg-white/10 px-4 py-1 text-sm font-black italic tracking-widest text-white backdrop-blur">
              🍜 メシマチ
            </span>
            <h1 className="text-center text-[2.1rem] font-black italic leading-tight tracking-tight text-white [text-shadow:0_3px_12px_rgba(0,0,0,0.6)]">
              「どこでもいい」を
              <br />
              <span className="mm-gold">卒業</span>しよう
            </h1>
            <p className="mb-5 mt-3 text-center text-xs font-bold tracking-wide text-white/70">
              二人でスワイプ → 意見が割れたら
              <span className="text-amber-300">メシバトル</span>で決着！
            </p>

            <SwipeDeck
              key="demo"
              cards={genreCards}
              loop
              controls={false}
              heightClass="h-[40vh] max-h-[380px] min-h-[270px]"
              renderCard={(card) => <GenreCard key={card.id} card={card} />}
              onFinish={() => {}}
            />

            <Button3D onClick={() => setStep("g1")} className="mt-7 px-14 text-lg">
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

        {step === "genreResult" && (
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-6xl drop-shadow-lg">🎉</span>
            <h2 className="mt-4 text-3xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              マッチ<span className="mm-gold">成立</span>！
            </h2>
            <p className="mt-2 text-sm font-medium text-white/70">
              二人とも「アリ」だったジャンル
            </p>
            <div className="mt-6 flex w-full flex-col gap-3">
              {genreMatches.map((id) => {
                const g = getGenre(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between rounded-2xl border-2 border-white/70 bg-gradient-to-r ${g.gradient} px-6 py-4 text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)]`}
                  >
                    <span className="text-lg font-black italic">
                      {g.emoji} {g.label}
                    </span>
                    <span className="-skew-x-6 text-xs font-black tracking-widest text-white/95">
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
              className="mt-5 text-xs font-bold tracking-wide text-white/50 underline underline-offset-4 transition hover:text-white/80"
            >
              最初からやり直す
            </button>
          </div>
        )}

        {/* ===== 2階への分岐ゲート ===== */}
        {step === "gate" && (
          <div className="flex w-full flex-col items-center text-center">
            {battleWinner && genreMatches.length === 0 && (
              <div className="mb-5 -skew-x-6 rounded-lg border-2 border-amber-300/80 bg-amber-400/15 px-5 py-2 text-sm font-black italic text-amber-200 shadow-[0_0_20px_rgba(255,200,80,0.35)]">
                🔥 メシバトルの結果、{getGenre(battleWinner)?.emoji}
                {getGenre(battleWinner)?.label}に決定！
              </div>
            )}
            <span className="text-6xl drop-shadow-lg">📍</span>
            <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              いま、四ツ谷にいる？
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
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
            <span className="text-6xl drop-shadow-lg">🗾</span>
            <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              ジャンルは決まった！
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
              マッチしたジャンルのお店を地図アプリで探そう。
              <br />
              <span className="font-bold text-amber-300">
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
            <span className="text-6xl drop-shadow-lg">🙇</span>
            <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              {getGenre(chosenGenre)?.label}のお店は準備中
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
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
                <span className="text-6xl drop-shadow-lg">🥳</span>
                <h2 className="mt-4 text-3xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  お店が<span className="mm-gold">決定</span>！
                </h2>
                <p className="mt-2 text-sm font-medium text-white/70">
                  二人とも「行きたい」お店
                </p>
                <div className="mt-6 flex w-full flex-col gap-4">
                  {storeMatches.map((s) => (
                    <div
                      key={s.id}
                      className="mm-panel rounded-2xl border-2 border-amber-300/70 p-5 text-left"
                    >
                      <p className="text-lg font-black italic text-white">{s.name}</p>
                      <p className="mt-1 text-sm font-medium text-white/65">
                        {s.copy}
                      </p>
                      <p className="mt-3 text-sm font-bold text-amber-300">
                        {s.price} ・ 四ツ谷駅 徒歩{s.walk}分
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="text-6xl drop-shadow-lg">🤔</span>
                <h2 className="mt-4 text-2xl font-black italic text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                  完全一致はなし…
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
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
                        className="mm-panel rounded-2xl border border-white/20 p-4 text-left"
                      >
                        <p className="font-black italic text-white">{s.name}</p>
                        <p className="mt-1 text-xs font-medium text-white/55">
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

      <p className="relative z-10 mt-8 text-center text-[10px] font-medium tracking-wide text-white/40">
        ※ 店舗情報はデモ用のサンプルデータです
      </p>

      {/* ===== マッチしなかったらメシバトルで決着（全画面オーバーレイ・ルート直下）===== */}
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
    </div>
  );
}
