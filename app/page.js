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
import { MeshiAmidaNet } from "@/components/MeshiAmidaNet";
import MeshiHayaguiNet from "@/components/MeshiHayaguiNet";
import WaribashiNet from "@/components/WaribashiNet";
import MeshiQuizNet from "@/components/MeshiQuizNet";
import MealTicket from "@/components/MealTicket";
import { NorenWipe, useNorenWipe } from "@/components/NorenWipe";
import VsIntro from "@/components/VsIntro";
import GamePicker from "@/components/GamePicker";
import CookWait from "@/components/CookWait";

// スワイプ画面の短冊枚数（1箇所で管理・あとから調整可）
const SWIPE_GENRE_COUNT = 12;
const genreCards = GENRES.slice(0, SWIPE_GENRE_COUNT).map((g) => ({ ...g }));
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

// 夜の屋台の背景（トップ限定・すべてCSS描画／画像なし）
function NightStall() {
  return (
    <div className="ymt-bg" aria-hidden>
      {/* 左（大・明るい・高い位置）＝画面の外側寄り・見出しに被らない */}
      <span className="ymt-lantern" style={{ top: "1%", left: "-2%", transform: "scale(1.3)", filter: "brightness(1.06)" }}>
        <span className="cord" />
        <span className="paper" />
      </span>
      {/* 右（小・やや暗い・左より下げる）＝左右で非対称に。見出しの上に収める */}
      <span className="ymt-lantern" style={{ top: "4%", right: "-3%", transform: "scale(.8)", filter: "brightness(.82)" }}>
        <span className="cord" />
        <span className="paper" />
      </span>
      {/* 奥（小・暗い・わずかにぼかす／中央上・見出しの上方）*/}
      <span className="ymt-lantern" style={{ top: "-2%", left: "44%", transform: "scale(.5)", filter: "brightness(.6) blur(0.7px)" }}>
        <span className="cord" />
        <span className="paper" />
      </span>
      <span className="ymt-steam" style={{ left: "30%" }} />
      <span className="ymt-steam" style={{ left: "66%", animationDelay: "3.5s" }} />
      <div className="ymt-counter" />
    </div>
  );
}

// カテゴリ→丸ピンの色（背景では色分けしない。暖色のみ）
const CATEGORY_PIN = {
  "和食": "#e0483b",
  "洋食": "#d98a2b",
  "アジア・エスニック": "#c8622a",
  "がっつり・ごちそう": "#b23b2e",
};
const pinColorFor = (card) => CATEGORY_PIN[card?.category] || "#e0483b";

// スワイプ画面の背景（のれん越しに見た店内・3層：遠景／中景／手前）。すべてCSS/SVG・画像なし
function StallWall() {
  return (
    <div className="sw-wall" aria-hidden>
      {/* 遠景：奥の壁（ぼかした弱い木目）*/}
      <div className="sw-back" />
      {/* 遠景：提灯（トップと同じ本体・骨線・房。奥なので小さく強めにぼかす・左右非対称）*/}
      <span className="ymt-lantern sw-lan" style={{ top: "1%", left: "11%", transform: "scale(.5)", filter: "blur(2px)" }}>
        <span className="cord" />
        <span className="paper" />
      </span>
      <span className="ymt-lantern sw-lan" style={{ top: "8%", right: "14%", transform: "scale(.34)", filter: "blur(3px) brightness(.82)" }}>
        <span className="cord" />
        <span className="paper" />
      </span>
      {/* 遠景：提灯の暖色光（上部を照らす）*/}
      <div className="sw-glow" />
      {/* 湯気（札の背後・2〜3筋・非常にゆっくり）*/}
      <span className="sw-steam s1" />
      <span className="sw-steam s2" />
      <span className="sw-steam s3" />
      {/* 中景：カウンター天板（画面下部・手前へ迫り出す・奥へ溶ける）*/}
      <div className="sw-counter" />
    </div>
  );
}

// 丼の墨一色ライン画（早食い勝負の丼を券印刷ふうに簡略化）
function TicketBowl() {
  return (
    <svg className="tk-bowl" viewBox="0 0 48 46" fill="none" stroke="#2a2520"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 湯気 */}
      <path d="M19,9 q-2.6,-4 1,-8" strokeWidth="1.2" />
      <path d="M29,9 q2.6,-4 -1,-8" strokeWidth="1.2" />
      {/* 麺・具のあたり（口の中）*/}
      <path d="M12,17 q4,3 8,0 t8,0 t6,0" strokeWidth="1" />
      {/* 口（縁）*/}
      <ellipse cx="24" cy="18" rx="17" ry="5" strokeWidth="1.5" />
      {/* 丼の胴 */}
      <path d="M8,18 Q10,36 24,39 Q38,36 40,18" strokeWidth="1.7" />
      {/* 雷文 */}
      <path d="M13.5,28 h4 v-3.2 h-2.4 v1.6 M22,28 h4 v-3.2 h-2.4 v1.6 M30.5,28 h4 v-3.2 h-2.4 v1.6" strokeWidth="0.9" />
      {/* 高台 */}
      <path d="M18,39.5 h12" strokeWidth="1.7" />
    </svg>
  );
}

// ヒーローの食券（マッチ結果と同じ券面デザイン・入力に連動＋軽い触感）
function HeroTicket({ name, ticketNo, date }) {
  // 入力が空なら「あなた」、あれば入力値。相手は未定なので「？」
  const left = name && name.trim() ? name.trim() : "あなた";

  // 触感：タップ/ドラッグで指に合わせて傾く（最大5度）→離すと0.3sで揺り戻す。
  // ミシン目を触るとその瞬間だけ点線が濃くなる（切れる場所の予告・実際は切らない）。
  // 傾きは上下の揺れ(ymtBob)と別レイヤーで持ち、transformの競合を避ける。
  const tiltRef = useRef(null);
  const perfRef = useRef(null);
  const draggingRef = useRef(false);
  const reducedRef = useRef(false);
  const [angle, setAngle] = useState(0);
  const [springing, setSpringing] = useState(false); // 離した後の戻り（トランジション有効）
  const [perfHot, setPerfHot] = useState(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const track = (clientX, clientY) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const a = Math.max(-5, Math.min(5, ((clientX - cx) / (r.width / 2)) * 5));
    setAngle(a);
    const pr = perfRef.current?.getBoundingClientRect();
    if (pr) {
      const pad = 10; // ミシン目は細いので少し余白をとって触れやすく
      setPerfHot(clientY >= pr.top - pad && clientY <= pr.bottom + pad);
    }
  };

  const onDown = (e) => {
    if (reducedRef.current) return;
    draggingRef.current = true;
    setSpringing(false);
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
    track(e.clientX, e.clientY);
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    track(e.clientX, e.clientY);
  };
  const release = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setSpringing(true); // 0へ戻す間だけトランジション（軽く揺り戻す）
    setAngle(0);
    setPerfHot(false);
  };

  return (
    <div className="ymt-ticket-wrap" aria-hidden>
      <div
        ref={tiltRef}
        className={`ymt-ticket-tilt${springing ? " springing" : ""}`}
        style={{ transform: `rotate(${angle}deg)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
      <div className="ymt-ticket">
        <div className="stub">
          <span>半券</span>
          <span className="brand">MESHI-MACHI</span>
        </div>
        <div ref={perfRef} className={`perf${perfHot ? " hot" : ""}`} />
        <div className="body">
          <div className="cap">本日のマッチ</div>
          <div className="main">
            <TicketBowl />
            <div className="genre">ラーメン</div>
          </div>
          <div className="names">{left}　×　？</div>
          <div className="fee"><span className="yen">¥0</span><span className="free">本日無料</span></div>
          <div className="foot">
            <span className="tno">No.{ticketNo}</span>
            <span className="date">発行 {date}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// 短冊の傾き：ジャンルIDから決定（-3〜3度・カードごとに違う／再レンダーでも安定）
function tiltFromId(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return Math.round(((h % 601) / 100 - 3) * 100) / 100; // -3.00 .. 3.00
}

// 料理の墨一色ライン画（食券と同じ描き味・筆の太さムラ／カラー・写真は使わない）
// viewBox 0 0 80 64 で統一。器や象徴物1つに絞る。
const GENRE_ART = {
  sushi: `<path d="M40 28 Q55 21 69 29" stroke-width="3.2"/><rect x="40" y="28" width="29" height="14" rx="7" stroke-width="2.4"/><path d="M8 42 Q26 33 44 42" stroke-width="3.6"/><rect x="8" y="41" width="36" height="16" rx="8" stroke-width="2.6"/><path d="M15 49 h22" stroke-width="1"/>`,
  ramen: `<path d="M52 8 L31 30" stroke-width="2.4"/><path d="M58 12 L37 32" stroke-width="2.4"/><path d="M34 30 q-2 8 2 12" stroke-width="1.3"/><path d="M40 32 q-2 8 1 11" stroke-width="1.3"/><path d="M12 40 Q14 60 40 60 Q66 60 68 40" stroke-width="3"/><ellipse cx="40" cy="40" rx="28" ry="6" stroke-width="2.4"/><path d="M20 42 q6 3 12 0 t12 0" stroke-width="1.2"/><path d="M22 52 h5 v-3 h-3" stroke-width="1"/>`,
  udon_soba: `<ellipse cx="40" cy="42" rx="28" ry="9" stroke-width="2.6"/><path d="M12 42 Q14 52 40 52 Q66 52 68 42" stroke-width="2.4"/><path d="M18 46 h44 M22 49 h36" stroke-width="0.8"/><path d="M24 40 q8 -6 16 0" stroke-width="1.4"/><path d="M40 40 q8 -6 16 0" stroke-width="1.4"/><path d="M28 37 q6 -5 12 0" stroke-width="1.3"/><path d="M40 37 q6 -5 12 0" stroke-width="1.3"/><path d="M60 12 L47 34" stroke-width="2.2"/><path d="M64 16 L51 36" stroke-width="2.2"/>`,
  teishoku: `<path d="M8 50 L72 50 L66 60 L14 60 Z" stroke-width="2.4"/><path d="M16 40 Q18 50 30 50 Q42 50 44 40" stroke-width="2.4"/><ellipse cx="30" cy="40" rx="14" ry="3.4" stroke-width="1.8"/><path d="M24 41 q6 3 12 0" stroke-width="1"/><path d="M48 42 Q50 50 58 50 Q66 50 68 42" stroke-width="2.2"/><ellipse cx="58" cy="42" rx="10" ry="2.8" stroke-width="1.6"/>`,
  donburi: `<path d="M12 36 Q14 60 40 60 Q66 60 68 36" stroke-width="3.2"/><ellipse cx="40" cy="36" rx="28" ry="7" stroke-width="2.6"/><path d="M18 35 Q40 20 62 35" stroke-width="2"/><path d="M26 32 q6 -4 12 0 t12 0" stroke-width="1.2"/><path d="M31 60 h18" stroke-width="2"/>`,
  hamburg: `<ellipse cx="40" cy="49" rx="32" ry="8" stroke-width="2.2"/><path d="M18 42 Q20 32 40 32 Q60 32 62 42 Q60 48 40 48 Q20 48 18 42 Z" stroke-width="3"/><path d="M28 40 q12 4 24 0" stroke-width="1.1"/><path d="M34 26 q-2 -4 1 -7" stroke-width="1.2"/><path d="M46 26 q2 -4 -1 -7" stroke-width="1.2"/>`,
  pasta: `<ellipse cx="40" cy="47" rx="32" ry="9" stroke-width="2.2"/><path d="M12 47 Q16 57 40 57 Q64 57 68 47" stroke-width="1.6"/><path d="M26 45 q14 -12 28 0" stroke-width="1.3"/><path d="M28 47 q12 -8 24 0" stroke-width="1.3"/><path d="M30 43 q10 -7 20 1" stroke-width="1.2"/><path d="M52 12 L46 45" stroke-width="2.4"/><path d="M48 12 v8 M52 12 v8 M56 12 v8" stroke-width="1.2"/>`,
  pizza: `<path d="M40 10 L18 54 L62 54 Z" stroke-width="3"/><path d="M18 54 Q40 46 62 54" stroke-width="2"/><circle cx="36" cy="34" r="3" stroke-width="1.6"/><circle cx="46" cy="42" r="3" stroke-width="1.6"/><circle cx="40" cy="48" r="2.4" stroke-width="1.4"/>`,
  omurice: `<ellipse cx="40" cy="49" rx="32" ry="8" stroke-width="2.2"/><path d="M16 41 Q18 30 40 30 Q62 30 64 41 Q62 49 40 49 Q18 49 16 41 Z" stroke-width="3"/><path d="M28 39 q6 -4 12 0 t12 0" stroke-width="1.6"/><path d="M60 14 L52 40" stroke-width="2.2"/><ellipse cx="61" cy="13" rx="4" ry="6" stroke-width="1.8"/>`,
  steak: `<ellipse cx="40" cy="49" rx="33" ry="8" stroke-width="2.2"/><path d="M20 41 Q18 30 34 30 Q56 28 60 39 Q62 48 46 49 Q26 49 20 41 Z" stroke-width="3"/><path d="M30 37 l8 6 M40 35 l8 6 M50 37 l6 5" stroke-width="1.2"/><path d="M64 15 L58 40" stroke-width="2"/>`,
  curry: `<ellipse cx="40" cy="45" rx="33" ry="12" stroke-width="2.4"/><path d="M40 33 Q44 45 40 57" stroke-width="1.4"/><path d="M22 43 q8 -4 16 0" stroke-width="1"/><path d="M44 41 q6 3 12 0" stroke-width="1.1"/><path d="M44 47 q6 3 12 0" stroke-width="1.1"/><path d="M60 14 L54 40" stroke-width="2.2"/><ellipse cx="61" cy="13" rx="4" ry="6" stroke-width="1.8"/>`,
  gyoza: `<ellipse cx="40" cy="49" rx="32" ry="8" stroke-width="2.2"/><path d="M14 44 Q20 34 32 40 Q24 46 14 44 Z" stroke-width="2.6"/><path d="M18 41 l1 3 M22 39 l1 3 M26 39 l1 3" stroke-width="1"/><path d="M30 46 Q36 36 48 42 Q40 48 30 46 Z" stroke-width="2.6"/><path d="M34 43 l1 3 M38 41 l1 3 M42 41 l1 3" stroke-width="1"/><path d="M46 44 Q52 34 64 40 Q56 46 46 44 Z" stroke-width="2.6"/><path d="M50 41 l1 3 M54 39 l1 3 M58 39 l1 3" stroke-width="1"/>`,
};

function GenreArt({ id }) {
  const paths = GENRE_ART[id] || GENRE_ART.donburi;
  return (
    <svg className="tz-art" viewBox="4 6 72 54" fill="none" stroke="#2a2520"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      dangerouslySetInnerHTML={{ __html: paths }} />
  );
}

// 屋台の品書き短冊（生成り紙・縦書き・料理のライン画・画鋲・画像なし）
function GenreCard({ card, hidePin }) {
  const tilt = tiltFromId(card.id);
  // 断裁された紙の質感：四隅の角丸を札ごとに僅かに不揃いに（ハッシュで安定）
  const h = Math.abs(Math.round(tilt * 100));
  const r = (n) => 3 + ((h >> n) % 4); // 3〜6px
  const radius = `${r(0)}px ${r(2)}px ${r(4)}px ${r(6)}px`;
  return (
    <div className="tz-wrap" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="tz-paper" style={{ borderRadius: radius }}>
        {!hidePin && <span className="tz-pin" aria-hidden />}
        <GenreArt id={card.id} />
        <span className="tz-name">{card.label}</span>
      </div>
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
  const { phase: wipePhase, wipe } = useNorenWipe();
  const [view, setView] = useState("home"); // home | join | room
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nick, setNick] = useState("");
  const [nickWarn, setNickWarn] = useState(false);
  // ヒーロー食券の見本：券番号（ランダム7桁）と発行日（本日）はクライアントで一度だけ生成
  const [heroTno, setHeroTno] = useState("0000000");
  const [heroDate, setHeroDate] = useState("");
  const [ticketAcked, setTicketAcked] = useState(false);
  const [showVs, setShowVs] = useState(false);
  const vsSeenRef = useRef(false);
  const seenRound = useRef(0);

  // クライアントでのみバナー判定（SSRとの不一致を防ぐ）
  // ニックネームは毎回空から入力する（以前の値は復元しない）
  // 見本食券の券番号（ランダム7桁ゼロ埋め）と発行日（本日）もここで生成
  useEffect(() => {
    setMounted(true);
    setHeroTno(String(Math.floor(Math.random() * 10000000)).padStart(7, "0"));
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    setHeroDate(`${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`);
  }, []);

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
  const myName = me?.name || "きみ";
  const oppName = opp?.name || "あいて";
  // VS画面用：ホストを左・ゲストを右に固定（両端末で同じ並び）
  const hostName = players[ids.find((id) => players[id]?.role === "host")]?.name || "ホスト";
  const guestName = players[ids.find((id) => players[id]?.role === "guest")]?.name || "ゲスト";
  // ジャンル確定：食券用の通し番号・発行時刻も一緒に共有（両端末で同じ券に）
  const decideGenre = (id) =>
    setShared({
      decidedGenre: id,
      ticketNo: Math.floor(1000000 + Math.random() * 9000000),
      issuedAt: Date.now(),
    });

  // 決定ジャンルが変わったら食券の確認状態をリセット
  useEffect(() => {
    setTicketAcked(false);
  }, [decidedGenre]);

  // ラウンド変更（もう一回）を検知して自分のスワイプをリセット
  useEffect(() => {
    if (view !== "room" || !room) return;
    const r = room.round || 0;
    if (r !== seenRound.current) {
      seenRound.current = r;
      if (r !== 0) update({ phase: "swiping", likes: [], storePhase: "swiping", storeLikes: [] });
    }
  }, [room, view, update]);

  // スワイプ完了で共通ジャンルが0個のときだけVS画面を出す（割り箸バトルの合図・1回だけ）
  useEffect(() => {
    if (view !== "room") {
      vsSeenRef.current = false;
      setShowVs(false);
      return;
    }
    if (bothDone && noMatch && !vsSeenRef.current) {
      vsSeenRef.current = true;
      setShowVs(true);
    }
    // スワイプに戻ったら（次ラウンド等）次回また出せるようリセット
    if (!bothDone) vsSeenRef.current = false;
  }, [view, bothDone, noMatch]);

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
    if (!nick.trim()) return;
    setBusy(true);
    const c = genCode();
    const ok = await connect(c, true, nick.trim());
    setBusy(false);
    if (ok) {
      seenRound.current = 0;
      setView("room");
    }
  };

  const joinRoom = async () => {
    const c = joinCode.trim().toUpperCase();
    if (c.length < 4 || !nick.trim()) return;
    setBusy(true);
    const ok = await connect(c, false, nick.trim());
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
    <div
      className="mm-arena relative flex flex-1 flex-col overflow-hidden px-5 py-8"
      style={
        view === "home" || view === "join" || (view === "room" && stage === "waiting")
          ? { paddingBottom: "calc(15vh + 26px)" }
          : undefined
      }
    >
      {view === "home" || view === "join" || (view === "room" && stage === "waiting") ? (
        <NightStall />
      ) : view === "room" &&
        (["swipe", "swipeWait", "storeSwipe", "storeWait"].includes(stage) || (stage === "result" && noMatch)) ? (
        <StallWall />
      ) : (
        <div className="mm-lines" aria-hidden />
      )}
      <MuteToggle />

      {/* 開発時のみの検証表示（本番=Firature接続時は非表示・折りたたみ）*/}
      {mounted && !isOnline && (
        <details className="relative z-20 mx-auto mb-2 max-w-max rounded border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/45">
          <summary className="cursor-pointer list-none select-none">検証モード</summary>
          <span className="mt-1 block">オフライン検証（Firebase未設定）— 同じ端末のタブ間でのみ動作します</span>
        </details>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {/* ===== ホーム：部屋を作る / 入る ===== */}
        {view === "home" && (
          <div className="flex w-full flex-col items-center pt-5">
            {/* ロゴ：白いのれん（手書き風・下端に3本の切れ目） */}
            <div className="ymt-noren mb-4">
              <div className="cloth">メシマチ</div>
              <div className="hem">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <h1 className="text-center text-[2.1rem] font-black leading-tight text-[#f0e6d2] [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
              「どこでもいい」を
              <br />
              <span className="ymt-hi">卒業</span>しよう
            </h1>

            {/* ヒーロー：実際の食券を1枚（このアプリで何が起きるかを一目で） */}
            <div className="my-5 w-full">
              <HeroTicket name={nick} ticketNo={heroTno} date={heroDate} />
            </div>

            <p className="mb-6 text-center text-xs font-bold tracking-wide text-[#f0e6d2]/70">
              ふたりでスワイプ → 今日のごはんが決まる
            </p>

            {/* ニックネーム入力（左端にラベル＋左揃え・凹んだ枠） */}
            <label className="ymt-field mb-6">
              <span className="ymt-field-tag">ニックネーム</span>
              <input
                value={nick}
                onChange={(e) => { setNick(e.target.value.slice(0, 12)); setNickWarn(false); }}
                placeholder="例）たろ"
                maxLength={12}
                className="ymt-input"
              />
            </label>

            <div className="flex w-full flex-col gap-3">
              {/* 点灯している選択済みボタン（クリーム面／墨色） */}
              <button
                type="button"
                onClick={() => { playPush(); if (!nick.trim()) { setNickWarn(true); return; } createRoom(); }}
                disabled={busy}
                className="ymt-btn lit"
              >
                部屋をつくる
              </button>
              {/* 消灯しているボタン */}
              <button
                type="button"
                onClick={() => { playPush(); if (!nick.trim()) { setNickWarn(true); return; } wipe(() => setView("join")); }}
                className="ymt-btn dim sub"
              >
                部屋に入る
              </button>
            </div>
            {nickWarn && !nick.trim() && (
              <p className="mt-3 text-center text-[11px] font-bold text-[#e0483b]">
                まずニックネームを入れてね
              </p>
            )}
            <p className="mt-8 text-center text-[11px] font-medium leading-relaxed text-[#f0e6d2]/45">
              登録不要。部屋コードを共有して、
              <br />
              二人でリアルタイムに対戦できます。
            </p>
          </div>
        )}

        {/* ===== 部屋コードを入力して参加（夜の屋台テーマ）===== */}
        {view === "join" && (
          <div className="flex w-full flex-col items-center text-center">
            {/* のれんロゴ（トップと共通） */}
            <div className="ymt-noren mb-6">
              <div className="cloth">メシマチ</div>
              <div className="hem">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <h2 className="text-[1.65rem] font-black leading-tight text-[#f0e6d2] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
              部屋<span className="ymt-hi">コード</span>を入力
            </h2>
            <p className="mt-2 text-xs font-bold text-[#f0e6d2]/60">相手から聞いた4文字を入れてね</p>

            {/* 投入口のような凹んだコード入力 */}
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              inputMode="text"
              autoCapitalize="characters"
              placeholder="ABCD"
              className="ymt-slot-input mt-6"
            />
            {error && <p className="mt-3 text-xs font-bold text-[#e0483b]">{error}</p>}

            <div className="mt-6 flex w-full flex-col gap-3">
              {/* 点灯している選択済みボタン */}
              <button
                type="button"
                onClick={() => { playPush(); joinRoom(); }}
                disabled={busy || joinCode.length < 4}
                className="ymt-btn lit"
              >
                {busy ? "接続中…" : "入る"}
              </button>
              {/* 消灯しているボタン */}
              <button
                type="button"
                onClick={() => { playPush(); setView("home"); setJoinCode(""); }}
                className="ymt-btn dim"
              >
                もどる
              </button>
            </div>
          </div>
        )}

        {/* ===== 部屋の中（待機→スワイプ→結果）===== */}
        {view === "room" && (
          <>
            {/* 待機：相手を待つ（夜の屋台テーマ）*/}
            {stage === "waiting" && (
              <div className="flex w-full flex-col items-center text-center">
                {/* のれんロゴ（トップと共通）*/}
                <div className="ymt-noren mb-6">
                  <div className="cloth">メシマチ</div>
                  <div className="hem">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <p className="text-xs font-black tracking-widest text-[#f0e6d2]/60">部屋コード</p>
                {/* 部屋コードの木札（焼き印風・タップでコピー）*/}
                <button onClick={copyCode} className="ymt-code-plate mt-3" aria-label="部屋コードをコピー">
                  <span className="ymt-code">{code}</span>
                </button>
                <p className="mt-2 text-[11px] font-bold text-[#f0e6d2]/50">
                  {copied ? "コピーしました" : "タップでコピー"}
                </p>

                <div className="mt-8 flex items-center gap-3 text-[#f0e6d2]/85">
                  <span className="ymt-ping" />
                  <span className="text-sm font-black">相手を待っています…</span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-[#f0e6d2]/55">
                  このコードを相手に伝えて、
                  <br />
                  「部屋に入る」から入ってもらってね。
                </p>

                <div className="mt-8 w-full max-w-[240px]">
                  <button type="button" onClick={() => { playPush(); leaveRoom(); }} className="ymt-btn dim">
                    部屋を出る
                  </button>
                </div>
              </div>
            )}

            {/* スワイプ：自分の端末で選ぶ */}
            {stage === "swipe" && (
              <div className="flex w-full flex-col items-center">
                <div className="sd-status mb-3">
                  <span className="dot" />
                  {oppName} が入室中！スワイプで選ぼう
                </div>
                <SwipeDeck
                  key={`swipe-${room?.round || 0}`}
                  cards={genreCards}
                  renderCard={(card) => <GenreCard key={card.id} card={card} hidePin />}
                  stack
                  likeLabel="頼む"
                  nopeLabel="見送り"
                  stampNo="見送り"
                  pinColorFor={pinColorFor}
                  onFinish={(liked) => update({ likes: liked, phase: "done" })}
                />
              </div>
            )}

            {/* 自分は完了、相手待ち（夜の屋台テーマ・大将が調理中）*/}
            {stage === "swipeWait" && (
              <CookWait title="きみの注文は通った" sub="相手がスワイプ中…" onLeave={leaveRoom} />
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

            {/* 結果：不成立 → 券売機で勝負のしかたを選ぶ（夜の屋台テーマ）*/}
            {stage === "result" && matches.length === 0 && (
              <div className="flex w-full flex-col items-center text-center">
                {game && game.phase === "pick" ? (
                  <GamePicker
                    leftName={getGenre(game.hostChamp)?.label}
                    rightName={getGenre(game.guestChamp)?.label}
                    onPick={(id) => { playPush(); setGame({ id, phase: "play", started: false }); }}
                    onLeave={leaveRoom}
                  />
                ) : (
                  <>
                    {!game && (
                      <div className="flex items-center gap-3 text-[#f0e6d2]/80">
                        <span className="ymt-ping" />
                        <span className="text-sm font-black">対戦を準備中…</span>
                      </div>
                    )}
                    {game && game.phase === "play" && (
                      <div className="flex items-center gap-3 text-[#f0e6d2]/70">
                        <span className="ymt-ping" />
                        <span className="text-sm font-black">対戦中…</span>
                      </div>
                    )}
                    <div className="mt-8 w-full max-w-[240px]">
                      <button type="button" onClick={() => { playPush(); leaveRoom(); }} className="ymt-btn dim">
                        部屋を出る
                      </button>
                    </div>
                  </>
                )}
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
                  stampYes="行きたい"
                  stampNo="またこんど"
                  onFinish={(liked) => update({ storeLikes: liked, storePhase: "done" })}
                />
              </div>
            )}

            {stage === "storeWait" && (
              <CookWait title="きみは店を選んだ" sub="相手が店をえらび中…" onLeave={leaveRoom} />
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
          if (game.id === "quiz")
            return (
              <MeshiQuizNet
                myRole={myRole}
                hostName={hostName}
                guestName={guestName}
                hostGenre={getGenre(game.hostChamp)}
                guestGenre={getGenre(game.guestChamp)}
                seed={game.seed}
                quiz={game.quiz}
                ansHost={game.ansHost}
                ansGuest={game.ansGuest}
                writeQuiz={(q) => setGame({ quiz: q })}
                writeAns={(role, ans) => setGame(role === "host" ? { ansHost: ans } : { ansGuest: ans })}
                onRematch={() => setGame({ seed: newSeed(), quiz: null, ansHost: null, ansGuest: null })}
                onChangeGame={() => setGame({ id: null, phase: "pick", started: false, quiz: null, ansHost: null, ansGuest: null })}
                onLeave={leaveRoom}
                onDecided={(genreId) => decideGenre(genreId)}
              />
            );
          if (game.id === "slot")
            return (
              <MeshiHayaguiNet
                myRole={myRole}
                hostName={hostName}
                guestName={guestName}
                hostGenre={getGenre(game.hostChamp)}
                guestGenre={getGenre(game.guestChamp)}
                seed={game.seed}
                resHost={game.resHost}
                resGuest={game.resGuest}
                writeRes={(role, r) => setGame(role === "host" ? { resHost: r } : { resGuest: r })}
                onRematch={() => setGame({ seed: newSeed(), resHost: null, resGuest: null })}
                onChangeGame={() => setGame({ id: null, phase: "pick", started: false, resHost: null, resGuest: null })}
                onLeave={leaveRoom}
                onDecided={(genreId) => decideGenre(genreId)}
              />
            );
          if (game.id === "amida") return <MeshiAmidaNet {...props} />;
          if (game.id === "battle")
            return (
              <WaribashiNet
                myRole={myRole}
                hostName={hostName}
                guestName={guestName}
                hostGenre={getGenre(game.hostChamp)}
                guestGenre={getGenre(game.guestChamp)}
                seed={game.seed}
                resHost={game.resHost}
                resGuest={game.resGuest}
                writeRes={(role, r) => setGame(role === "host" ? { resHost: r } : { resGuest: r })}
                onRematch={() => setGame({ seed: newSeed(), resHost: null, resGuest: null })}
                onChangeGame={() => setGame({ id: null, phase: "pick", started: false, resHost: null, resGuest: null })}
                onLeave={leaveRoom}
                onDecided={(genreId) => decideGenre(genreId)}
              />
            );
          return null;
        })()}

      {/* 食券発行（ジャンル確定の瞬間・全画面オーバーレイ）*/}
      {view === "room" && decidedGenre && !ticketAcked && (
        <MealTicket
          genre={getGenre(decidedGenre)?.label}
          genres={GENRES.map((g) => g.label)}
          ticketNo={room?.ticketNo || 0}
          issuedAt={room?.issuedAt ? new Date(room.issuedAt) : undefined}
          nicknames={[myName, oppName]}
          ctaLabel="お店をさがす"
          onNext={() => setTicketAcked(true)}
        />
      )}

      {/* VS画面（スワイプ完了・共通ジャンル0個→割り箸バトルの合図）*/}
      {view === "room" && showVs && (
        <VsIntro key="vsintro" leftName={hostName} rightName={guestName} onDone={() => setShowVs(false)} />
      )}

      {/* のれんワイプ遷移（全画面・最前面）*/}
      <NorenWipe phase={wipePhase} />
    </div>
  );
}
