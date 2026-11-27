# CLAUDE.md — Claude Code 向けの指示

共通のルールは `AGENTS.md` にあります。必ず先に読み、それに従ってください。

@AGENTS.md

## Claude Code での補足

- 作業の最初に `README.md`、`PROGRESS.md`、`TODO.md`、`DECISIONS.md` を読む
- 作業用ブランチで作業し、終わったら Pull Request を作る（`main` へ直接 push しない）
- 利用者への返事は日本語で、専門用語を避けて短く書く
- 利用者が「APK くれ」と言ったときだけ、GitHub Actions の「Android APK」を実行する。
  できた APK はリリース `apk-latest`（`https://github.com/asaitoshiki/molkkyscore/releases/download/apk-latest/molkkyscore-debug.apk`）から取れる
- クラウドの実行環境では `dl.google.com` に出られないため、Android をローカルでビルドして確かめることはできない（未確認の点として報告する）
- 頼まれていない別のチャットの内容を持ち出さない
