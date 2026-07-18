// 1階：ジャンルマッチ用データ（全国どこでも使える）
export const GENRES = [
  { id: "ramen", label: "ラーメン", emoji: "🍜", gradient: "from-amber-400 via-orange-500 to-red-500" },
  { id: "sushi", label: "寿司", emoji: "🍣", gradient: "from-sky-400 via-cyan-500 to-teal-500" },
  { id: "yakiniku", label: "焼肉", emoji: "🥩", gradient: "from-rose-500 via-red-600 to-orange-600" },
  { id: "korean", label: "韓国料理", emoji: "🌶️", gradient: "from-red-500 via-rose-500 to-pink-500" },
  { id: "italian", label: "イタリアン", emoji: "🍝", gradient: "from-green-500 via-emerald-500 to-lime-500" },
  { id: "french", label: "フレンチ", emoji: "🥂", gradient: "from-indigo-400 via-violet-500 to-purple-600" },
  { id: "chinese", label: "中華", emoji: "🥟", gradient: "from-yellow-400 via-amber-500 to-orange-500" },
  { id: "curry", label: "カレー", emoji: "🍛", gradient: "from-amber-500 via-yellow-600 to-orange-600" },
  { id: "soba", label: "そば・うどん", emoji: "🥢", gradient: "from-stone-400 via-neutral-500 to-slate-600" },
  { id: "izakaya", label: "居酒屋", emoji: "🏮", gradient: "from-orange-500 via-red-500 to-rose-600" },
  { id: "ethnic", label: "タイ・エスニック", emoji: "🍤", gradient: "from-lime-400 via-green-500 to-emerald-600" },
  { id: "cafe", label: "カフェ飯", emoji: "🥪", gradient: "from-teal-400 via-sky-400 to-blue-500" },
];

// 2階：店マッチ用データ（四谷限定・厳選30店）
// ※ 店舗はデモ用のサンプルデータです
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
  { id: 12, genre: "italian", name: "トラットリア クアトロ", copy: "薪窯ピッツァとナポリの空気", price: "¥4,000前後", walk: 5, tags: ["デート", "ピッツァ"] },
  { id: 13, genre: "italian", name: "パスタ食堂 ヨツヤナポリ", copy: "大盛り無料の生パスタ専門", price: "¥1,200前後", walk: 2, tags: ["ランチ", "コスパ"] },
  { id: 14, genre: "italian", name: "ワインとチーズ ボッカ", copy: "自然派ワインと前菜で夜更かし", price: "¥5,000前後", walk: 7, tags: ["ワイン", "夜更かし"] },
  { id: 15, genre: "french", name: "ビストロ シェ・ヨツヤ", copy: "気取らないビストロの黒板メニュー", price: "¥6,000前後", walk: 6, tags: ["デート", "ビストロ"] },
  { id: 16, genre: "french", name: "ル・キャトル", copy: "記念日向けの本格コースフレンチ", price: "¥12,000〜", walk: 8, tags: ["記念日", "要予約"] },
  { id: 17, genre: "chinese", name: "四川飯店 花椒房", copy: "痺れる麻婆豆腐の専門店", price: "¥1,300前後", walk: 4, tags: ["激辛", "ランチ人気"] },
  { id: 18, genre: "chinese", name: "餃子酒場 よつばし", copy: "羽根つき餃子とレモンサワー", price: "¥2,500前後", walk: 3, tags: ["サク飲み", "餃子"] },
  { id: 19, genre: "chinese", name: "広東名菜 龍門", copy: "町中華を超えた本格広東料理", price: "¥4,000前後", walk: 7, tags: ["家族OK", "宴会"] },
  { id: 20, genre: "curry", name: "スパイスカレー 巡礼", copy: "週替わり2種あいがけの間借り系", price: "¥1,200前後", walk: 5, tags: ["スパイス", "ランチ"] },
  { id: 21, genre: "curry", name: "欧風カレー ヨツヤ堂", copy: "10日煮込みの欧風ルウ", price: "¥1,400前後", walk: 3, tags: ["老舗風", "一人でも"] },
  { id: 22, genre: "soba", name: "手打そば 志お里", copy: "十割そばと季節の天ぷら", price: "¥1,800前後", walk: 6, tags: ["落ち着く", "昼飲み"] },
  { id: 23, genre: "soba", name: "讃岐うどん 四ツ谷麦", copy: "打ちたてコシ最強の讃岐系", price: "¥800前後", walk: 2, tags: ["コスパ", "サク飯"] },
  { id: 24, genre: "izakaya", name: "大衆酒場 よんちょうめ", copy: "レトロ酒場でホッピーと煮込み", price: "¥3,000前後", walk: 4, tags: ["レトロ", "サク飲み"] },
  { id: 25, genre: "izakaya", name: "魚と日本酒 灯", copy: "その日の鮮魚と全国の日本酒", price: "¥5,000前後", walk: 5, tags: ["日本酒", "しっぽり"] },
  { id: 26, genre: "izakaya", name: "炉端 あらきや", copy: "荒木町の路地裏、炉端焼きの隠れ家", price: "¥6,000前後", walk: 9, tags: ["隠れ家", "デート"] },
  { id: 27, genre: "ethnic", name: "タイ屋台 コップンカー", copy: "ガパオとカオマンガイの屋台味", price: "¥1,300前後", walk: 4, tags: ["ランチ", "パクチー"] },
  { id: 28, genre: "ethnic", name: "ベトナム食堂 フォーの木", copy: "澄んだスープのフォーと生春巻き", price: "¥1,400前後", walk: 6, tags: ["ヘルシー", "女子会"] },
  { id: 29, genre: "cafe", name: "喫茶 よつば館", copy: "ナポリタンとプリンの純喫茶", price: "¥1,200前後", walk: 3, tags: ["レトロ", "作業OK"] },
  { id: 30, genre: "cafe", name: "ベーカリーカフェ 麦と塩", copy: "焼きたてパンのモーニングが人気", price: "¥1,000前後", walk: 5, tags: ["モーニング", "テイクアウト"] },
];

export const getStoresByGenre = (genreId) =>
  STORES.filter((s) => s.genre === genreId);

export const getGenre = (genreId) => GENRES.find((g) => g.id === genreId);
