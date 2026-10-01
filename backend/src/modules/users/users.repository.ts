import * as database from "../../shared/database/query.ts"
import type { UserRow } from "./users.types.ts"

export const findUserById = async (id: number): Promise<UserRow[]> => {
  const queryString = `
        SELECT *
        FROM users
        WHERE id = $1`

  return await database.query<UserRow>(queryString, [id])
}
