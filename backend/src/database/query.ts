import { pool } from "./database.ts"

export async function query<T>(text: string, values?: unknown[]): Promise<T[]> {
  const queryConfig = { text, values }
  const dbResponse = await pool.query(queryConfig)
  return castObjectToCamelCase(dbResponse.rows) as T[]
}

const fromSnakeToCamelCase = (text: string): string => {
  return text.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// Shallow on purpose: pg rows are flat. Values (Date, jsonb…) are left untouched.
const castObjectToCamelCase = (arr: Array<Record<string, unknown>>) => {
  return arr.map((originalObj) => {
    const returnObject: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(originalObj)) {
      const camelCaseKey = fromSnakeToCamelCase(key)
      returnObject[camelCaseKey] = value
    }
    return returnObject
  })
}
