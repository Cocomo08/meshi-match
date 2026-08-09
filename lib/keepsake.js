// 思い出の記録（同じ相手とのマッチ履歴）の保存先。
//  読み書きは access() の1か所に集約してあり、後でサーバ等へ差し替えやすい。
//  現在の保存先：localStorage（端末内）。

const KEY = "meshi.keepsake.v1";

// 唯一の読み書き地点。mutator を渡すと書き込み、無ければ読み取り。
function access(mutator) {
  if (typeof window === "undefined") return {};
  let data = {};
  try {
    data = JSON.parse(window.localStorage.getItem(KEY) || "{}") || {};
  } catch {
    data = {};
  }
  if (mutator) {
    const next = mutator(data) || data;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 保存不可（プライベートモード等）でも落とさない */
    }
    return next;
  }
  return data;
}

// 二人を表す安定キー（名前を正規化して並べ替え）。厳密な同定ではなく体感上の「同じ相手」。
export function pairKey(a, b) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  return [norm(a), norm(b)].sort().join("__");
}

// 今回のマッチを記録し、「二人の何杯目か」を返す。
//  同じ ticketNo は二重計上しない（再描画・再読み込みでも増えない）。
export function recordMatch({ a, b, ticketNo, matchCount = 0, genres = [], at = null }) {
  const key = pairKey(a, b);
  const tno = ticketNo == null ? "" : String(ticketNo);
  let ordinal = 0;
  access((data) => {
    const rec = data[key] || { tickets: [], history: [] };
    if (tno && !rec.tickets.includes(tno)) {
      rec.tickets.push(tno);
      rec.history.push({ ticketNo: tno, matchCount, genres, at });
    }
    ordinal = rec.tickets.length || (tno ? 1 : 0);
    data[key] = rec;
    return data;
  });
  return ordinal;
}
