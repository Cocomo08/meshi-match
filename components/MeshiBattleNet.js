"use client";

import { useEffect, useReducer, useRef } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSound, playPush } from "@/components/sound";

// バランス定数（プロト・オフライン版と同じ）
const Z = { perfect: 0.035, hit: 0.13, graze: 0.22 };
const BASE = { perfect: 55, hit: 34, graze: 13, miss: 0 };
const BASE_SPEED = 2.35, SPEED_STEP = 0.13, SPEED_CAP = 2.2;
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
function damageFor(tier) {
  const base = BASE[tier];
  if (base === 0) return { dmg: 0, fluke: false };
  let mult = 0.7 + 0.6 * Math.random();
  let fluke = false;
  if (tier !== "graze" && Math.random() < 0.12) { mult *= 1.7; fluke = true; }
  return { dmg: Math.max(1, Math.round(base * mult)), fluke };
}
function makeConfetti() {
  const p = [];
  for (let i = 0; i < 72; i++)
    p.push({ left: Math.round(Math.random() * 100), bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length], dur: (1.6 + Math.random() * 1.5).toFixed(2), delay: (Math.random() * 0.5).toFixed(2) });
  return p;
}

// メシバトル（2台同期）。攻撃側だけ自端末でタップ→結果(lastMove)を相手へ送信。
// battle 状態は room.game.battle（host/guest の絶対表現）。
export function MeshiBattleNet({ hostGenre, guestGenre, myRole, battle, writeBattle, onRematch, onChangeGame, onLeave }) {
  const [, force] = useReducer((n) => n + 1, 0);
  const appRef = useRef(null);
  const markerRef = useRef(null);
  const rafRef = useRef(0);
  const timersRef = useRef([]);
  const g = useRef({ t0: 0, lastSeq: -1, cdRunFor: -1, hostWroteGoFor: -1, popup: null, popupKey: 0, telop: null, telopKey: 0, shakeKey: 0, hurt: { host: 0, guest: 0 }, cdText: "", cdKey: 0, cdActive: false, confetti: [] }).current;
  const soundOn = isSoundEnabled();

  const other = (s) => (s === "host" ? "guest" : "host");
  const genreOf = (s) => (s === "host" ? hostGenre : guestGenre);
  const isMine = (s) => s === myRole;
  const label = (s) => (isMine(s) ? "きみ" : "あいて");
  const cls = (s) => (isMine(s) ? "you" : "opp");
  const techOf = (s) => genreOf(s).tech;

  const addTimer = (fn, ms) => { const id = setTimeout(fn, ms); timersRef.current.push(id); return id; };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  // ── サウンド（このタブ用の合成音。共有トグルを尊重）──
  const audioRef = useRef(null);
  const ensureAudio = () => {
    if (!audioRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { audioRef.current = new AC(); } catch { audioRef.current = null; } } }
    const c = audioRef.current; if (c && c.state === "suspended") c.resume();
  };
  const blip = (f, dur, type, vol, when) => {
    const c = audioRef.current; if (!isSoundEnabled() || !c) return;
    const t = c.currentTime + (when || 0); const o = c.createOscillator(), gg = c.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t); gg.gain.setValueAtTime(vol || 0.2, t);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gg).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const SFX = {
    perfect: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, "square", 0.18, i * 0.05)),
    hit: () => { blip(520, 0.1, "sawtooth", 0.18); blip(784, 0.12, "square", 0.12, 0.02); },
    graze: () => blip(400, 0.07, "triangle", 0.12), miss: () => blip(150, 0.2, "sine", 0.16),
    tick: () => blip(720, 0.07, "square", 0.16), go: () => { blip(880, 0.24, "sawtooth", 0.22); blip(440, 0.24, "square", 0.12, 0); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 0.2, "square", 0.2, i * 0.09)),
  };
  const playTier = (t) => (t === "perfect" ? SFX.perfect() : t === "hit" ? SFX.hit() : t === "graze" ? SFX.graze() : SFX.miss());

  const speed = () => BASE_SPEED * Math.min(1 + SPEED_STEP * ((battle?.turn || 1) - 1), SPEED_CAP);
  const markerPos = (now) => 0.5 + 0.5 * Math.sin(((now - g.t0) / 1000) * speed());

  const phase = battle?.phase || "vs";
  const attacker = battle?.attacker || "host";
  const isMyTurn = phase === "go" && attacker === myRole && !g.cdActive;
  const hp = battle?.hp || { host: 100, guest: 100 };

  // マーカー往復（自分の番のみ）
  useEffect(() => {
    const loop = (now) => {
      if (isMyTurn && markerRef.current) markerRef.current.style.left = markerPos(now) * 100 + "%";
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, battle?.turn]);

  // マウント時のみ：サウンド購読・アンマウント時に掃除
  useEffect(() => {
    const unsub = subscribeSound(() => force());
    return () => {
      unsub();
      clearTimers();
      const c = audioRef.current;
      if (c && c.state !== "closed" && c.close) c.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自分の番になったらマーカーの起点をリセット
  useEffect(() => { if (isMyTurn) g.t0 = performance.now(); /* eslint-disable-next-line */ }, [battle?.turn, phase, attacker]);

  // カウントダウン（phase==='countdown'）を両端末でローカル再生。ホストが終了後 go へ。
  useEffect(() => {
    if (phase !== "countdown") { g.cdActive = false; return; }
    const gen = battle?.gen ?? 0;
    if (g.cdRunFor === gen) return;
    g.cdRunFor = gen;
    g.cdActive = true;
    let i = 0;
    g.cdText = CD_STEPS[0]; g.cdKey++; force(); SFX.tick();
    const step = () => {
      i++;
      if (i < CD_STEPS.length) { g.cdText = CD_STEPS[i]; g.cdKey++; force(); (i === CD_STEPS.length - 1 ? SFX.go() : SFX.tick()); addTimer(step, 640); }
      else { addTimer(() => { g.cdActive = false; force(); }, 560); }
    };
    addTimer(step, 640);
    if (myRole === "host" && g.hostWroteGoFor !== gen) {
      g.hostWroteGoFor = gen;
      addTimer(() => writeBattle({ ...battle, phase: "go" }), 640 * 4 + 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, battle?.gen]);

  // 相手/自分の手(lastMove)が来たら演出を再生
  useEffect(() => {
    const m = battle?.lastMove;
    if (!m || m.seq === g.lastSeq) return;
    g.lastSeq = m.seq;
    const atk = m.attacker;
    const def = other(atk);
    g.popup = { tier: m.tier, dmg: m.dmg, fluke: m.fluke, cls: cls(atk), tech: techOf(atk) };
    g.popupKey++;
    if (m.dmg > 0) g.hurt[def]++;
    playTier(m.tier);
    if (m.fluke) { g.telop = { word: "番狂わせ！", cls: cls(atk) }; g.telopKey++; g.shakeKey++; }
    else if (m.tier === "perfect") { g.telop = { word: "必殺技！", cls: cls(atk) }; g.telopKey++; g.shakeKey++; }
    else if (m.tier === "hit") g.shakeKey++;
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.lastMove?.seq]);

  // 勝敗確定で紙吹雪＋ファンファーレ
  useEffect(() => {
    if (phase === "over" && g.confetti.length === 0) { g.confetti = makeConfetti(); SFX.win(); force(); }
    if (phase !== "over" && g.confetti.length) g.confetti = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startBattle = () => {
    ensureAudio(); playPush();
    writeBattle({ phase: "countdown", hp: { host: 100, guest: 100 }, attacker: "host", turn: 1, seq: 0, lastMove: null, winner: null, gen: (battle?.gen ?? 0) + 1 });
  };

  const onTap = () => {
    ensureAudio();
    if (!isMyTurn) return;
    const p = markerPos(performance.now());
    const tier = judge(p);
    const { dmg, fluke } = damageFor(tier);
    const def = other(myRole);
    const newHp = { ...hp, [def]: Math.max(0, hp[def] - dmg) };
    const seq = (battle.seq || 0) + 1;
    const over = newHp[def] <= 0;
    writeBattle({
      ...battle,
      hp: newHp, seq, lastMove: { seq, attacker: myRole, tier, dmg, fluke },
      attacker: over ? myRole : def, turn: (battle.turn || 1) + 1,
      phase: over ? "over" : "go", winner: over ? myRole : null,
    });
  };

  const toggleSound = () => { setSoundEnabled(!isSoundEnabled()); if (isSoundEnabled()) { ensureAudio(); } force(); };

  // 表示：左=きみ(自分) / 右=あいて
  const mine = myRole, opp = other(myRole);
  const winSide = battle?.winner;
  const zonePct = Z.hit * 2 * 100, perfectPct = Z.perfect * 2 * 100;

  const Fighter = ({ side }) => (
    <div className={`mb-fighter ${cls(side)}`}>
      <div className="mb-row">
        <span className="mb-emoji">{genreOf(side).emoji}</span>
        <div>
          <div className="mb-side">{label(side)}</div>
          <div className="mb-nm">{genreOf(side).label}</div>
        </div>
      </div>
      <div className="mb-hpnum">{hp[side]}<span className="unit">HP</span></div>
      <div className="mb-hpbar"><div className="mb-hpfill" style={{ width: hp[side] + "%" }} /></div>
    </div>
  );

  return (
    <div className="mb-root">
      <button className={`mb-sound ${soundOn ? "" : "off"}`} onClick={toggleSound} aria-label="サウンド切り替え">{soundOn ? "🔊" : "🔇"}</button>
      <button className="mb-quit" onClick={onLeave} aria-label="退出">✕</button>

      <div className="mb-app" ref={appRef}>
        <div className="mb-title">メシバトル <small>MESHI&nbsp;BATTLE</small></div>
        <div className="mb-hpwrap">
          <Fighter side={mine} />
          <div className="mb-vsbadge">VS</div>
          <Fighter side={opp} />
        </div>

        <div className="mb-arena">
          <div className={`mb-avatar you ${g.hurt[mine] ? "hurt" : ""}`} key={`av-me-${g.hurt[mine]}`}>{genreOf(mine).emoji}</div>
          {g.popup && (
            <div className="mb-popup" key={`popup-${g.popupKey}`}>
              {(g.popup.tier === "perfect" || g.popup.tier === "hit") && (
                <div className="mb-tech" style={{ color: g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)" }}>{g.popup.tier === "perfect" ? "💥" + g.popup.tech : g.popup.tech}</div>
              )}
              <div className="mb-kind" style={{ color: g.popup.fluke ? "#ffd400" : g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)" }}>{g.popup.fluke ? "★番狂わせ★" : TIER_JP[g.popup.tier]}</div>
              <div className="mb-dmg" style={{ color: g.popup.dmg > 0 ? (g.popup.cls === "you" ? "var(--mb-you)" : "var(--mb-opp)") : "#9ca3af" }}>{g.popup.dmg}</div>
            </div>
          )}
          <div className={`mb-avatar opp ${g.hurt[opp] ? "hurt" : ""}`} key={`av-opp-${g.hurt[opp]}`}>{genreOf(opp).emoji}</div>
        </div>

        <div className="mb-turn">
          ▶ <span className="mb-who" style={{ background: attacker === mine ? "var(--mb-you)" : "var(--mb-opp)" }}>{label(attacker)}</span> のターン{isMyTurn ? "（あなた！）" : "（観戦）"}
        </div>

        <div className="mb-track">
          <div className="mb-zone" style={{ width: zonePct + "%" }} />
          <div className="mb-perfect" style={{ width: perfectPct + "%" }} />
          <div className="mb-marker" ref={markerRef} />
        </div>

        <button className={`mb-tap ${isMyTurn ? "you" : "opp"}`} onClick={onTap} disabled={!isMyTurn}>
          {isMyTurn ? "TAP!" : "相手のターン…"}
        </button>
        <div className="mb-hint">白いマーカーが緑に重なった瞬間にタップ！ど真ん中の金で必殺技💥</div>
      </div>

      {g.shakeKey > 0 && <ShakeDriver appRef={appRef} shakeKey={g.shakeKey} />}

      {g.telop && (
        <div className="mb-telop" key={`telop-${g.telopKey}`}>
          <span className="mb-word" style={{ WebkitTextStroke: "3px " + (g.telop.cls === "you" ? "#b42318" : "#1d4ed8") }}>{g.telop.word}</span>
        </div>
      )}

      {/* VS開始画面 */}
      {phase === "vs" && (
        <div className="mb-vs">
          <div className="mb-vs-bg" aria-hidden><div className="half you" /><div className="half opp" /><div className="lines" /><div className="seam" /></div>
          <div className="mb-vs-fighters">
            <div className="mb-slot you">
              <div className="mb-portrait">{genreOf(mine).emoji}</div>
              <div className="mb-nameplate"><div className="inner"><div className="side">きみ</div><div className="nm">{genreOf(mine).label}</div></div></div>
              <div className="mb-cardtech"><span>{techOf(mine)}</span></div>
            </div>
            <div className="mb-vs-mark">VS</div>
            <div className="mb-slot opp">
              <div className="mb-portrait">{genreOf(opp).emoji}</div>
              <div className="mb-nameplate"><div className="inner"><div className="side">あいて</div><div className="nm">{genreOf(opp).label}</div></div></div>
              <div className="mb-cardtech"><span>{techOf(opp)}</span></div>
            </div>
          </div>
          <div className="mb-vs-caption">先攻は「きみ」側（赤）から！<small>タップのタイミングで勝負</small></div>
          <button className="mb-go" onClick={startBattle}>メシバトル開始！</button>
        </div>
      )}

      {/* カウントダウン */}
      {phase === "countdown" && g.cdActive && (
        <div className="mb-countdown"><div className={`mb-cdnum ${g.cdText === "ドン！" ? "go" : ""}`} key={`cd-${g.cdKey}`}>{g.cdText}</div></div>
      )}

      {/* 勝敗 */}
      {phase === "over" && winSide && (
        <div className="mb-overlay">
          <div className="mb-confetti">
            {g.confetti.map((c, i) => (<span key={i} className="mb-confetti-piece" style={{ left: c.left + "%", background: c.bg, animationDuration: c.dur + "s", animationDelay: c.delay + "s" }} />))}
          </div>
          <div className="mb-win-emoji">{genreOf(winSide).emoji}</div>
          <div className="mb-win-label">今日のごはんは…</div>
          <div className="mb-win-name">{genreOf(winSide).label}！</div>
          <div className="mb-win-sub">{label(winSide)}の{genreOf(winSide).label}が勝利！</div>
          <div className="mb-overbtns">
            <button className="mb-ghost" onClick={() => { playPush(); onRematch(); }}>もう一回</button>
            <button className="mb-ghost" onClick={() => { playPush(); onChangeGame(); }}>ゲームを変える</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShakeDriver({ appRef, shakeKey }) {
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    el.classList.remove("shaking"); void el.offsetWidth; el.classList.add("shaking");
    const t = setTimeout(() => el.classList.remove("shaking"), 450);
    return () => clearTimeout(t);
  }, [appRef, shakeKey]);
  return null;
}
