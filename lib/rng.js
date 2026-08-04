// 種（seed）から決定的な擬似乱数を作る。
// 同じ seed なら2台で同じ結果・同じ演出になる（ミニゲームの同期に使用）。

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 文字列から seed 数値を作る（xfnv1a）
export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 新しいランダム seed 文字列（ホストが生成して共有）
export function newSeed() {
  return Math.random().toString(36).slice(2, 10);
}
