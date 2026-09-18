/** 永続化データの識別子。衝突しない前提で扱う。 */
export const newId = (): string => crypto.randomUUID()
