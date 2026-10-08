import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { pool } from "../../shared/database/database.ts"
import { query, withTransaction } from "../../shared/database/query.ts"

// A table of its own, so these tests don't depend on the real schema.
// Dropped first so the file can be rerun without npm test's db reset: rows from a previous run would break the commit test.
// Each test uses its own values, so they don't see each other's rows.
before(async () => {
  await query("DROP TABLE IF EXISTS transaction_test")
  await query("CREATE TABLE transaction_test (value TEXT NOT NULL)")
})

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

const storedValues = async (prefix: string) => {
  const rows = await query<{ value: string }>("SELECT value FROM transaction_test WHERE value LIKE $1 ORDER BY value", [`${prefix}%`])
  return rows.map((r) => r.value)
}

// Clients currently checked out of the pool, i.e. not released.
const checkedOutClients = () => pool.totalCount - pool.idleCount

describe("withTransaction", () => {
  it("commits and returns the callback's value", async () => {
    const result = await withTransaction(async (client) => {
      await query("INSERT INTO transaction_test (value) VALUES ($1)", ["commit-a"], client)
      await query("INSERT INTO transaction_test (value) VALUES ($1)", ["commit-b"], client)
      return "done"
    })

    assert.equal(result, "done")
    assert.deepStrictEqual(await storedValues("commit-"), ["commit-a", "commit-b"])
  })

  it("rolls back every query when the callback throws", async () => {
    await assert.rejects(
      withTransaction(async (client) => {
        await query("INSERT INTO transaction_test (value) VALUES ($1)", ["rollback-a"], client)
        await query("INSERT INTO transaction_test (value) VALUES ($1)", ["rollback-b"], client)
        throw new Error("boom")
      }),
      // Only our error: if an INSERT failed instead, there would be no rows either and the test would pass for the wrong reason.
      /boom/,
    )

    assert.deepStrictEqual(await storedValues("rollback-"), [])
  })

  it("rethrows the callback's error", async () => {
    const error = new Error("boom")

    await assert.rejects(
      withTransaction(async () => {
        throw error
      }),
      // The very same object, not a wrapped or new error.
      (e) => e === error,
    )
  })

  it("releases the client even when the callback throws", async () => {
    await assert.rejects(
      withTransaction(async () => {
        throw new Error("boom")
      }),
    )

    assert.equal(checkedOutClients(), 0)
  })
})
