# 本部で運営する大会の Firebase

本部とコートのやり取りは Firebase Realtime Database の `events/` に置く。
普段の観戦（`watch/`）と同じプロジェクトでも動くが、無料プランの同時接続 100 を取り合うので、
大会で使う前に大会専用のプロジェクトへ分けておくのがよい。

## ルールの公開（必須）

`database.rules.json` を Firebase コンソールの「Realtime Database → ルール」に貼り付けて公開する。
`events` の部分がないと、本部で大会を開けない。

## 大会専用のプロジェクトに分ける手順

1. Firebase コンソールで新しいプロジェクトを作る（Google アナリティクスはオフでよい）
2. Realtime Database をシンガポール（asia-southeast1）に作り、上のルールを公開する
3. Authentication で「匿名」を有効にする
4. ウェブアプリを追加し、表示された `firebaseConfig` を
   `src/sync/firebase.ts` の `EVENT_FIREBASE_CONFIG` に貼る

## 手元での確認（エミュレーター）

```sh
npx firebase emulators:start --only database,auth --project demo-molkky
VITE_FIREBASE_EMULATOR=127.0.0.1 npm run dev
```

アプリは本番と同じデータベース名でつなぐので、ルールはその名前に読み込ませる。

```sh
curl -X PUT -H "Authorization: Bearer owner" --data-binary @database.rules.json \
  "http://127.0.0.1:9000/.settings/rules.json?ns=molkkyscore-223e5-default-rtdb"
```
