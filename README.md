# モルメモ

モルックのスコア記録・戦績管理をまとめたアプリ。大会の運営は別アプリ「[モルメモ 大会](https://github.com/asaitoshiki/molmemo-taikai)」に分けた。
まず Web（PWA）として作り、そのままスマホのアプリストア配信へつなげる想定で構成している。

- Web 版: https://molmemo.pages.dev/
- 最新の APK（動作確認用）: https://github.com/asaitoshiki/molkkyscore/releases/download/apk-latest/molkkyscore-debug.apk

## AI と開発するとき

Claude Code・ChatGPT・Codex など、どの AI からでも続きを始められるよう、次のファイルで情報を共有している。

| ファイル | 中身 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | すべての AI に共通する開発ルール・コーディング規約・テスト方法 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 向けの補足（AGENTS.md を読み込む） |
| [PROGRESS.md](PROGRESS.md) | 今の開発状況・実装済み・未確認・既知の問題 |
| [TODO.md](TODO.md) | これからのタスクと優先順位 |
| [DECISIONS.md](DECISIONS.md) | 設計上の決定・理由・採らなかった案 |

## できること

| 機能 | 内容 |
| --- | --- |
| スコア記録 | 倒したスキットルをタップするだけで得点を自動計算。50 点超過で 25 点に戻る／3 回連続ミスで失格まで判定する |
| 試合の準備 | チーム数 → チーム名 → 投げる順番の 3 段階。順番は取っ手を長押しして入れ替える |
| ハンデ | 力の差があるときは、参加者ごとに持ち点から始められる |
| 連戦（セット） | 同じ顔ぶれで続けてゲームを行い、ゲームごとの得点と合計を表で持つ |
| 訂正と巻き戻し | 投球を 1 件ずつ見直し、倒したスキットルを直したり任意の時点まで戻したりできる |
| 試合履歴 | 途中中断した試合の再開、過去の試合の振り返り |
| 戦績・統計 | 勝率ランキング、平均得点、ミス率、50 点超過回数、スキットル番号別の撃破数 |
| メンバー管理 | よく遊ぶメンバーの登録・改名・削除 |
| 観戦 | QR を読むと、周りの人が自分の端末でスコアを追える。点数も入れてもらえる（QR を出せるのはアプリ版だけ） |
| お知らせ | ホーム右上のベルから。アプリ版はプッシュ通知も受け取れる |
| 画像で共有 | 試合結果カードとスコアシートを画像にして共有・保存 |
| ルール説明 | 初期配置図つきの公式ルール解説。投げ方の可否まで記載 |
| 広告と課金 | 無料で利用でき、ゲームの区切りの全画面広告と紹介リンクは買い切りで非表示にできる |
| 的当て練習 | 狙うスキットルと距離を決めて命中率を記録 |

データは端末の localStorage に保存する。記録はオフラインで動作し、ネットを使うのは観戦（Firebase）とお知らせだけ。

## 利用技術

| 分野 | 使っているもの |
| --- | --- |
| 画面 | React 19、TypeScript、Vite、Tailwind CSS v4、react-router（HashRouter） |
| 状態と保存 | zustand（persist で localStorage に保存） |
| アプリ化 | Capacitor 8（Android。iOS は未着手） |
| 通信 | Firebase Realtime Database・匿名認証（観戦）、Firebase Cloud Messaging（プッシュ通知） |
| 広告と課金 | AdMob（`@capacitor-community/admob`）、`cordova-plugin-purchase` |
| PWA | vite-plugin-pwa |
| テスト・検査 | vitest、oxlint、tsc |
| 公開 | Cloudflare Pages（Web）、GitHub Actions（APK・AAB、旧 GitHub Pages） |

## 環境構築と実行

Node.js 22 を使う（Cloudflare Pages と GitHub Actions も 22）。

```bash
npm install
npm run dev        # 開発サーバー
npm test           # ルール計算のテスト
npm run typecheck  # 型チェック
npm run build      # 本番ビルド（dist/）
npm run preview    # ビルド結果の確認
npm run lint       # oxlint
```

Firebase を使う機能を手元で試すときは、Firebase エミュレーターにつなぐ版を作れる（詳しくは AGENTS.md）。

```bash
VITE_FIREBASE_EMULATOR=127.0.0.1 npm run build
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
    watchSnapshot.ts 観戦で送る記録と、観戦者の入力の形
    news.ts         お知らせの形と未読の判定
  store/      zustand + localStorage による永続化
  sync/       Firebase（観戦）とお知らせの読み込み
  native/     アプリ版だけの機能（プッシュ通知、ウィジェットからの起動）
  ads/        全画面広告（AdMob）
  billing/    広告除去の買い切り
  sound/      効果音
  share/      スコアを画像に描き出す（キャンバス描画と共有）
  components/ 画面をまたいで使う部品
  pages/      画面
public/
  news.json   お知らせ（main に入ると全員に届く）
  _headers    Cloudflare Pages の配信設定
android/      Capacitor の Android プロジェクト
database.rules.json  Firebase Realtime Database のルール（変えたらコンソールで公開する）
docs/         ストア公開の手順、クローズドテスト、Unity 向けのアプリ説明
```

試合の状態（得点・連続ミス・手番）は保存せず、投球記録の配列から毎回導出している。
そのため「1 投取消」は記録を 1 件削るだけで成立し、途中で状態が食い違うことがない。

## Web に公開する

Cloudflare Pages（プロジェクト名 `molmemo`）が GitHub の `main` への push を受けてビルドし、
https://molmemo.pages.dev/ に公開する。ビルドの設定は Cloudflare のダッシュボードにある。

| 項目 | 値 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 環境変数 | `NODE_VERSION=22`、`VITE_BASE=./` |

配信のキャッシュ設定は `public/_headers`。

観戦リンクを開く人の匿名ログインのため、Firebase の Authentication → 承認済みドメインに
`molmemo.pages.dev` を入れておく。

以前の公開先 https://asaitoshiki.github.io/molkkyscore/ も `.github/workflows/deploy.yml` で
当面は残す。Web 版で記録していた人のデータは、そちらのブラウザに保存されているため。

## お知らせ

ホーム右上のベルから開くお知らせは、`public/news.json` を読んで出している。
新しいものを配列の先頭に足して `main` に push すると、Cloudflare Pages に公開され、
アプリを作り直さなくても全員に届く（まだ見ていない人のベルには赤い点が付く）。

```json
{
  "id": "2026-12-01-xxx",
  "date": "2026-12-01",
  "title": "見出し",
  "body": "本文（改行も使える）",
  "path": "/rules"
}
```

`id` は重ならない文字列にする。`path` は省略でき、付けると「開く」からその画面へ移る。
プッシュ通知で知らせるときは、通知のカスタムデータに `path` = `/news` を付ける。

## 観戦

記録している人が QR を出し、周りの人はそれを読んでブラウザで開く。観戦側に
インストールは要らない。見せるのはセット単位で、リンクの鍵は推測できないランダムな文字列（共有キー）。

**QR を出せるのはアプリ版だけにしている。** Web 版とアプリ版で体験がほぼ
変わらないと、広告を消す課金に理由が立たない。「みんなに見せながら記録できる
のはアプリ版」という線を引くことで、記録係の道具という位置づけをはっきりさせる。

観戦の記録は Firebase Realtime Database の `watch/{共有キー}` に送り、最後の投球から 12 時間で
期限切れになる。中身は投球とメンバー名だけで、観戦側でも同じ計算で同じ画面になる。
得点表は記録画面と同じ部品を使い回している。

QR を出すときに「見るだけ／点数も入れる」を選べる。「点数も入れる」にすると、観戦者は
`watchInput/{共有キー}` に 1 投を送り、記録係の端末が今の局面と合うときだけ記録する
（二重の入力を防ぐ。詳しくは DECISIONS.md）。通信が途切れても記録係の記録は止まらない。

## 広告と課金

Google Play では無料アプリとして配布する。アプリ版の全画面広告は「次のゲームへ」を
押したときの 2 ゲームおき。Web 版では紹介リンクのみを表示する。

「広告を表示しない」画面から非消費型商品 `molkkyscore.adfree` を買うと、
全画面広告と紹介リンクが非表示になる。価格は未確定で、ストアが返す通貨と表示価格を使う。
価格が取得できると購入ボタンが使える。

起動時はストアで確認できた購入を引き継ぎ、通信エラー時は端末に保存した購入状態を維持する。
機種変更や再インストール時は、購入時と同じアカウントで「購入を復元する」を使う。
Android では明示的な復元に成功して購入が見つからなかった場合に、広告ありへ戻る。

現在の AdMob ID は Google のテスト用。公開前の本番 ID 設定、商品登録、
ライセンステスターによる購入・復元の確認手順は [Google Play 公開手順](docs/play-store.md) を参照。

## Android アプリをビルドする

手元に Android Studio がなくても、GitHub のランナーで APK を作れる。
Actions タブの **Android APK** → Run workflow を実行すると、数分で
成果物 `molkkyscore-debug-apk` が付き、同じ APK がリリース `apk-latest` にも置かれる。
https://github.com/asaitoshiki/molkkyscore/releases/download/apk-latest/molkkyscore-debug.apk を
端末で開き、提供元不明のアプリの許可を出すとインストールできる。

動作確認用の APK は毎回ちがう鍵で署名されるため、上書きインストールはできない（PROGRESS.md の既知の問題）。

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

今の状況は [PROGRESS.md](PROGRESS.md)、これからのタスクは [TODO.md](TODO.md) を参照。
