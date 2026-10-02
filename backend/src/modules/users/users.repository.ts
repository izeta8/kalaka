import * as database from "../../shared/database/query.ts"
import type { UserRow } from "./users.types.ts"

export const findUserById = async (id: number): Promise<UserRow | null> => {
  const queryString = `
        SELECT *
        FROM users
        WHERE id = $1`

  const users = await database.query<UserRow>(queryString, [id])
  return users.length > 0 ? users[0] : null
}
