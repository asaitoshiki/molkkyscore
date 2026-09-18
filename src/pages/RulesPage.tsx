import type { ReactNode } from 'react'
import { INITIAL_FORMATION } from '../domain/rules'

/** 見出しと本文の組。本文は段落か箇条書きで受け取る。 */
const Section = ({ label, title, children }: { label: string; title: string; children: ReactNode }) => (
  <section className="border-t border-rule pt-4">
    <p className="eyebrow text-muted">{label}</p>
    <h2 className="mt-1 mb-3 font-serif text-xl">{title}</h2>
    <div className="space-y-2.5 text-[14px] leading-relaxed">{children}</div>
  </section>
)

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-2.5">
        <span className="mt-2.5 h-px w-3 shrink-0 bg-accent" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

/** 用語の対訳。読み仮名と意味を並べる。 */
const Glossary = ({ terms }: { terms: [string, string][] }) => (
  <dl className="divide-y divide-rule border-y border-rule">
    {terms.map(([term, meaning]) => (
      <div key={term} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
        <dt className="text-[13px] text-accent">{term}</dt>
        <dd className="text-[13px] text-muted">{meaning}</dd>
      </div>
    ))}
  </dl>
)

export const RulesPage = () => (
  <div className="space-y-7">
    <header>
      <p className="eyebrow text-muted">RULES</p>
      <h1 className="mt-1 font-serif text-3xl leading-tight">モルックのルール</h1>
      <p className="mt-2 text-[13px] text-muted">
        フィンランド発祥の投擲競技。木の棒を下手投げで転がし、番号の書かれたスキットルを倒して
        ちょうど 50 点を目指す。
      </p>
    </header>

    <Section label="EQUIPMENT" title="用具と配置">
      <List
        items={[
          '投げる棒を「モルック」、的になる番号つきの木のピンを「スキットル」と呼ぶ。スキットルは 1 から 12 までの 12 本。',
          'スキットルは下の図の形に並べる。番号の面を投げる側に向けて立てる。',
          '投擲ラインを「モルッカーリ」と呼ぶ。スキットルの最前列からモルッカーリまでは 3.5m が公式の距離。',
        ]}
      />
      <Formation />
    </Section>

    <Section label="THROWING" title="投げ方">
      <p className="text-muted">
        制限されているのは「下から投げること」と「ラインを越えないこと」の 2 点だけ。
        持ち方も回転も足の位置も自由に選んでよい。
      </p>
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule">
        <div className="bg-surface p-3">
          <p className="eyebrow text-accent">できる</p>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {[
              '下手投げ（アンダースロー）',
              'モルックを横に持つ',
              'モルックを縦に持つ（縦投げ）',
              '縦回転・横回転をかける',
              '逆手で握る（裏投げ）',
              'バックスピンをかける',
              '地面を転がす（ラハティ投げ）',
              '右足前・左足前・両足そろえ',
              '素振りを何度してから投げる',
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-surface p-3">
          <p className="eyebrow text-alert">できない</p>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {[
              '上手投げ（オーバースロー）',
              '横手投げ（サイドスロー）',
              'モルッカーリを踏む',
              'モルッカーリを踏み越える',
              'モルッカーリに触れる',
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <List
        items={[
          'モルックが手を離れるまでに足がモルッカーリに触れる、踏む、踏み越えると反則になり、その投球は 0 点として扱われる。',
          '投げ終えたあと勢いでラインを越えてしまう動きも反則を取られることがある。投げたら踏みとどまる。',
          '狙いどころ、球速、弾道は自由。手前で一度バウンドさせても、転がしても構わない。',
        ]}
      />
    </Section>

    <Section label="SCORING" title="得点の数え方">
      <List
        items={[
          'スキットルが 1 本だけ倒れたら、そのスキットルに書かれた数字がそのまま得点になる。12 番を 1 本倒せば 12 点。',
          'スキットルが 2 本以上倒れたら、書かれた数字に関係なく、倒れた本数が得点になる。3 本倒せば 3 点。',
          '1 本も倒せなければ 0 点。',
          'モルックが直接当たっていなくても、倒れたスキットルはすべて数える。連鎖して倒れた分も得点になる。',
          '完全に倒れたものだけを数える。ほかのスキットルやモルックに寄りかかって立っているものは倒れたと見なさない。',
        ]}
      />
    </Section>

    <Section label="RESET" title="スキットルの立て直し">
      <List
        items={[
          '倒れたスキットルは、倒れたその場所で立て直す。元の位置には戻さない。',
          'そのため回を追うごとにスキットルは散らばり、狙うのが難しくなっていく。これがこの競技の核になる。',
          '転がって動いたスキットルは、止まった位置で立てる。',
          'モルックは投げた人が拾って次の人に渡す。',
        ]}
      />
    </Section>

    <Section label="WINNING" title="勝敗と失格">
      <List
        items={[
          'ちょうど 50 点に到達した人（チーム）の勝ち。',
          '50 点を超えた場合は 25 点に戻される。たとえば 45 点で 12 点を取ると 57 点ではなく 25 点になる。',
          '3 回続けて 0 点だと失格になり、その試合から抜ける。1 本でも倒せば連続ミスの数は 0 に戻る。',
          '失格が続いて残りが 1 人（1 チーム）になったら、その人の勝ちになる。',
          '仲間内では「失格ではなく 0 点に戻す」など緩めたルールで遊ぶこともある。大会では主催者の規定に従う。',
        ]}
      />
    </Section>

    <Section label="TEAM" title="チーム戦">
      <List
        items={[
          'チームの得点はメンバー全員の合計。チームとして 50 点ちょうどを目指す。',
          'チーム内では決めた順番で 1 人ずつ投げ、1 巡したらまた先頭に戻る。',
          '2 巡目以降の投球順を、前の巡で得点の低かった人から並べ替える大会もある。参加前に規定を確認する。',
        ]}
      />
    </Section>

    <Section label="GLOSSARY" title="用語">
      <Glossary
        terms={[
          ['モルック', '投げる木の棒。競技名でもある'],
          ['スキットル', '的になる番号つきの木のピン。12 本'],
          ['モルッカーリ', '投擲ライン。ここを越えると反則'],
          ['縦投げ', 'モルックを縦に持って投げる方法'],
          ['裏投げ', '逆手で握り、バックスピンをかけて投げる方法'],
          ['ラハティ投げ', '重心を低くして地面を転がすように投げる方法'],
        ]}
      />
    </Section>

    <p className="border-t border-rule pt-4 text-[11px] leading-relaxed text-faint">
      国際モルック協会および日本モルック協会の公開ルールにもとづく。
      大会ごとに細部が異なることがあるため、出場する際は主催者のレギュレーションを確認してください。
    </p>
  </div>
)

/** 公式の初期配置。奥の列から手前の列へ並べ、下に投擲ラインを引く。 */
const Formation = () => (
  <figure className="m-0 rounded border border-rule bg-surface px-4 py-5">
    <div className="space-y-2.5">
      {[...INITIAL_FORMATION].reverse().map((row, index) => (
        <div key={index} className="flex justify-center gap-2.5">
          {row.map((pin) => (
            <span
              key={pin}
              className="tabular flex h-8 w-8 items-center justify-center rounded-full border border-accent font-serif text-[13px] text-accent"
            >
              {pin}
            </span>
          ))}
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-accent" />
      <span className="eyebrow shrink-0 text-muted">MÖLKKAARI</span>
      <span className="h-px flex-1 bg-accent" />
    </div>
    <figcaption className="mt-2 text-center text-[11px] text-muted">
      最前列（1・2 番）から投擲ラインまで 3.5m
    </figcaption>
  </figure>
)
