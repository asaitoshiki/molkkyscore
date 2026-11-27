# TODO.md — 今後の開発タスク

優先度: **高** = 次にやる／**中** = ストア公開までに／**低** = いつか

担当欄の「利用者」は、アカウントや秘密情報が要るため AI ではできないもの。

## 高

- [ ] **Play Console で `com.molmemo.app` のアプリを作成する**（利用者）。アプリ名・日本語・アプリ・無料
- [ ] **実機での確認**（利用者＋AI）: 最新 APK で、観戦の QR → 友達の端末で観戦と点数入力、テスト通知、お知らせ
- [ ] **リリース用の署名の鍵を作る**（利用者）: 手順は `docs/play-store.md` の 2〜3。GitHub Secrets に
  `ANDROID_KEYSTORE_BASE64`・`ANDROID_KEYSTORE_PASSWORD`・`ANDROID_KEY_ALIAS`・`ANDROID_KEY_PASSWORD` を登録
- [ ] **動作確認用の APK もリリース用の鍵で署名する**（AI）: 上の鍵ができたら `.github/workflows/android.yml` を変える。
  上書きインストールできるようになり、記録が消えなくなる

## 中（ストア公開まで）

- [ ] プライバシーポリシーの連絡先メールアドレスを入れる（利用者が決める → AI が `src/pages/PrivacyPolicyPage.tsx` に記載）
- [ ] AdMob の本番 ID に差し替える（利用者が https://admob.google.com でアプリを登録し、アプリ ID と
  インタースティシャルの広告ユニット ID を発行 → AI が `android/app/src/main/AndroidManifest.xml` の
  `com.google.android.gms.ads.APPLICATION_ID` と `src/ads/admob.ts` の `INTERSTITIAL_UNIT` を変更）
- [ ] Google Play デベロッパー登録と、お支払いプロファイル（販売者アカウント）の登録（利用者）
- [ ] Play Console にアプリ内アイテム `molkkyscore.adfree`（480 円・非消費型）を登録（利用者）。
  価格を変えるときは `src/domain/billing.ts` の `AD_FREE_PRICE` も合わせる
- [ ] 楽天アフィリエイト ID（`src/domain/promotions.ts`）が利用者本人のものか確かめる
- [ ] クローズドテスト（12 人・14 日）を回す（利用者）。進め方は `docs/closed-testing.md`
- [ ] ストア掲載用のスクリーンショットと説明文（`docs/play-store.md`）

## 低

- [ ] 旧 URL（github.io）の Web 版で記録した人向けに、新しい URL へ記録を移す手段を用意するか決める
- [ ] 旧 URL の GitHub Pages をいつ止めるか決める
- [ ] 小さな画面で 3 チーム以上のときの試合画面の詰め方
- [ ] `docs/app-overview.md` の大会の記述を整理する
- [ ] 自分のドメインを取るか決める（取ると公開先を移してもリンクが変わらない）
- [ ] モルメモ 大会（別リポジトリ）の Web 版の公開と、見た目の統一
