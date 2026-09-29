# Google Play ストアに出す手順

このリポジトリから Android アプリを配信するまでの手順をまとめた。
署名鍵の作成だけは、あなたの手元でやる必要がある（鍵を失うと、そのアプリは
二度と更新できなくなるため、開発者本人が保管する）。

---

## 0. 出す前に必ず差し替えるもの

テスト用のまま出すと、広告が表示されない、または審査に落ちる。

| 場所 | いまの値 | 差し替え先 |
| --- | --- | --- |
| `android/app/src/main/AndroidManifest.xml` の `com.google.android.gms.ads.APPLICATION_ID` | Google のテスト ID | AdMob で発行したアプリ ID |
| `src/ads/admob.ts` の `INTERSTITIAL_UNIT` | Google のテスト ID | AdMob で発行した広告ユニット ID |
| `src/ads/admob.ts` の `AdMob.initialize({ initializeForTesting: true })` | テスト扱い | `false`（または指定を外す） |

課金の商品 ID は `src/domain/billing.ts` の `AD_FREE_PRODUCT_ID`
（`molkkyscore.adfree`）。Play Console 側にも同じ ID で登録する。

---

## 1. Google Play デベロッパー アカウントを作る

1. <https://play.google.com/console> で登録する。
2. 登録料 **$25（買い切り、1 回のみ）** を支払う。
3. 本人確認（住所・身分証）を求められる。**数日かかることがある** ので、
   ここは早めに始めておくとよい。
4. 個人アカウントの場合、初回公開の前に
   **クローズドテストを 12 人以上・14 日間連続** で実施することが求められる。
   これが一番時間を食うので、先に人を集めておく。

---

## 2. 署名鍵（keystore）を作る

**この鍵は一度きり。失うと同じアプリとして更新を出せなくなる。**
リポジトリには絶対に入れない（`.gitignore` で弾いてある）。

手元の PC で、Java が入っている状態で：

```bash
keytool -genkeypair -v \
  -keystore molkkyscore-release.keystore \
  -alias molkkyscore \
  -keyalg RSA -keysize 2048 -validity 10000
```

聞かれるパスワードと、入力した氏名・組織名はメモして保管する。
作った `.keystore` ファイルは、クラウドストレージなど別の場所にも
バックアップしておく。

---

## 3. GitHub に鍵を登録する

ビルドは GitHub Actions で行うので、鍵を Secrets として預ける。

```bash
base64 -w 0 molkkyscore-release.keystore > keystore.base64.txt
```

（macOS は `base64 -i molkkyscore-release.keystore -o keystore.base64.txt`）

リポジトリの **Settings → Secrets and variables → Actions → New repository secret**
で 4 つ登録する。

| 名前 | 値 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `keystore.base64.txt` の中身 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore のパスワード |
| `ANDROID_KEY_ALIAS` | `molkkyscore` |
| `ANDROID_KEY_PASSWORD` | 鍵のパスワード（上と同じにしたならそれ） |

登録し終えたら `keystore.base64.txt` は消してよい。

---

## 4. AAB を作る

1. リポジトリの **Actions → Android Release → Run workflow**。
2. `version_name` に表示用の版（`1.0.0` など）、
   `version_code` に整数を入れる。
   **`version_code` は Play に出すたびに必ず増やす**（1 → 2 → 3）。
   同じ数字のものは受け付けられない。
3. 完了したら、実行結果の Artifacts から `app-release.aab` を落とす。

動作確認だけしたいときは **Android APK** のワークフロー。
こちらは署名なしの apk が出るので、端末に直接入れて試せる
（Play ストアには出せない）。

---

## 5. Play Console でアプリを登録する

1. **アプリを作成** → アプリ名（モルックノート）、言語、アプリ／ゲームの別、
   無料／有料（**無料**。広告除去はアプリ内課金なのでアプリ自体は無料）。
2. 左メニューの **ダッシュボード** に出るチェックリストを上から埋めていく。

### 用意しておくもの

| 項目 | 内容 |
| --- | --- |
| アプリアイコン | 512 × 512 PNG |
| フィーチャーグラフィック | 1024 × 500 PNG |
| スクリーンショット | スマホ用に最低 2 枚（推奨 4〜8 枚） |
| 簡単な説明 | 80 文字以内 |
| 詳しい説明 | 4000 文字以内 |
| プライバシーポリシー URL | `https://asaitoshiki.github.io/molkkyscore/#/privacy` |

スクリーンショットは Web 版（<https://asaitoshiki.github.io/molkkyscore/>）を
スマホのブラウザで開いて撮れば足りる。

### 申告が必要なもの

- **データ セーフティ**：記録は端末内にのみ保存。ただし **AdMob を使うため、
  広告 ID を収集する** の申告が要る。ここを空欄にすると差し戻される。
- **広告**：「このアプリには広告が含まれます」を **はい**。
- **コンテンツのレーティング**：アンケートに答えると自動で判定される。
- **ターゲット層**：13 歳以上にしておくと、子ども向けの追加要件を避けられる。

---

## 6. アプリ内課金（広告除去）を登録する

**収益化 → アプリ内アイテム → アプリ内商品** で新規作成。

- 商品 ID：`molkkyscore.adfree`（コードと必ず一致させる）
- 種類：**管理対象商品**（買い切り）
- 価格：¥480（`src/domain/billing.ts` の `AD_FREE_PRICE` と揃える）

商品を有効化しないと、アプリ側から購入できない。

---

## 7. テスト配信 → 公開

1. **テスト → 内部テスト** に AAB を上げ、自分の端末で購入と広告を確かめる。
   （課金はテスターとして登録した Google アカウントなら実際には課金されない）
2. **テスト → クローズドテスト** に切り替え、12 人以上を 14 日間走らせる
   （個人アカウントの場合）。
3. **製品版** に AAB を上げて審査へ。審査は数日〜1 週間ほど。

---

## 更新を出すとき

1. コードを直して `main` に push する（Web 版は自動で更新される）。
2. **Android Release** を、`version_code` を前回 +1 にして実行する。
3. 出てきた AAB を Play Console の製品版に上げる。

---

## 覚えておくこと

- 鍵を失う = そのアプリを更新できなくなる。バックアップは複数箇所に。
- `version_code` は増やす一方。下げたり同じ数字は使えない。
- テスト用の広告 ID のまま製品版に出すと、AdMob の規約違反になりうる。
