"use client";

import { useEffect, useReducer, useRef } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSound } from "@/components/sound";

// ── バランス定数（プロトタイプで詰めた値）──
const Z = { perfect: 0.035, hit: 0.13, graze: 0.22 }; // 中心0.5からの片側幅（正規化）
const BASE = { perfect: 55, hit: 34, graze: 13, miss: 0 };
const BASE_SPEED = 2.35; // rad/s 相当
const SPEED_STEP = 0.13; // 1ターンごと +13%
const SPEED_CAP = 2.2; // 元の2.2倍で頭打ち
const RESOLVE_MS = 850;
const TIER_JP = { perfect: "必殺技！", hit: "HIT!", graze: "かすり", miss: "ミス…" };
const CD_STEPS = ["3", "2", "1", "ドン！"];
const CONFETTI_COLORS = ["#ffd400", "#ff6b6f", "#5b8bff", "#22c55e", "#f97316", "#ffffff"];

function judge(p) {
  const d = Math.abs(p - 0.5);
  if (d <= Z.perfect) return "perfect";
  if (d <= Z.hit) return "hit";
  if (d <= Z.graze) return "graze";
  return "miss";
}

// 実力7・運3：基礎(実力)に ±30% のブレ(運)、まれに番狂わせ
function damageFor(tier) {
  const base = BASE[tier];
  if (base === 0) return { dmg: 0, fluke: false };
  let mult = 0.7 + 0.6 * Math.random();
  let fluke = false;
  if (tier !== "graze" && Math.random() < 0.12) {
    mult *= 1.7;
    fluke = true;
  }
  return { dmg: Math.max(1, Math.round(base * mult)), fluke };
}

function makeConfetti() {
  const pieces = [];
  for (let i = 0; i < 72; i++) {
    pieces.push({
      left: Math.round(Math.random() * 100),
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: (1.6 + Math.random() * 1.5).toFixed(2),
      delay: (Math.random() * 0.5).toFixed(2),
    });
  }
  return pieces;
}

// 二人の食べ物（you=きみ/赤・opp=あいて/青）をリズムタップ対決させ、
// 勝者ジャンルを onDecided(genreId) で返すミニゲーム。
// you / opp は GENRES の要素（{ id, label, emoji, tech }）。
export function MeshiBattle({ you, opp, onDecided, onQuit, onPickAgain }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const appRef = useRef(null);
  const markerRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);
  const timersRef = useRef([]);

  // 変化しても毎フレーム再描画不要な可変状態はrefに集約
  const gRef = useRef(null);
  if (gRef.current === null) {
    gRef.current = {
      fighters: {
        you: { side: "きみ", cls: "you", id: you.id, label: you.label, emoji: you.emoji, tech: you.tech },
        opp: { side: "あいて", cls: "opp", id: opp.id, label: opp.label, emoji: opp.emoji, tech: opp.tech },
      },
      phase: "vs", // vs | countdown | ready | resolve | over
      hp: { you: 100, opp: 100 },
      attacker: "you",
      turnCount: 1,
      t0: 0,
      winner: null,
      cdText: "",
      cdKey: 0,
      popup: null,
      popupKey: 0,
      telop: null,
      telopKey: 0,
      shakeKey: 0,
      hurt: { you: 0, opp: 0 },
      confetti: [],
    };
  }
  const g = gRef.current;

  const speed = () =>
    BASE_SPEED * Math.min(1 + SPEED_STEP * (g.turnCount - 1), SPEED_CAP);
  const markerPos = (now) => 0.5 + 0.5 * Math.sin(((now - g.t0) / 1000) * speed());

  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // ── サウンド（WebAudio・外部ファイル無し）──
  const ensureAudio = () => {
    if (!audioRef.current) {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (AC) {
        try {
          audioRef.current = new AC();
        } catch {
          audioRef.current = null;
        }
      }
    }
    const ctx = audioRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume();
  };
  const blip = (freq, dur, type, vol, when) => {
    const ctx = audioRef.current;
    if (!isSoundEnabled() || !ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gain).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  const SFX = {
    perfect: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, "square", 0.18, i * 0.05)),
    hit: () => {
      blip(520, 0.1, "sawtooth", 0.18);
      blip(784, 0.12, "square", 0.12, 0.02);
    },
    graze: () => blip(400, 0.07, "triangle", 0.12),
    miss: () => blip(150, 0.2, "sine", 0.16),
    tick: () => blip(720, 0.07, "square", 0.16),
    go: () => {
      blip(880, 0.24, "sawtooth", 0.22);
      blip(440, 0.24, "square", 0.12, 0);
    },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 0.2, "square", 0.2, i * 0.09)),
    click: () => blip(600, 0.05, "square", 0.12),
  };
  const playTier = (tier) => {
    if (tier === "perfect") SFX.perfect();
    else if (tier === "hit") SFX.hit();
    else if (tier === "graze") SFX.graze();
    else SFX.miss();
  };

  // ── ゲーム進行 ──
  const resolveTap = (p) => {
    if (g.phase !== "ready") return;
    g.phase = "resolve";
    const tier = judge(p);
    const { dmg, fluke } = damageFor(tier);
    const atk = g.fighters[g.attacker];
    const defKey = g.attacker === "you" ? "opp" : "you";
    g.hp[defKey] = Math.max(0, g.hp[defKey] - dmg);

    g.popup = { tier, dmg, fluke, cls: atk.cls, tech: atk.tech };
    g.popupKey++;
    if (dmg > 0) g.hurt[defKey]++;
    playTier(tier);

    if (fluke) {
      g.telop = { word: "番狂わせ！", cls: atk.cls };
      g.telopKey++;
      g.shakeKey++;
    } else if (tier === "perfect") {
      g.telop = { word: "必殺技！", cls: atk.cls };
      g.telopKey++;
      g.shakeKey++;
    } else if (tier === "hit") {
      g.shakeKey++;
    }
    force();

    if (g.hp[defKey] <= 0) {
      addTimer(() => gameOver(g.attacker), 700);
      return;
    }
    addTimer(nextTurn, RESOLVE_MS);
  };

  const onTap = () => {
    ensureAudio();
    if (g.phase !== "ready") return;
    resolveTap(markerPos(performance.now()));
  };

  const nextTurn = () => {
    g.attacker = g.attacker === "you" ? "opp" : "you";
    g.turnCount++;
    g.t0 = performance.now();
    g.phase = "ready";
    force();
  };

  const gameOver = (wKey) => {
    g.phase = "over";
    g.winner = wKey;
    g.confetti = makeConfetti();
    SFX.win();
    force();
  };

  const startBattle = () => {
    ensureAudio();
    SFX.click();
    clearTimers();
    g.hp = { you: 100, opp: 100 };
    g.attacker = "you";
    g.turnCount = 1;
    g.winner = null;
    g.popup = null;
    g.phase = "countdown";
    g.cdText = CD_STEPS[0];
    g.cdKey++;
    force();
    SFX.tick();
    let i = 1;
    const tickNext = () => {
      if (i < CD_STEPS.length) {
        const last = i === CD_STEPS.length - 1;
        g.cdText = CD_STEPS[i];
        g.cdKey++;
        force();
        if (last) SFX.go();
        else SFX.tick();
        i++;
        addTimer(tickNext, 640);
      } else {
        g.phase = "ready";
        g.t0 = performance.now();
        force();
      }
    };
    addTimer(tickNext, 640);
  };

  const backToVS = () => {
    clearTimers();
    g.phase = "vs";
    g.hp = { you: 100, opp: 100 };
    g.attacker = "you";
    g.turnCount = 1;
    g.winner = null;
    g.popup = null;
    g.confetti = [];
    force();
  };

  const toggleSound = () => {
    ensureAudio();
    setSoundEnabled(!isSoundEnabled());
    if (isSoundEnabled()) SFX.click();
    force();
  };

  // マーカーの往復（rAFで直接styleを更新し再描画を避ける）
  useEffect(() => {
    const loop = (now) => {
      if (g.phase === "ready" && markerRef.current) {
        markerRef.current.style.left = markerPos(now) * 100 + "%";
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    const unsub = subscribeSound(() => force());
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
      unsub();
      if (audioRef.current && audioRef.current.close) audioRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const F = g.fighters;
  const atk = F[g.attacker];
  const soundOn = isSoundEnabled();
  const inBattle = g.phase === "ready" || g.phase === "resolve";
  const zonePct = Z.hit * 2 * 100;
  const perfectPct = Z.perfect * 2 * 100;

  return (
    <div className="mb-root">
      <button className={`mb-sound ${soundOn ? "" : "off"}`} onClick={toggleSound} aria-label="サウンド切り替え">
        {soundOn ? "🔊" : "🔇"}
      </button>
      {onQuit && (
        <button className="mb-quit" onClick={onQuit} aria-label="バトルをやめる">
          ✕
        </button>
      )}

      {/* ── バトル画面 ── */}
      <div className="mb-app" ref={appRef}>
        <div className="mb-title">
          メシバトル <small>MESHI&nbsp;BATTLE</small>
        </div>

        <div className="mb-hpwrap">
          <div className="mb-fighter you">
            <div className="mb-row">
              <span className="mb-emoji">{F.you.emoji}</span>
              <div>
                <div className="mb-side">きみ</div>
                <div className="mb-nm">{F.you.label}</div>
              </div>
            </div>
            <div className="mb-hpnum">
              {g.hp.you}
              <span className="unit">HP</span>
            </div>
            <div className="mb-hpbar">
              <div className="mb-hpfill" style={{ width: g.hp.you + "%" }} />
            </div>
          </div>

          <div className="mb-vsbadge">VS</div>

          <div className="mb-fighter opp">
            <div className="mb-row">
              <span className="mb-emoji">{F.opp.emoji}</span>
              <div>
                <div className="mb-side">あいて</div>
                <div className="mb-nm">{F.opp.label}</div>
              </div>
            </div>
            <div className="mb-hpnum">
              {g.hp.opp}
              <span className="unit">HP</span>
            </div>
            <div className="mb-hpbar">
              <div className="mb-hpfill" style={{ width: g.hp.opp + "%" }} />
            </div>
          </div>
        </div>

        <div className="mb-arena">
          <div className={`mb-avatar you ${g.hurt.you ? "hurt" : ""}`} key={`av-you-${g.hurt.you}`}>
            {F.you.emoji}
          </div>
          {g.popup && (
            <div className="mb-popup" key={`popup-${g.popupKey}`}>
              {(g.popup.tier === "perfect" || g.popup.tier === "hit") && (
                <div
                  className="mb-tech"
                  style={{ color: g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)" }}
                >
                  {g.popup.tier === "perfect" ? "💥" + g.popup.tech : g.popup.tech}
                </div>
              )}
              <div
                className="mb-kind"
                style={{ color: g.popup.fluke ? "#ffd400" : g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)" }}
              >
                {g.popup.fluke ? "★番狂わせ★" : TIER_JP[g.popup.tier]}
              </div>
              <div
                className="mb-dmg"
                style={{ color: g.popup.dmg > 0 ? (g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)") : "#9ca3af" }}
              >
                {g.popup.dmg}
              </div>
            </div>
          )}
          <div className={`mb-avatar opp ${g.hurt.opp ? "hurt" : ""}`} key={`av-opp-${g.hurt.opp}`}>
            {F.opp.emoji}
          </div>
        </div>

        <div className="mb-turn">
          ▶{" "}
          <span className="mb-who" style={{ background: g.attacker === "you" ? "var(--mb-you)" : "var(--mb-opp)" }}>
            {atk.side}
          </span>{" "}
          のターン（{atk.emoji}
          {atk.label}）
        </div>

        <div className="mb-track">
          <div className="mb-zone" style={{ width: zonePct + "%" }} />
          <div className="mb-perfect" style={{ width: perfectPct + "%" }} />
          <div className="mb-marker" ref={markerRef} />
        </div>

        <button
          className={`mb-tap ${atk.cls}`}
          onClick={onTap}
          disabled={!inBattle}
        >
          TAP!
        </button>
        <div className="mb-hint">
          白いマーカーが緑に重なった瞬間にタップ！ど真ん中の金で必殺技💥
        </div>
      </div>

      {/* ── 画面シェイク（keyの変化で再生）── */}
      {g.shakeKey > 0 && <ShakeDriver appRef={appRef} shakeKey={g.shakeKey} />}

      {/* ── 判定テロップ ── */}
      {g.telop && (
        <div className="mb-telop" key={`telop-${g.telopKey}`}>
          <span
            className="mb-word"
            style={{ WebkitTextStroke: "3px " + (g.telop.cls === "you" ? "#b42318" : "#1d4ed8") }}
          >
            {g.telop.word}
          </span>
        </div>
      )}

      {/* ── VS対決画面（スマブラ風スプラッシュ）── */}
      {g.phase === "vs" && (
        <div className="mb-vs">
          <div className="mb-vs-bg" aria-hidden>
            <div className="half you" />
            <div className="half opp" />
            <div className="lines" />
            <div className="seam" />
          </div>

          <div className="mb-vs-fighters">
            <div className="mb-slot you">
              <div className="mb-portrait">{F.you.emoji}</div>
              <div className="mb-nameplate">
                <div className="inner">
                  <div className="side">きみ</div>
                  <div className="nm">{F.you.label}</div>
                </div>
              </div>
              <div className="mb-cardtech">
                <span>{F.you.tech}</span>
              </div>
            </div>

            <div className="mb-vs-mark">VS</div>

            <div className="mb-slot opp">
              <div className="mb-portrait">{F.opp.emoji}</div>
              <div className="mb-nameplate">
                <div className="inner">
                  <div className="side">あいて</div>
                  <div className="nm">{F.opp.label}</div>
                </div>
              </div>
              <div className="mb-cardtech">
                <span>{F.opp.tech}</span>
              </div>
            </div>
          </div>

          <div className="mb-vs-caption">
            意見、真っ二つ！<small>どっちも ゆずらない…</small>
          </div>
          <button className="mb-go" onClick={startBattle}>
            メシバトル開始！
          </button>
        </div>
      )}

      {/* ── カウントダウン ── */}
      {g.phase === "countdown" && (
        <div className="mb-countdown">
          <div className={`mb-cdnum ${g.cdText === "ドン！" ? "go" : ""}`} key={`cd-${g.cdKey}`}>
            {g.cdText}
          </div>
        </div>
      )}

      {/* ── 勝敗オーバーレイ ── */}
      {g.phase === "over" && g.winner && (
        <div className="mb-overlay">
          <div className="mb-confetti">
            {g.confetti.map((c, i) => (
              <span
                key={i}
                className="mb-confetti-piece"
                style={{
                  left: c.left + "%",
                  background: c.bg,
                  animationDuration: c.dur + "s",
                  animationDelay: c.delay + "s",
                }}
              />
            ))}
          </div>
          <div className="mb-win-emoji">{F[g.winner].emoji}</div>
          <div className="mb-win-label">今日のごはんは…</div>
          <div className="mb-win-name">{F[g.winner].label}！</div>
          <div className="mb-win-sub">
            {F[g.winner].side}の{F[g.winner].label}が勝利！
          </div>
          <button
            className="mb-decide"
            onClick={() => {
              SFX.click();
              onDecided(F[g.winner].id);
            }}
          >
            このジャンルでお店を探す
          </button>
          <div className="mb-overbtns">
            <button
              className="mb-ghost"
              onClick={() => {
                SFX.click();
                backToVS();
              }}
            >
              もう一回
            </button>
            {onPickAgain && (
              <button
                className="mb-ghost"
                onClick={() => {
                  SFX.click();
                  onPickAgain();
                }}
              >
                ゲームを変える
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// シェイクは対象要素へ直接クラスを付け外しして再生（keyの変化で発火）
function ShakeDriver({ appRef, shakeKey }) {
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    el.classList.remove("shaking");
    // reflowを挟んでアニメーションを確実に再スタート
    void el.offsetWidth;
    el.classList.add("shaking");
    const t = setTimeout(() => el.classList.remove("shaking"), 450);
    return () => clearTimeout(t);
  }, [appRef, shakeKey]);
  return null;
}
