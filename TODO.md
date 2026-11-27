# TODO.md — 今後の開発タスク

優先度: **高** = 次にやる／**中** = ストア公開までに／**低** = いつか

担当欄の「利用者」は、アカウントや秘密情報が要るため AI ではできないもの。

## 高

- [ ] **内部テストに AAB を上げる**（AI が Actions「Android Release」で AAB を作る → 利用者が Play Console の「内部テスト」にアップロード）
- [ ] **実機での確認**（利用者＋AI）: 最新 APK で、観戦の QR → 友達の端末で観戦と点数入力、テスト通知、お知らせ

## 中（ストア公開まで）

- [ ] プライバシーポリシーの連絡先メールアドレスを入れる（利用者が決める → AI が `src/pages/PrivacyPolicyPage.tsx` に記載）
- [ ] AdMob の本番 ID に差し替える（利用者が https://admob.google.com でアプリを登録し、アプリ ID と
  インタースティシャルの広告ユニット ID を発行 → AI が `android/app/src/main/AndroidManifest.xml` の
  `com.google.android.gms.ads.APPLICATION_ID` と `src/ads/admob.ts` の `INTERSTITIAL_UNIT` を変更）
- [ ] お支払いプロファイル（販売者アカウント）の登録（利用者。デベロッパー登録とアプリ作成は済み）
- [ ] 価格を決め、Play Console に `molkkyscore.adfree` の非消費型の購入オプションを登録・有効化する（利用者）。
  アプリはストアの表示価格を使う
- [ ] Play 内部テストとライセンステスターで広告、購入、保留、キャンセル、復元、オフラインでの広告除去を確認する（利用者＋AI）。
  確認手順は `docs/play-store.md`
- [ ] AdMob の「プライバシーとメッセージ」で同意メッセージを設定し、対象地域で必要になる同意設定の再表示方法を確認する
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
