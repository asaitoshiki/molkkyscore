/** 並びの from 番目を to 番目へ移した新しい配列を返す。元の配列は変えない */
export const moveItem = <T>(list: T[], from: number, to: number): T[] => {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
