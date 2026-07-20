// 1階：ジャンルマッチ用データ（全国どこでも使える）
// 4カテゴリ・計20ジャンル
export const GENRES = [
  // 和食
  { id: "sushi", label: "寿司", emoji: "🍣", category: "和食", gradient: "from-sky-400 via-cyan-500 to-teal-500" },
  { id: "ramen", label: "ラーメン", emoji: "🍜", category: "和食", gradient: "from-amber-400 via-orange-500 to-red-500" },
  { id: "udon_soba", label: "うどん・そば", emoji: "🍲", category: "和食", gradient: "from-stone-400 via-neutral-500 to-slate-600" },
  { id: "teishoku", label: "定食", emoji: "🍱", category: "和食", gradient: "from-lime-400 via-green-500 to-emerald-600" },
  { id: "donburi", label: "丼もの", emoji: "🍚", category: "和食", gradient: "from-amber-500 via-yellow-600 to-orange-600" },
  // 洋食
  { id: "hamburg", label: "ハンバーグ", emoji: "🍔", category: "洋食", gradient: "from-orange-500 via-red-600 to-rose-700" },
  { id: "pasta", label: "パスタ", emoji: "🍝", category: "洋食", gradient: "from-green-500 via-emerald-500 to-lime-500" },
  { id: "pizza", label: "ピザ", emoji: "🍕", category: "洋食", gradient: "from-red-500 via-rose-500 to-orange-500" },
  { id: "omurice", label: "オムライス", emoji: "🍳", category: "洋食", gradient: "from-yellow-400 via-amber-500 to-orange-500" },
  { id: "steak", label: "ステーキ", emoji: "🥩", category: "洋食", gradient: "from-rose-600 via-red-700 to-stone-800" },
  // アジア・エスニック
  { id: "curry", label: "カレー", emoji: "🍛", category: "アジア・エスニック", gradient: "from-amber-500 via-orange-600 to-yellow-700" },
  { id: "gyoza", label: "餃子・中華", emoji: "🥟", category: "アジア・エスニック", gradient: "from-amber-400 via-yellow-500 to-lime-600" },
  { id: "korean", label: "韓国料理", emoji: "🌶️", category: "アジア・エスニック", gradient: "from-red-500 via-rose-500 to-pink-500" },
  { id: "yakitori", label: "焼き鳥", emoji: "🍢", category: "アジア・エスニック", gradient: "from-amber-500 via-orange-600 to-red-700" },
  { id: "ethnic", label: "タイ・エスニック", emoji: "🥘", category: "アジア・エスニック", gradient: "from-green-400 via-teal-500 to-cyan-600" },
  // がっつり・ごちそう
  { id: "yakiniku", label: "焼肉", emoji: "🍖", category: "がっつり・ごちそう", gradient: "from-rose-500 via-red-600 to-orange-600" },
  { id: "nabe", label: "鍋", emoji: "🫕", category: "がっつり・ごちそう", gradient: "from-orange-500 via-red-500 to-rose-600" },
  { id: "karaage", label: "唐揚げ・フライドチキン", emoji: "🍗", category: "がっつり・ごちそう", gradient: "from-amber-400 via-orange-500 to-yellow-600" },
  { id: "okonomiyaki", label: "お好み焼き・たこ焼き", emoji: "🐙", category: "がっつり・ごちそう", gradient: "from-orange-400 via-amber-600 to-yellow-700" },
  { id: "tempura", label: "天ぷら・とんかつ", emoji: "🍤", category: "がっつり・ごちそう", gradient: "from-yellow-400 via-amber-500 to-orange-600" },
];

// 2階：店マッチ用データ（四谷限定・厳選30店）
// ※ 店舗はデモ用のサンプルデータです。genre は上記の新ジャンルIDに対応。
export const STORES = [
  { id: 1, genre: "ramen", name: "麺屋 四ツ谷こがね", copy: "鶏白湯の濃厚一杯。深夜まで営業", price: "¥1,000前後", walk: 3, tags: ["深夜OK", "行列店"] },
  { id: 2, genre: "ramen", name: "しんみち 中華そば堂", copy: "しんみち通りの醤油クラシック", price: "¥900前後", walk: 4, tags: ["昔ながら", "一人でも"] },
  { id: 3, genre: "ramen", name: "荒木町 塩そば紬", copy: "貝出汁の澄んだ塩。〆にも最適", price: "¥1,100前後", walk: 8, tags: ["〆ラーメン", "上品"] },
  { id: 4, genre: "sushi", name: "鮨 よつや一心", copy: "カウンター8席のおまかせ小僧寿司", price: "¥8,000〜", walk: 5, tags: ["記念日", "カウンター"] },
  { id: 5, genre: "sushi", name: "立ち寿司 やまと", copy: "気軽に立ち食い、ネタは本格派", price: "¥3,000前後", walk: 2, tags: ["サク飲み", "コスパ"] },
  { id: 6, genre: "sushi", name: "回転すし 四谷丸", copy: "家族でもデートでも回転寿司の安心感", price: "¥2,500前後", walk: 6, tags: ["カジュアル", "家族OK"] },
  { id: 7, genre: "yakiniku", name: "炭火焼肉 よんや", copy: "厚切りタン塩が名物の炭火焼肉", price: "¥5,000前後", walk: 4, tags: ["デート", "個室あり"] },
  { id: 8, genre: "yakiniku", name: "ホルモン新道", copy: "しんみち通りの煙もくもく大衆ホルモン", price: "¥3,500前後", walk: 3, tags: ["ワイワイ", "大衆系"] },
  { id: 9, genre: "yakiniku", name: "焼肉 荒木町むら", copy: "落ち着いた個室で和牛コース", price: "¥8,000〜", walk: 9, tags: ["記念日", "個室"] },
  { id: 10, genre: "korean", name: "四谷サムギョプサル苑", copy: "鉄板で焼くサムギョプサル食べ放題", price: "¥3,500前後", walk: 5, tags: ["食べ放題", "ワイワイ"] },
  { id: 11, genre: "korean", name: "韓国食堂 オンマの味", copy: "スンドゥブとチヂミの家庭派", price: "¥1,500前後", walk: 6, tags: ["ランチ人気", "一人でも"] },
  { id: 12, genre: "pizza", name: "トラットリア クアトロ", copy: "薪窯ピッツァとナポリの空気", price: "¥4,000前後", walk: 5, tags: ["デート", "ピッツァ"] },
  { id: 13, genre: "pasta", name: "パスタ食堂 ヨツヤナポリ", copy: "大盛り無料の生パスタ専門", price: "¥1,200前後", walk: 2, tags: ["ランチ", "コスパ"] },
  { id: 14, genre: "pasta", name: "ワインとチーズ ボッカ", copy: "自然派ワインと前菜とパスタで夜更かし", price: "¥5,000前後", walk: 7, tags: ["ワイン", "夜更かし"] },
  { id: 15, genre: "steak", name: "ビストロ シェ・ヨツヤ", copy: "気取らないビストロの熟成肉ステーキ", price: "¥6,000前後", walk: 6, tags: ["デート", "肉"] },
  { id: 16, genre: "steak", name: "ル・キャトル", copy: "記念日向けの本格ステーキコース", price: "¥12,000〜", walk: 8, tags: ["記念日", "要予約"] },
  { id: 17, genre: "gyoza", name: "四川飯店 花椒房", copy: "痺れる麻婆豆腐と本格中華", price: "¥1,300前後", walk: 4, tags: ["激辛", "ランチ人気"] },
  { id: 18, genre: "gyoza", name: "餃子酒場 よつばし", copy: "羽根つき餃子とレモンサワー", price: "¥2,500前後", walk: 3, tags: ["サク飲み", "餃子"] },
  { id: 19, genre: "gyoza", name: "広東名菜 龍門", copy: "町中華を超えた本格広東料理", price: "¥4,000前後", walk: 7, tags: ["家族OK", "宴会"] },
  { id: 20, genre: "curry", name: "スパイスカレー 巡礼", copy: "週替わり2種あいがけの間借り系", price: "¥1,200前後", walk: 5, tags: ["スパイス", "ランチ"] },
  { id: 21, genre: "curry", name: "欧風カレー ヨツヤ堂", copy: "10日煮込みの欧風ルウ", price: "¥1,400前後", walk: 3, tags: ["老舗風", "一人でも"] },
  { id: 22, genre: "udon_soba", name: "手打そば 志お里", copy: "十割そばと季節の天ぷら", price: "¥1,800前後", walk: 6, tags: ["落ち着く", "昼飲み"] },
  { id: 23, genre: "udon_soba", name: "讃岐うどん 四ツ谷麦", copy: "打ちたてコシ最強の讃岐系", price: "¥800前後", walk: 2, tags: ["コスパ", "サク飯"] },
  { id: 24, genre: "nabe", name: "もつ鍋 よんちょうめ", copy: "コク味噌もつ鍋とホッピー", price: "¥3,500前後", walk: 4, tags: ["ワイワイ", "冬定番"] },
  { id: 25, genre: "teishoku", name: "四谷食堂 まんぷく亭", copy: "日替わり焼き魚と小鉢の定食", price: "¥1,000前後", walk: 5, tags: ["ランチ", "家庭的"] },
  { id: 26, genre: "teishoku", name: "炉端 あらきや", copy: "炉端焼きと季節の定食", price: "¥2,500前後", walk: 9, tags: ["隠れ家", "昼飲み"] },
  { id: 27, genre: "ethnic", name: "タイ屋台 コップンカー", copy: "ガパオとカオマンガイの屋台味", price: "¥1,300前後", walk: 4, tags: ["ランチ", "パクチー"] },
  { id: 28, genre: "ethnic", name: "ベトナム食堂 フォーの木", copy: "澄んだスープのフォーと生春巻き", price: "¥1,400前後", walk: 6, tags: ["ヘルシー", "女子会"] },
  { id: 29, genre: "omurice", name: "喫茶 よつば館", copy: "とろとろ卵のオムライスとプリン", price: "¥1,200前後", walk: 3, tags: ["レトロ", "作業OK"] },
  { id: 30, genre: "teishoku", name: "定食や 麦と塩", copy: "焼きたてご飯の朝定食が人気", price: "¥1,000前後", walk: 5, tags: ["モーニング", "テイクアウト"] },
];

export const getStoresByGenre = (genreId) =>
  STORES.filter((s) => s.genre === genreId);

export const getGenre = (genreId) => GENRES.find((g) => g.id === genreId);
