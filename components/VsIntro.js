"use client";

import { useEffect, useRef, useState } from "react";
import { NorenWipe } from "@/components/NorenWipe";

// VS画面（対決前の煽り・夜の屋台）
//  出るタイミング：部屋に二人が揃った瞬間 → 終わるとスワイプ画面へ
//  タイムライン（合計2.0s・厳守）
//   0.0-0.5s のれんが開く（共通コンポーネント流用）
//   0.5-0.9s 左の名札が滑り込む
//   0.7-1.1s 右の名札が滑り込む（少し遅れて）
//   1.1-1.3s 「対」が上から落ちて着地（着地で画面を揺らす／1.2倍→等倍）
//   1.3-2.0s 大将のセリフを一文字ずつ表示
//   2.0s-    自動でスワイプへ
//  props: leftName / rightName / onDone

// 大将のセリフ（意見が割れた＝箸で決着の合図。あとから増やせる）
const SHOUT = [
  "好みが割れたな。箸で決めるぞ",
  "意見が合わんか。なら勝負だ",
  "そういう日もある。箸を持て",
  "決まらんなら勝負しかないな",
  "譲り合っても腹は膨れんぞ",
];

const CSS = `
.vs-root { position: fixed; inset: 0; z-index: 70; overflow: hidden;
  background: linear-gradient(180deg, #16273f 0%, #0b1120 46%, #05070c 100%);
  color: #f0e6d2; -webkit-tap-highlight-color: transparent; user-select: none;
  font-family: var(--font-zen-maru), sans-serif; }
.vs-inner { position: absolute; inset: 0; }
.vs-inner.shake { animation: vsShake .3s ease-in-out; }
@keyframes vsShake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-2px,2px)} 50%{transform:translate(3px,-1px)} 75%{transform:translate(-1px,2px)} }

/* ── 名札（木札・焼き印風・顔なし）── */
.vs-stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 78px; }
.vs-plate { position: relative; width: 118px; padding: 22px 10px 18px; border-radius: 5px;
  text-align: center; border: 1px solid #3f2a15;
  box-shadow: inset 0 1px 0 rgba(255,224,170,.30), inset 0 -2px 0 rgba(0,0,0,.4); }
.vs-plate.left { background: #6f4b2a; transform: translateX(-150%); transition: transform .4s cubic-bezier(.2,.7,.3,1); }
.vs-plate.right { background: #855e35; transform: translateX(150%); transition: transform .4s cubic-bezier(.2,.7,.3,1); }
.vs-plate.left.in, .vs-plate.right.in { transform: translateX(0); }
/* 吊るす紐と穴 */
.vs-plate::before { content: ""; position: absolute; left: 50%; top: -34px; width: 2px; height: 34px;
  background: #241f1c; transform: translateX(-50%); }
.vs-hole { position: absolute; left: 50%; top: 7px; width: 9px; height: 9px; border-radius: 50%;
  transform: translateX(-50%); background: #2a1c0e; box-shadow: inset 0 1px 1px rgba(0,0,0,.7), 0 1px 0 rgba(255,224,170,.2); }
.vs-name { display: block; margin-top: 10px; color: #241c14; font-weight: 900; font-size: 19px; letter-spacing: .04em;
  line-height: 1.15; text-shadow: 0 1px 0 rgba(255,224,170,.18); word-break: break-word; }

/* ── 中央の「対」── */
.vs-tai { position: absolute; left: 50%; top: 50%; z-index: 3; opacity: 0;
  transform: translate(-50%,-50%) scale(1);
  font-weight: 900; font-size: 92px; line-height: 1; color: #e0483b;
  -webkit-text-stroke: 4px #f4eddc; text-shadow: 0 4px 0 rgba(0,0,0,.28); }
.vs-tai.drop { animation: vsDrop .3s cubic-bezier(.2,.7,.3,1.2) both; }
.vs-tai.static { opacity: 1; }
@keyframes vsDrop {
  0%   { opacity: 0; transform: translate(-50%, calc(-50% - 210px)) scale(.9); }
  55%  { opacity: 1; }
  75%  { opacity: 1; transform: translate(-50%,-50%) scale(1.2); }
  100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }

/* ── 大将のセリフ（下部・のれん状の帯）── */
.vs-speech { position: absolute; left: 0; right: 0; bottom: 17%; display: flex; justify-content: center; padding: 0 16px; z-index: 2; }
.vs-band { position: relative; max-width: 88%; background: #f0e6d2; color: #2a2520;
  padding: 13px 24px 14px; border-radius: 3px; font-weight: 800; font-size: 15px; letter-spacing: .04em; text-align: center;
  box-shadow: inset 0 1px 0 #fffdf5, inset 0 -1px 0 #b0a37d; }
.vs-band::before { content: ""; position: absolute; left: 10px; right: 10px; top: -5px; height: 4px; border-radius: 2px; background: #241f1c; }
.vs-band .cur { opacity: .5; }

.vs-skip { position: absolute; left: 0; right: 0; bottom: 6%; text-align: center; font-size: 11px; letter-spacing: .2em; color: rgba(240,230,210,.5); z-index: 2; }

@media (prefers-reduced-motion: reduce) {
  .vs-inner.shake { animation: none; }
  .vs-plate.left, .vs-plate.right { transition: none; }
  .vs-tai.drop { animation: none; opacity: 1; }
  .ymt-steam { animation: none; opacity: 0; }
}
`;

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function VsIntro({ leftName = "きみ", rightName = "あいて", onDone }) {
  const [noren, setNoren] = useState(true);
  const [leftIn, setLeftIn] = useState(false);
  const [rightIn, setRightIn] = useState(false);
  const [tai, setTai] = useState(false);
  const [shake, setShake] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [typed, setTyped] = useState(0);
  const [isReduced] = useState(() => reduced());
  const [line] = useState(() => SHOUT[Math.floor(Math.random() * SHOUT.length)]);
  const doneRef = useRef(false);
  const canSkipRef = useRef(false); // マウント直後の残留タップで即閉じしないためのガード

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };
  // タップでスキップ（のれんが開くまでの残留イベントは無視）
  const skip = () => {
    if (!canSkipRef.current) return;
    finish();
  };

  // タイムライン
  useEffect(() => {
    if (isReduced) {
      setNoren(false);
      setLeftIn(true);
      setRightIn(true);
      setTai(true);
      setSpeak(true);
      setTyped(line.length);
      canSkipRef.current = true;
      const t = setTimeout(finish, 800);
      return () => clearTimeout(t);
    }
    const ts = [];
    ts.push(setTimeout(() => setNoren(false), 500)); // のれん開き終わり
    ts.push(setTimeout(() => setLeftIn(true), 500));
    ts.push(setTimeout(() => (canSkipRef.current = true), 600)); // のれんが開いてからスキップ可
    ts.push(setTimeout(() => setRightIn(true), 700));
    ts.push(setTimeout(() => setTai(true), 1100));
    ts.push(setTimeout(() => setShake(true), 1300));
    ts.push(setTimeout(() => setSpeak(true), 1300));
    // 2.0秒のタイムラインを完走 → 対の着地後にさらに0.3秒の溜め → 遷移
    ts.push(setTimeout(() => finish(), 2300));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // セリフを一文字ずつ（0.04s間隔）
  useEffect(() => {
    if (!speak || isReduced) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= line.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [speak, line, isReduced]);

  return (
    <div className="vs-root" role="dialog" aria-label="対戦開始" onClick={skip}>
      <style>{CSS}</style>
      <div className={`vs-inner ${shake ? "shake" : ""}`}>
        {/* 夜の屋台の背景（トップと同じ素材）*/}
        <div className="ymt-bg" aria-hidden>
          <span className="ymt-lantern" style={{ top: "6%", left: "12%", transform: "scale(1.05)" }}>
            <span className="cord" />
            <span className="paper" />
          </span>
          <span className="ymt-lantern" style={{ top: "8%", right: "12%", transform: "scale(.85)" }}>
            <span className="cord" />
            <span className="paper" />
          </span>
          <span className="ymt-steam" style={{ left: "28%" }} />
          <span className="ymt-steam" style={{ left: "68%", animationDelay: "3.5s" }} />
          <div className="ymt-counter" />
        </div>

        {/* 名札＋対 */}
        <div className="vs-stage">
          <div className={`vs-plate left ${leftIn ? "in" : ""}`}>
            <span className="vs-hole" />
            <span className="vs-name">{leftName}</span>
          </div>
          <div className={`vs-plate right ${rightIn ? "in" : ""}`}>
            <span className="vs-hole" />
            <span className="vs-name">{rightName}</span>
          </div>
          <div className={`vs-tai ${isReduced ? "static" : tai ? "drop" : ""}`}>対</div>
        </div>

        {/* 大将のセリフ */}
        {speak && (
          <div className="vs-speech">
            <div className="vs-band">{line.slice(0, typed)}</div>
          </div>
        )}
        <div className="vs-skip">タップでスキップ</div>
      </div>

      {/* 0.0-0.5s：のれんが開く */}
      {noren && <NorenWipe phase="opening" />}
    </div>
  );
}
