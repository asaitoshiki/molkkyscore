import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { MemberField } from '../components/MemberField'
import { OrderList } from '../components/OrderList'
import { RuleDetails, RulePresets } from '../components/RulesEditor'
import { CASUAL_PRESETS } from '../domain/formats'
import { Button, Fold, TextInput } from '../components/ui'
import { newId } from '../domain/id'
import { moveItem } from '../domain/order'
import { DEFAULT_RULES, clampHandicap } from '../domain/rules'
import type { Avatar as AvatarData } from '../domain/avatar'
import type { Entry } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

/** 登録メンバーならアバターを添える。その場で入れた名前は登録されるまでアバターがない */
const MemberAvatar = ({ avatar }: { avatar: AvatarData | undefined }) =>
  avatar === undefined ? null : <Avatar avatar={avatar} size={22} />

/** 公式のスコアシートが 4 チーム分までなので、それに合わせる */
const MAX_TEAMS = 4

/** 「チーム◯」のうち、まだ使っていない一番小さい番号の名前 */
const nextTeamName = (names: string[]) => {
  const number = Array.from({ length: names.length + 1 }, (_, index) => index + 1).find(
    (candidate) => !names.includes(`チーム${candidate}`),
  )!
  return `チーム${number}`
}

/**
 * 参加するチームを 1 画面で決める。
 * いつも使うチームと試合の形だけを見せ、メンバー・細かいルール・ハンデは開いたときだけ出す
 */
export const GameSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const memberNamed = useAppStore((state) => state.memberNamed)
  const createGame = useAppStore((state) => state.createGame)

  const [names, setNames] = useState(['チーム1', 'チーム2'])
  // 力の差を埋めるための持ち点。並びは names と対応する
  const [handicaps, setHandicaps] = useState([0, 0])
  // チームで投げるメンバーの名前。入れると試合中に次に投げる人が出る。並びは names と対応する
  const [rosters, setRosters] = useState<string[][]>([[], []])
  const [rules, setRules] = useState(DEFAULT_RULES)

  const add = () => {
    setNames([...names, nextTeamName(names)])
    setHandicaps([...handicaps, 0])
    setRosters([...rosters, []])
  }

  const remove = (index: number) => {
    setNames(names.filter((_, position) => position !== index))
    setHandicaps(handicaps.filter((_, position) => position !== index))
    setRosters(rosters.filter((_, position) => position !== index))
  }

  const players = members.filter((member) => member.listed)

  // メンバーを入れる・外す。同じ人は 1 チームにしか入れないので、ほかのチームからは外して移す
  const toggleMember = (index: number, member: string) => {
    const here = rosters[index].includes(member)
    setRosters(
      rosters.map((roster, position) => {
        const without = roster.filter((item) => item !== member)
        return position === index && !here ? [...without, member] : without
      }),
    )
  }

  const rename = (index: number, name: string) =>
    setNames(names.map((item, position) => (position === index ? name : item)))

  const start = () => {
    // 同じ名前のメンバーがいれば使い回し、いなければ登録する。
    // メンバーを入れていないチームは、チーム名を 1 人のメンバーとして記録する
    // メンバーとして入れた人はプレイヤーの一覧に出し、チーム名だけのときは出さない
    const memberIdsOf = (index: number) =>
      rosters[index].length > 0
        ? rosters[index].map((member) => memberNamed(member, true).id)
        : [memberNamed(names[index], false).id]
    const entries: Entry[] = names.map((name, index) => ({
      id: newId(),
      name,
      memberIds: memberIdsOf(index),
      handicap: handicaps[index],
    }))
    navigate(`/games/${createGame(entries, rules)}`, { replace: true })
  }

  const filled = names.every((name) => name.trim() !== '')
  const memberCount = rosters.flat().length

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title="新しい試合"
        left={
          <button onClick={() => navigate('/')} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      <section className="flex flex-1 flex-col px-5 pt-6 pb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-2xl">参加チーム</h1>
          <span className="tabular text-[12px] text-muted">
            {names.length} / {MAX_TEAMS}
          </span>
        </div>
        <p className="mt-1 mb-4 text-[12px] text-muted">上から順に投げます</p>

        <OrderList
          items={names}
          onMove={(from, to) => {
            // 名前・ハンデ・メンバーは同じ位置で対応しているので、そろえて動かす
            setNames(moveItem(names, from, to))
            setHandicaps(moveItem(handicaps, from, to))
            setRosters(moveItem(rosters, from, to))
          }}
          renderItem={(name, index) => (
            <>
              <input
                aria-label={`${index + 1} 番目に投げるチームの名前`}
                className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-[15px] outline-none placeholder:text-faint focus:border-accent focus-visible:outline-none"
                placeholder="チーム名"
                value={name}
                onChange={(event) => rename(index, event.target.value)}
              />
              {names.length > 1 && (
                <button
                  aria-label={`${name} を外す`}
                  className="shrink-0 p-1 text-faint"
                  onClick={() => remove(index)}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </>
          )}
        />

        <button
          className="mt-3 flex items-center gap-2 self-start py-1 text-[14px] text-accent disabled:opacity-35"
          disabled={names.length >= MAX_TEAMS}
          onClick={add}
        >
          <Icon name="plus" size={16} />
          チームを追加
        </button>

        <section className="mt-7">
          <h2 className="eyebrow mb-3 text-muted">試合の形</h2>
          <RulePresets rules={rules} presets={CASUAL_PRESETS} onChange={setRules} />
        </section>

        <section className="mt-7 space-y-2.5">
          <h2 className="eyebrow text-muted">必要なときだけ</h2>
          {/* 大人数のチームでも次に投げる人が分かるよう、メンバーを入れられる。入れなくても始められる */}
          <Fold label="メンバーを入れる" hint={memberCount === 0 ? 'なし' : `${memberCount}人`}>
            <p className="text-[12px] text-muted">
              入れた順に交代で投げ、次に投げる人が画面に出ます。成績はメンバーのページにたまります。
            </p>
            <div className="mt-3 space-y-5">
              {names.map((name, index) => (
                <div key={index}>
                  <p className="text-[14px] font-bold">{name}</p>
                  {rosters[index].length > 0 && (
                    <ol className="mt-1.5 flex flex-wrap gap-1.5">
                      {rosters[index].map((member, position) => (
                        <li key={member}>
                          <button
                            aria-label={`${member} を外す`}
                            className="flex items-center gap-1.5 rounded-full border-2 border-accent bg-accent-soft py-1 pr-3 pl-1 text-[12px]"
                            onClick={() => toggleMember(index, member)}
                          >
                            <span className="tabular w-4 text-center text-faint">
                              {position + 1}
                            </span>
                            <MemberAvatar
                              avatar={players.find((player) => player.name === member)?.avatar}
                            />
                            {member}
                            <span className="text-faint">
                              <Icon name="close" size={12} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {/* 登録メンバーは押すだけで入る。ほかのチームに入っている人を押すと、こちらへ移る */}
                  {players.some((player) => !rosters[index].includes(player.name)) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {players
                        .filter((player) => !rosters[index].includes(player.name))
                        .map((player) => (
                          <button
                            key={player.id}
                            className={`flex items-center gap-1.5 rounded-full border-2 border-rule bg-surface py-1 pr-3 pl-1 text-[12px] ${
                              rosters.some((roster) => roster.includes(player.name))
                                ? 'opacity-40'
                                : ''
                            }`}
                            onClick={() => toggleMember(index, player.name)}
                          >
                            <Avatar avatar={player.avatar} size={22} />
                            {player.name}
                          </button>
                        ))}
                    </div>
                  )}
                  <MemberField onAdd={(member) => toggleMember(index, member)} />
                </div>
              ))}
            </div>
          </Fold>

          <RuleDetails rules={rules} onChange={setRules} />

          <Fold label="ハンデ" hint={handicaps.some((value) => value > 0) ? 'あり' : 'なし'}>
            <p className="text-[12px] text-muted">力の差があるときは、持ち点から始められます。</p>
            <div className="mt-3 space-y-2">
              {names.map((name, index) => (
                <label key={index} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0 truncate">{name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <TextInput
                      type="number"
                      min={0}
                      max={rules.targetScore - 1}
                      className="tabular w-16 text-right"
                      value={handicaps[index]}
                      onChange={(event) =>
                        setHandicaps(
                          handicaps.map((value, position) =>
                            position === index ? clampHandicap(event.target.value, rules) : value,
                          ),
                        )
                      }
                    />
                    <span className="text-[12px] whitespace-nowrap text-muted">点から</span>
                  </span>
                </label>
              ))}
            </div>
          </Fold>
        </section>

        {/* 開始ボタンは親指の届く下端に寄せる。内容が多くても間は空ける */}
        <div className="min-h-8 flex-1" />
        <Button className="w-full py-3.5" disabled={!filled} onClick={start}>
          試合を始める
        </Button>
      </section>
    </div>
  )
}
