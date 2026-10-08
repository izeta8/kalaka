import type { Pool, PoolClient } from "pg"
import { pool } from "./database.ts"

type RawRow = Record<string, unknown>

export async function query<T>(text: string, values?: unknown[], db: Pool | PoolClient = pool): Promise<T[]> {
  const queryConfig = { text, values }
  const dbResponse = await db.query<RawRow>(queryConfig)
  return castObjectToCamelCase(dbResponse.rows) as T[]
}

const fromSnakeToCamelCase = (text: string): string => {
  return text.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// Shallow on purpose: pg rows are flat. Values (Date, jsonb…) are left untouched.
const castObjectToCamelCase = (arr: Array<RawRow>) => {
  return arr.map((originalObj) => {
    const returnObject: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(originalObj)) {
      const camelCaseKey = fromSnakeToCamelCase(key)
      returnObject[camelCaseKey] = value
    }
    return returnObject
  })
}

type TransactionCallback<T> = (client: PoolClient) => Promise<T>

// https://node-postgres.com/features/transactions
export async function withTransaction<T>(handleTransaction: TransactionCallback<T>): Promise<T> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    const response = await handleTransaction(client)
    await client.query("COMMIT")
    return response
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }
}
