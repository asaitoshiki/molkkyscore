# モルメモ　アプリの説明（Unity のモルックゲーム向け）

モルメモは、モルック（フィンランド発祥の、木の棒でスキットルを倒す競技）の
**スコアを記録し、戦績を残し、大会を運営する**アプリです。
この文書は、Unity で作るモルックゲームと見た目・ルール・データをそろえるための説明です。

- Web 版：https://asaitoshiki.github.io/molkkyscore/
- Android 版：同じ中身を Capacitor でアプリにしたもの（Play ストア準備中）
- ソース：https://github.com/asaitoshiki/molkkyscore （React + TypeScript）

---

## 1. どういうアプリか

| 項目 | 内容 |
|---|---|
| 名前 | モルメモ（ストア表記「モルメモ｜モルックのスコア記録」） |
| 使う場面 | 実際にモルックをしながら、スマホで 1 投ずつ記録する |
| ひとこと | スコアと戦績を、その場で残す。 |
| 記録の保存 | 端末の中だけ（アカウント不要）。観戦・大会の機能を使うときだけネットに送る |
| 収益 | 広告（アプリ版は AdMob、Web 版は楽天の紹介リンク）と、480 円の広告除去 |

### 画面と機能

| タブ・画面 | できること |
|---|---|
| 試合（ホーム） | 新しい試合を始める。進行中・最近の試合 |
| 新しい試合 | チーム（2〜4）を並べる、試合の形を選ぶ、チームのメンバー（投げる人）を入れる、ハンデ |
| 試合画面 | 倒したスキットルの番号を押して「決定」。1 つ戻る、チーム名の変更、投球の履歴、効果音、観戦 QR（アプリ版） |
| 結果画面 | ゲームの勝者・試合（セット）の勝敗・各ゲームの点、スコアシートの画像保存、次のゲームへ |
| 大会 | この端末だけで記録する総当たり／トーナメント、と「本部で運営する大会」 |
| 本部で運営する大会 | 予選リーグ → 決勝トーナメントなどのステージ、ブロック分け、順位、7m 投での同点決め、敗者復活。各コートの選手が自分のスマホで記録し、本部に提出・承認 |
| 戦績 | メンバーごとの勝率・命中率・平均得点・よく倒すスキットル |
| メンバー | よく遊ぶ人の登録。アバター（色と 1〜2 文字）、プレイヤーごとの成績 |
| ルール | 公式ルールの説明 |
| 的当て練習 | 狙ったスキットルに当たったかを記録 |
| ホーム画面ウィジェット（Android） | スキットルの形の「今すぐ PLAY」ボタン |

---

## 2. ルール（アプリでの計算のしかた）

ゲームの状態は**保存せず、投球の記録を最初から順に再生して毎回求める**作りです。
「1 つ戻る」は最後の投球を消すだけで済みます。Unity 側でも同じ考え方にすると、記録の受け渡しが簡単です。

### スキットルの初期配置（手前の列から）

```
      7   9   8
    5  11  12   6
      3  10   4
        1   2      ← 投げる側（モルッカーリ）に近い
```

### 1 投の得点

- 1 本だけ倒した → **その番号**が得点
- 2 本以上倒した → **倒した本数**が得点
- 1 本も倒れなかった → **ミス**（0 点）

### 勝ち・超過・失格

- 目標点（初期 **50 点**）に**ちょうど**届いたチームの勝ち
- 超えたら**罰則点（初期 25 点）に戻る**
- **3 回連続ミスで失格**（1 本でも倒すと連続ミスは 0 に戻る）。失格したチームはそのゲーム 0 点
- 失格で 1 チームだけ残ったら、そのチームの勝ち（公式スコアシートに合わせ 50 点扱い）
- 投げる順番は失格したチームを飛ばして回る

### 打ち切り

- **ターン制限**（例：15 ターン）：全チームが決めた回数を投げ終えたら、点数がいちばん高いチームの勝ち。並んだら引き分け
- **制限時間**：時間が来たら、そのラウンドを**全チームが同じ回数だけ投げ終えたところ**で終わり、点数で勝敗を決める。最後のラウンドで 50 点に届けばふつうに勝ち

### 試合（セット）の形

| 形 | 決め方 |
|---|---|
| 自由 | ゲーム数を決めず、続けたいだけ続ける |
| 1 ゲーム | 1 ゲームで決める |
| 2 ゲーム（公式） | 2 ゲーム行い、勝ったゲーム数 → 引き分け数 → 合計点 |
| 2 ゲーム先取 | 先に 2 ゲーム取ったチームの勝ち。決まるまで何ゲームでも続ける |
| 100 点ゲーム | 50 点ゲームを 2 回行い、合計点だけで決める |

- 次のゲームの投げる順：前のゲームの逆順（初期）／同じ／点の低いチームから
- 「最終ゲームはゲームを取ったチームだけ」：先取なら、あと 1 ゲームで勝ちのチームが 2 つ以上そろったら、そのチームだけで次のゲームを行う
- 首位が並んだら**モルックアウト**（PK 戦のようなもの）の勝者をアプリで選ぶ
- **ハンデ**：チームごとに持ち点から始められる

### ポイント制（大会用）

1 ゲームごとに順位でポイントを配り、合計で順位を決めます。初期値：

| 結果 | ポイント |
|---|---|
| 50 点ちょうどで上がって 1 位 | 10P |
| ターン制限・時間切れで 1 位 | 8P |
| 2 位 | 6P |
| 3 位 | 2P |
| 4 位以下 | 0P |

同じ点数のチームは同じ順位・同じポイントです。

---

## 3. データの形

端末の保存場所は Web の localStorage（キー `molkky-note-v1`）で、JSON です。
主な型は次のとおりです（TypeScript の定義をそのまま載せます。`string | null` は null のことがある値）。

```ts
/** 投げる人 */
type Member = {
  id: string
  name: string
  createdAt: number            // ミリ秒の時刻
  avatar: { color: string; mark: string }  // 例 { color: '#1d5240', mark: '山' }
  listed: boolean              // メンバー一覧に出すか（チーム名で記録しただけなら false）
}

/** 試合に出るチーム（個人戦なら 1 人のチーム） */
type Entry = {
  id: string
  name: string                 // チーム名
  memberIds: string[]          // 投げる人。この順に交代で投げる
  handicap: number             // 持ち点
}

/** 1 投 */
type ThrowRecord = {
  entryId: string              // どのチームの投球か
  memberId: string             // 投げた人
  pins: number[]               // 倒したスキットルの番号。[] はミス
  at: number                   // 時刻
}

type GameRules = {
  targetScore: number          // 50
  penaltyScore: number         // 25
  maxMisses: number            // 3
  gameCount: number | null     // 試合のゲーム数（先取なら先取数）。null は自由
  decideBy: 'wins' | 'total' | 'race'  // 勝ち数 / 合計点 / 先取
  nextOrder: 'reverse' | 'same' | 'loserFirst'
  timeLimitMinutes: number | null
  maxTurns: number | null
  finalAmongWinners: boolean
}

/** 1 ゲーム。同じ seriesId のゲームが 1 つの試合（セット） */
type Game = {
  id: string
  createdAt: number
  finishedAt: number | null
  rules: GameRules
  entries: Entry[]             // 並び順が投げる順
  throws: ThrowRecord[]
  seriesId: string
  gameNumber: number           // 試合の中で何ゲーム目か（1 から）
  timeUpAt: number | null      // 時間切れにした時刻
  shootoutWinnerId: string | null
  tournamentId: string | null
  matchId: string | null
}
```

### 1 ゲームの例

```json
{
  "id": "g1",
  "createdAt": 1761900000000,
  "finishedAt": 1761900600000,
  "rules": {
    "targetScore": 50, "penaltyScore": 25, "maxMisses": 3,
    "gameCount": 2, "decideBy": "wins", "nextOrder": "reverse",
    "timeLimitMinutes": null, "maxTurns": null, "finalAmongWinners": false
  },
  "entries": [
    { "id": "e1", "name": "チーム1", "memberIds": ["m1", "m2"], "handicap": 0 },
    { "id": "e2", "name": "チーム2", "memberIds": ["m3"], "handicap": 0 }
  ],
  "throws": [
    { "entryId": "e1", "memberId": "m1", "pins": [12], "at": 1761900010000 },
    { "entryId": "e2", "memberId": "m3", "pins": [], "at": 1761900030000 },
    { "entryId": "e1", "memberId": "m2", "pins": [1, 5, 9], "at": 1761900050000 }
  ],
  "seriesId": "s1",
  "gameNumber": 1,
  "timeUpAt": null,
  "shootoutWinnerId": null,
  "tournamentId": null,
  "matchId": null
}
```

上の例では、チーム1 は 12 点 → 3 本倒して +3 で 15 点、チーム2 は 1 回ミスです。

### プレイヤーの成績（記録から計算している値）

| 値 | 求め方 |
|---|---|
| 勝率 | 勝ったゲーム数 ÷ 出たゲーム数 |
| 命中率 | 1 本以上倒した投球 ÷ 全投球 |
| 平均得点 | 得点の合計 ÷ 全投球 |
| 上がり | 自分の投球で目標点ちょうどにしてゲームを決めた回数 |
| よく倒すスキットル | 番号ごとに倒した回数（1〜12） |
| 1 本倒し・複数本・50 点超過 | 回数 |

---

## 4. 見た目

紙のスコアシートのような明るい地に、深緑を一点だけ差す落ち着いた作りです。影と角丸は最小限で、区切りは罫線と余白で表します。

| 名前 | 色 | 使いどころ |
|---|---|---|
| paper | `#f3f4f1` | 画面の地 |
| surface | `#fbfbfa` | カード・入力欄 |
| ink | `#15191a` | 本文 |
| muted | `#6b7370` | 補足の文字 |
| faint | `#9aa19c` | さらに弱い文字 |
| rule | `#dcdfd8` | 罫線 |
| accent | `#1d5240` | 深緑。決定ボタン・選択中・勝者 |
| accent-soft | `#e4eae5` | 深緑の薄い面 |
| alert | `#9c4a32` | ミス・超過・失格・時間切れ |

- 書体：本文は IBM Plex Sans（日本語はヒラギノ角ゴ／Noto Sans JP）、数字と見出しは IBM Plex Serif（日本語はヒラギノ明朝）
- 数字は等幅（tabular-nums）で縦にそろえる
- アバターの色（10 色）：`#1f5f4a` `#2d6a8e` `#8e3b46` `#b0601f` `#6b5b95` `#3d7d3a` `#7a6a4f` `#b14f78` `#3f4a55` `#2f8484`。丸の中に白で 1〜2 文字
- 絵文字は使わず、細線（線幅 1.5）のアイコンでそろえる
- 効果音は Web Audio で合成（スキットルの「カコン」、ミス、超過、失格、勝利、戻す）

---

## 5. ネットを使う機能（Firebase Realtime Database）

| 機能 | 置き場所 | 中身 |
|---|---|---|
| 観戦 | `watch/{共有キー}` | 試合（セット）のゲーム一覧とメンバー名を JSON 文字列で。12 時間で期限切れ |
| 本部で運営する大会 | `events/{大会ID}/meta` | 大会プラン（ステージ・ブロック・参加チーム）。本部の端末だけが書ける |
| 〃 | `events/{大会ID}/live/{端末}` | 試合中のコートの様子 |
| 〃 | `events/{大会ID}/submissions/{試合}` | 提出されたスコアシートと、本部の承認・差し戻し |

匿名ログインで端末を見分けています。

---

## 6. Unity のゲームと連携するなら（案）

パソコンで動く Unity ゲームと情報をやり取りする方法の候補です。

1. **JSON ファイルで渡す（いちばん手軽）**
   モルメモからメンバー・試合の記録を JSON で書き出し、ゲームで読み込む。
   形は上の「3. データの形」のとおり。C# で読むなら、`null` や配列の扱いが確実な Newtonsoft Json（`com.unity.nuget.newtonsoft-json`）がおすすめ。
2. **ネット経由（Firebase）**
   モルメモが送った情報をゲームが Firebase から読む。別の端末でも常に最新が手に入る。Unity からは REST（`https://…firebasedatabase.app/パス.json`）で読める。
3. **ゲームの結果をモルメモに戻す**
   ゲーム内の投球を上の `ThrowRecord` の形で書き出せば、モルメモの戦績にそのまま足せる。

使い道の例：
- メンバーの名前とアバターを、ゲームのキャラクター名・色に使う
- 命中率やよく倒すスキットルから、本人そっくりに狙う CPU を作る
- アプリと同じルール設定（目標点・ターン制限・先取など）でゲームを遊ぶ

> モルメモ側には、まだ JSON の書き出し機能はありません。どの方法にするか決まれば、モルメモに書き出し（または送信）を付けます。

### C# で読むときのクラスの例

```csharp
[System.Serializable]
public class ThrowRecord {
    public string entryId;
    public string memberId;
    public int[] pins;   // 空ならミス
    public long at;
}

[System.Serializable]
public class Entry {
    public string id;
    public string name;
    public string[] memberIds;
    public int handicap;
}

// 1 投の得点。1 本ならその番号、2 本以上なら本数、0 本はミス
public static int PointsOf(int[] pins) => pins.Length == 1 ? pins[0] : pins.Length;

// 目標点を超えたら罰則点に戻る
public static int Advance(int current, int points, int target = 50, int penalty = 25)
    => current + points > target ? penalty : current + points;
```

---

## 7. 用語

| 言葉 | 意味 |
|---|---|
| モルック | 投げる木の棒 |
| スキットル | 1〜12 の番号が書かれた倒す木のピン |
| モルッカーリ | 投げる位置を示す枠。踏んだり越えたりは反則 |
| ゲーム | 50 点を目指す 1 回の勝負（公式スコアシートの「セット」） |
| 試合（セット） | 同じ顔ぶれで続けて行うゲームのまとまり（2 ゲーム、2 ゲーム先取など） |
| 上がり | 目標点ちょうどに届いて勝つこと |
| 超過 | 目標点を超えて罰則点に戻ること |
| 失格 | 3 回連続ミス |
| モルックアウト | 同点のときの決着方法（PK 戦のようなもの） |
| 7m 投 | 大会で同点の順位を決めるときの投げ合い |
