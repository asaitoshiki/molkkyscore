# モルックノート

モルックのスコア記録・戦績管理・大会運営をまとめたアプリ。
まず Web（PWA）として作り、そのままスマホのアプリストア配信へつなげる想定で構成している。

## できること

| 機能 | 内容 |
| --- | --- |
| スコア記録 | 倒したスキットルをタップするだけで得点を自動計算。50 点超過で 25 点に戻る／3 回連続ミスで失格まで判定する |
| 試合の準備 | チーム数 → チーム名 → 投げる順番の 3 段階。順番は取っ手を長押しして入れ替える |
| 連戦（セット） | 同じ顔ぶれで続けてゲームを行い、ゲームごとの得点と合計を表で持つ |
| 訂正と巻き戻し | 投球を 1 件ずつ見直し、倒したスキットルを直したり任意の時点まで戻したりできる |
| 試合履歴 | 途中中断した試合の再開、過去の試合の振り返り |
| 戦績・統計 | 勝率ランキング、平均得点、ミス率、50 点超過回数、スキットル番号別の撃破数 |
| メンバー管理 | よく遊ぶメンバーの登録・改名・削除 |
| 大会運営 | チームとメンバーを登録して対戦表を自動生成。誰が何番のスキットルを倒したかまで記録する |
| 画像で共有 | 試合結果カードとスコアシートを画像にして共有・保存 |
| ルール説明 | 初期配置図つきの公式ルール解説。投げ方の可否まで記載 |
| 広告と課金 | ゲームの区切りだけに出る全画面広告と、買い切りで消す導線（実配信はネイティブ化後） |
| 的当て練習 | 狙うスキットルと距離を決めて命中率を記録 |

データは端末の localStorage に保存する。サーバー不要・オフラインで動作する。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # ルール計算のテスト
npm run typecheck  # 型チェック
npm run build      # 本番ビルド（dist/）
npm run preview    # ビルド結果の確認
```

## 構成

```
src/
  domain/     ルール計算（純粋関数のみ。UI にもストアにも依存しない）
    rules.ts        得点計算・初期配置などの定数
    game.ts         投球記録から試合状態を導出する
    stats.ts        保存済みの試合を再生して通算成績を集計する
    scoresheet.ts   投球記録を参加者 × ラウンドの表に組み直す
    series.ts       連戦のゲームごとの得点と合計を集計する
    timeline.ts     投球を時系列に並べ、訂正と巻き戻しの材料にする
    tournament.ts   対戦表の生成・勝ち上がり・順位表
  store/      zustand + localStorage による永続化
  share/      スコアを画像に描き出す（キャンバス描画と共有）
  components/ 画面をまたいで使う部品
  pages/      画面
```

試合の状態（得点・連続ミス・手番）は保存せず、投球記録の配列から毎回導出している。
そのため「1 投取消」は記録を 1 件削るだけで成立し、途中で状態が食い違うことがない。

## Web に公開する

`.github/workflows/deploy.yml` が `main` への push を受けてビルドし、GitHub Pages に公開する。
はじめて使うときだけ Settings → Pages → Source を「GitHub Actions」に設定する。

公開先は https://asaitoshiki.github.io/molkkyscore/ 。
相対パスで出力しているので、Cloudflare Pages や Netlify にそのまま載せることもできる
（ビルドコマンド `npm run build`、出力 `dist`）。

## 広告と課金

`src/ads/` に広告の枠、`src/domain/billing.ts` に商品 ID と価格を置いている。
現状は枠と導線だけで、実際の配信と決済はネイティブ化したあとに入る。

- **全画面のみ** — ゲームの区切りだけ。`INTERSTITIAL_INTERVAL` ゲームおきに 1 回。
  バナーは置かない（画面が狭くなるうえ、屋外での誤タップで試合の記録が壊れるため）
- **買い切り** — `/remove-ads`。購入後は広告の配信そのものを止める

Capacitor と AdMob の配線は済んでいる。端末の上では実際の広告を出し、Web では
同じ間合いの代替画面を出す。**広告 ID は Google のテスト用のまま**なので、
公開前に自分の ID へ差し替える。

課金は `cordova-plugin-purchase` で端末のストアに直接つないでいる。外部の
サービスを挟まないため、追加のアカウントも API キーも要らない。買い切り 1 つ
なので、レシートは端末のストアが持つものをそのまま信じる方針にしている。

通信できないときに「未購入」と判定して広告を出すと、支払った人の体験を壊す。
そのため起動時の照会は購入済みと分かったときだけ状態を進め、取り消しや返金の
反映は「購入を復元する」に任せている。

購入ボタンと復元ボタンは、端末のストアが使えないとき（Web）は無効になり、
代わりに表示確認用のトグルが出る。アプリ版ではトグルは出ない。

ストア公開前にやること。

1. AdMob で発行した ID に差し替える
   - `android/app/src/main/AndroidManifest.xml` の `com.google.android.gms.ads.APPLICATION_ID`
   - `src/ads/admob.ts` の `INTERSTITIAL_UNIT`
2. Google Play Console と App Store Connect に、非消費型の商品
   `molkkyscore.adfree` を登録する（`src/domain/billing.ts` の ID と揃える）
3. `src/domain/billing.ts` の `AD_FREE_PRICE` を、ストアに登録した価格に合わせる
4. `PrivacyPolicyPage` の連絡先と最終更新日を記載する

## Android アプリをビルドする

手元に Android Studio がなくても、GitHub のランナーで APK を作れる。
Actions タブの **Android APK** → Run workflow を実行すると、数分で
成果物 `molkkyscore-debug-apk` が付く。zip を展開した `app-debug.apk` を
端末に移し、提供元不明のアプリの許可を出してから開くとインストールできる。

手元にビルド環境がある場合（Android Studio と JDK 21）。

```bash
npm run sync          # Web をビルドして android/ へ反映
npm run open:android  # Android Studio で開く
```

アプリ ID は `io.github.asaitoshiki.molkkyscore`（`capacitor.config.ts`）。

ストアに出すには署名した AAB が必要になる。鍵（keystore）は作成した本人が
保管し、リポジトリには入れない。紛失すると同じアプリとして更新できなくなる。

iOS は macOS と Xcode が必要になる。

```bash
npm install @capacitor/ios
npx cap add ios
npx cap open ios
```

## 今後の展開

1. **Web（現在）** — PWA としてホーム画面に追加できる。GitHub Pages などに静的配信できる
2. **ネイティブ package 化** — Capacitor でこの Web 資産をそのまま iOS / Android アプリにする
3. **ストア申請** — アイコン・スクリーンショット・プライバシーポリシーを整えて App Store / Google Play へ
4. **その後の候補** — クラウド同期とアカウント、オンライン対戦、試合のシェア画像生成
