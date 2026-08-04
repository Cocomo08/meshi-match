// Firebase の接続設定。ここに値が入るとオンライン対戦（2台通信）が有効になります。
// すべて「公開して安全な値」です（秘密鍵ではありません。保護は Realtime Database のルールで行います）。
//
// 設定方法（どちらか）:
//  A) 下の HARDCODED に貼る（個人開発はこれが一番かんたん）
//  B) ビルド時の環境変数 NEXT_PUBLIC_FIREBASE_* で渡す
//
// 未設定のときは自動的に「ローカル通信モード（同じ端末のタブ間のみ）」で動きます。

const HARDCODED = {
  apiKey: "",
  authDomain: "",
  databaseURL: "", // 例: https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app
  projectId: "",
  appId: "",
};

const fromEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const merged = {
  apiKey: fromEnv.apiKey || HARDCODED.apiKey,
  authDomain: fromEnv.authDomain || HARDCODED.authDomain,
  databaseURL: fromEnv.databaseURL || HARDCODED.databaseURL,
  projectId: fromEnv.projectId || HARDCODED.projectId,
  appId: fromEnv.appId || HARDCODED.appId,
};

// Realtime Database URL と apiKey があればオンライン有効
export const hasFirebase = Boolean(merged.databaseURL && merged.apiKey);
export const firebaseConfig = hasFirebase ? merged : null;
