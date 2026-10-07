import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { hashPassword } from "../../modules/auth/password.ts"

const PASSWORD = "Gq)t9[gI05"

describe("hashPassword", () => {
  it("returns a string in the $scrypt$params$salt$hash format", async () => {
    const generatedHash = await hashPassword(PASSWORD)

    // "$scrypt$params$salt$hash".split("$") -> ["", "scrypt", params, salt, hash]
    const parts = generatedHash.split("$")

    // Validate the array length before accessing the elements.
    assert.equal(parts.length, 5, `expected 5 "$"-separated parts, got ${parts.length}`)
    const salt = Buffer.from(parts[3], "base64")
    const hash = Buffer.from(parts[4], "base64")

    assert.equal(parts[0], "", `the first element must be empty string (the hash must start with $)`)
    assert.equal(parts[1], "scrypt", `the second element must be 'scrypt'`)
    assert.equal(parts[2], "N=131072,r=8,p=1", `incorrect parameters`)
    assert.equal(salt.length, 16, `incorrect salt length`)
    assert.equal(hash.length, 32, `incorrect hash length`)
  })

  it("generates a different hash for the same password", async () => {
    const generatedHash1 = await hashPassword(PASSWORD)
    const generatedHash2 = await hashPassword(PASSWORD)
    assert.notEqual(generatedHash1, generatedHash2)
  })
})

describe("verifyPassword", () => {
  let hash: string

  before(async () => {
    hash = await hashPassword(PASSWORD)
  })

  it("returns true for the correct password", () => {})

  it("returns false for a wrong password", () => {})

  it("throws on a malformed stored hash", () => {})
})

// Si te sobra tiempo

// 6. it("rejects a stored hash that asks for more memory than allowed")

// Coge un hash válido y cámbiale N=131072 por N=1048576.
// Qué compruebas: que se rechaza, y que no devuelve false.
// Haz primero la prueba sin aserción sobre el error. Ejecútalo, mira qué error sale de verdad (no es uno de los tuyos) y después afírmalo. Responde en un comentario: ¿qué ataque evita maxmem?

// 7. it("verifies a hash created with other parameters")

// Construye a mano, dentro del test, un hash con otros parámetros (por ejemplo N=2¹⁴ y una clave de 64 bytes), con scryptSync de node:crypto y el mismo formato de texto. Así compruebas que verifyPassword lee los parámetros y la longitud del hash guardado, y no las constantes de hoy. Es lo que permitirá subir N en el futuro sin romper las contraseñas que ya existen.

// Hecho cuando: del 1 al 5 están en verde con node --test src/tests/unit/password.test.ts, y después npm test también pasa entero. Si te quedas 20 minutos con el mismo error, pégamelo.
