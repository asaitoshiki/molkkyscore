# PROGRESS.md — 開発状況

最終更新: 2026-11-27（`main` は `fed5b94` の時点）

## ひとことで

Web 版（https://molmemo.pages.dev/ ）と Android 版（動作確認用の APK）が動いている。
Google Play への公開に向けて、利用者にしか用意できないもの（連絡先・広告 ID・署名の鍵・開発者登録）が残っている。

## 実装済みの機能

| 機能 | 中身 | 主なファイル |
| --- | --- | --- |
| スコア記録 | ピンを押して決定。50 点ちょうどで勝ち、超過で 25 点、3 回連続ミスで失格。1 つ戻る | `src/pages/GamePage.tsx`、`src/domain/game.ts` |
| 試合の準備 | チーム 2〜4、試合の形（自由・1 ゲーム・2 ゲーム・先取・100 点ゲーム）。メンバー・細かいルール・ハンデは開閉式 | `src/pages/GameSetupPage.tsx`、`src/components/RulesEditor.tsx` |
| 試合ルール | ゲーム数、先取、合計点、制限時間（ラウンドの終わりまで投げてから終了）、ターン制限、次のゲームの順番、モルックアウト | `src/domain/series.ts`、`src/domain/rules.ts` |
| 手番の表示 | 次に投げるチームと人をカードで表示（ピンには重ねない） | `src/pages/GamePage.tsx` |
| 訂正と巻き戻し | 投球の履歴から 1 投ずつ直す・その時点まで戻す | `src/pages/TimelinePage.tsx`、`src/domain/timeline.ts` |
| 履歴・戦績 | 試合履歴、メンバーごとの勝率・命中率・平均得点・よく倒すスキットル | `src/pages/HistoryPage.tsx`、`src/pages/StatsPage.tsx`、`src/domain/stats.ts` |
| メンバー | 登録・改名・一覧から外す、アバター（色と 1〜2 文字） | `src/pages/MembersPage.tsx`、`src/pages/PlayerPage.tsx` |
| 画像で共有 | 結果カードとスコアシートの画像 | `src/share/` |
| ルール説明・的当て練習 | 公式ルールの説明、狙ったスキットルの命中記録 | `src/pages/RulesPage.tsx`、`src/pages/PracticePage.tsx` |
| 観戦 | アプリ版で QR を出し、読んだ人はブラウザで見る。12 時間で期限切れ | `src/components/WatchInvite.tsx`、`src/pages/WatchPage.tsx`、`src/sync/watchChannel.ts` |
| 観戦者の点数入力 | QR を出すときに「見るだけ／点数も入れる」を選ぶ。入力は記録係の端末に届いてから記録 | 同上、`src/domain/watchSnapshot.ts` |
| お知らせ | ホーム右上のベル。`public/news.json` を読み、未読なら赤い点 | `src/pages/NewsPage.tsx`、`src/sync/news.ts` |
| プッシュ通知 | Firebase Cloud Messaging。起動時に許可を聞く。`path` 付きで送ると押したときにその画面へ | `src/native/pushNotifications.ts` |
| 広告と課金 | ゲームの区切りの全画面広告（2 ゲームおき）、480 円の広告除去（買い切り） | `src/ads/`、`src/billing/`、`src/pages/RemoveAdsPage.tsx` |
| ホーム画面ウィジェット | Android の「今すぐ PLAY」 | `android/.../PlayWidgetProvider.java`、`src/native/widgetLaunch.ts` |
| 旧リンクの案内 | 大会の古いリンク（`#/e/…` など）は大会アプリへ送る | `src/pages/MovedToTaikai.tsx` |

テスト: vitest 11 ファイル・67 件（2026-11-27 時点ですべて成功）。

## 外部サービスの設定状況

| 項目 | 状況 |
| --- | --- |
| Cloudflare Pages（`molmemo`） | 設定済み。`main` への push で公開 |
| Firebase 承認済みドメインに `molmemo.pages.dev` | 設定済み（利用者が 2026-11-24 に実施と報告） |
| Firebase の `database.rules.json` の公開 | 公開済み（同上）。観戦者の入力用 `watchInput` を含む版 |
| GitHub Pages（旧 URL） | 稼働中（当面残す） |
| FCM 用の Android アプリ登録（`google-services.json`） | 済み |
| AdMob の本番 ID | **未設定**（Google のテスト用 ID のまま） |
| リリース用の署名の鍵（GitHub Secrets） | **未作成** |
| Google Play デベロッパー登録 | 未確認 |
| Play Console の商品 `molkkyscore.adfree` | 未確認 |

## 実機で確かめていないこと（未確認）

- プッシュ通知が実機に届くか（APK のビルドは成功している。2026-11-25）
- 観戦者の点数入力を実機どうしで使えるか（エミュレーターでは確認済み）
- 本番の広告と課金（ストア公開後でないと確かめられない）

## 既知の問題

- 動作確認用の APK は毎回ちがう鍵で署名されるため、上書きインストールできない（入れ直すと端末の記録が消える）。
  リリース用の鍵を作り、APK もその鍵で署名すれば直る（`TODO.md`）
- Web 版の旧 URL（github.io）で記録した分は、新しい URL（molmemo.pages.dev）には移らない
- 360×640 くらいの小さな画面で 3 チーム以上だと、試合画面の得点表の下の行はスクロールが要る
- `docs/app-overview.md`（Unity 向けの説明）の画面表に、大会アプリへ移した「大会」の行が残っている
- プライバシーポリシーの連絡先が仮の文言のまま（ストア申請に必須）

## 関連リポジトリ

- [asaitoshiki/molmemo-taikai](https://github.com/asaitoshiki/molmemo-taikai)（モルメモ 大会）: 2026-11-09 に分けた。
  Web 版はまだ公開先が未設定（GitHub Pages か Cloudflare Pages の設定が必要）。今回の見た目の統一はまだ入っていない
