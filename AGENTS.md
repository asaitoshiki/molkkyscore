# AGENTS.md — すべての AI に共通する開発ルール

このファイルは、Claude Code・ChatGPT・Codex など、どの AI（と人）がこのリポジトリで作業しても
同じ進め方になるよう決めたルールです。AI 固有の補足は `CLAUDE.md` などに書き、
共通のルールはここだけに書きます。

## プロジェクトの要点（最初に読む）

- モルック（フィンランド発祥の投擲競技）のスコア記録・戦績管理アプリ「モルメモ」
- React + TypeScript + Vite の Web アプリ（PWA）を、Capacitor で Android アプリにもしている
- 記録は端末の localStorage に保存する。ネットを使うのは観戦（Firebase）とお知らせだけ
- 大会の運営機能は別リポジトリ [asaitoshiki/molmemo-taikai](https://github.com/asaitoshiki/molmemo-taikai) に分けた
- 詳しくは `README.md`、今の状況は `PROGRESS.md`、やることは `TODO.md`、決めたことは `DECISIONS.md`

## 作業の進め方

1. **作業を始める前に、最新の状態を確かめる**
   - `git fetch origin` → `git status` → `git log --oneline -10 origin/main`
   - 開いている Pull Request と、ほかの作業用ブランチを確かめる
2. **管理ドキュメントを読む**: `README.md`、`PROGRESS.md`、`TODO.md`、`DECISIONS.md`
3. **既存の仕様と設計方針を尊重する**。変えたいときは理由を `DECISIONS.md` に書いてから変える
4. **作業中の変更を勝手に上書きしない**
   - 自分が作っていない未コミットの変更・ブランチ・Pull Request は、消したり書き換えたりしない
   - 他人のブランチで rebase・amend・強制 push をしない
5. **作業用ブランチを使う**
   - `main` へ直接 push しない。強制 push（`--force`）もしない
   - ブランチ名は `<AI 名や作業者>/<内容>`（例：`claude/watch-input`、`codex/fix-timeline`、`chatgpt/docs`）
   - 終わったら `main` 向けの Pull Request を作り、レビューを受けてからマージする
   - `main` に入ったものはそのまま公開される（下の「公開」を参照）ので、マージ＝リリースと考える
6. **作業が終わったら、関連するテストを実行する**（下の「テストと確認」）
7. **管理ドキュメントを更新する**
   - 開発状況が変わったら `PROGRESS.md` と `TODO.md` を更新する
   - 重要な設計変更をしたら `DECISIONS.md` に、決めたこと・理由・採らなかった案を書く
8. **他の AI が追加説明なしで作業を再開できる状態を保つ**
   - 途中でやめるときは、どこまでやったか・次に何をするかを `PROGRESS.md` か Pull Request に書く
   - 確かめていないことは「未確認」と書く。推測で事実のように書かない

## 言語

- コミットメッセージ、管理ドキュメント、Pull Request の説明は原則日本語で書く
- コードのコメントも日本語。コードのまとまりの概要や、コードでは表せない背景を短く書く
- 画面の文言は日本語。利用者向けなので、専門用語を避けて短く書く

## コーディング規約

- **関連するコードを読んでから書く**。編集する所だけでなく、呼び出し元・依存先・似た実装も見る
- **攻撃的プログラミング**: 存在するはずの値には直接アクセスし（`!` を使ってよい）、防御的な存在チェックを足さない。
  おかしいときは早くクラッシュさせて原因を見つける。フレームワークが保証する値は確かめない
- **条件分岐はなるべく避ける**。フラグで制御するのは最後の手段。分岐が要るときは早期リターン／ガード節で浅くする。
  形ごとの違いは `Record<種類, 処理>` の対応表で書く（例：`src/domain/series.ts` の `COMPARE`・`SETTLED`）
- **試合の状態は保存しない**。得点・手番・失格などは投球記録（`throws`）から毎回導き出す（`src/domain/game.ts`）
- `src/domain/` は純粋関数だけにする。UI・ストア・通信に依存させない。ルールの計算を足したらテストも足す
- 書式: シングルクォート、セミコロンなし、インデント 2、1 行はおよそ 100 文字まで、末尾カンマあり
  - Prettier の設定ファイルは置いていない。**`npx prettier` を既定のまま実行しない**（ダブルクォートとセミコロンに書き換わる）
- スタイルは Tailwind v4。色・角丸・書体は `src/index.css` の `@theme` のトークンを使い、色を直書きしない
- 見た目の部品は `src/components/ui.tsx`（`Button`・`Fold`・`TextInput` など）を使い回す

## データの互換性（壊すと利用者の記録が消える）

- 端末の記録は zustand persist の `molkky-note-v1`（`src/store/useAppStore.ts`、いまの `version` は 9）
- 保存する形を変えるときは、`version` を上げて `migrate` に古い形からの変換を書く。古い項目を黙って捨てない
- 観戦の記録（Firebase の `watch/…`）は古い版のアプリからも届くので、項目を足すときは無い場合の既定値を決める

## テストと確認

```bash
npm ci              # 依存を入れる（Node 22）
npm run typecheck   # 型チェック（tsc -b）
npm run lint        # oxlint
npm test            # vitest（src/**/*.test.ts）
npm run build       # 本番ビルド（dist/）
```

- ルールの計算・データの変換を変えたら `src/domain/*.test.ts` にテストを足す
- 画面を変えたら、`npm run build && npm run preview` で開いて確かめる（スクリーンショットで見られるとよい）
- Firebase を使う機能（観戦・観戦者の入力）は、Firebase エミュレーターで確かめられる
  - `VITE_FIREBASE_EMULATOR=127.0.0.1 npm run build` でエミュレーターにつなぐ版ができる
  - エミュレーターは `npx firebase emulators:start --only database,auth --project demo-molkky`（firebase-tools が必要）
- Android の APK はローカルでは作らず、GitHub Actions の「Android APK」で作る。**APK のビルドは利用者に頼まれたときだけ行う**

## 公開（main に入ると自動で出る）

| 公開先 | 仕組み |
| --- | --- |
| https://molmemo.pages.dev/ （本番の Web 版） | Cloudflare Pages が `main` への push を受けてビルド |
| https://asaitoshiki.github.io/molkkyscore/ （旧 Web 版） | `.github/workflows/deploy.yml`。旧 URL の利用者の記録のため当面残す |
| 最新の APK | Actions「Android APK」を手動で実行 → リリース `apk-latest` に置かれる |
| ストア用 AAB | Actions「Android Release」。署名の鍵が GitHub Secrets に必要 |

- `public/news.json`（お知らせ）は `main` に入ると、アプリを作り直さずに全員に届く
- `database.rules.json` を変えたら、**Firebase コンソールで手で公開しないと本番に反映されない**。Pull Request にその旨を書く

## 機密情報

- API キー、認証情報、パスワード、署名の鍵（`*.keystore`・`*.jks`）、個人情報を GitHub に保存しない
- 署名の鍵とパスワードは GitHub の Secrets（`ANDROID_KEYSTORE_BASE64` など）に置く
- 次のものは秘密ではない（アプリに埋め込んで配る識別子）ので、リポジトリにあってよい
  - `src/sync/firebase.ts` の Firebase の Web 設定、`android/app/google-services.json`
  - 守りは `database.rules.json` のルールで行っている
- 利用者のメールアドレスなどをコードやドキュメントに書かない。必要なら利用者に確かめる

## してはいけないこと

- 頼まれていない機能追加や、大きなリファクタリング
- テストを消す・飛ばすことで通すこと
- `main` への直接 push、強制 push、他人のブランチの履歴の書き換え
- Android のビルドを頼まれていないのに実行すること
