import { type BinaryLike, randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const randomBytesAsync = promisify(randomBytes)
const scryptAsync = (password: BinaryLike, salt: BinaryLike, keylen: number, options: ScryptOptions): Promise<NonSharedBuffer> => {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, buff) => {
      if (err) {
        reject(err)
      } else {
        resolve(buff)
      }
    })
  })
}

const ALGORITHM = "scrypt"

// Values taken from: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
const N = 2 ** 17 // CPU/memory cost
const R = 8 // block size
const P = 1 // parallelization

const SALT_BYTES = 16
const KEY_BYTES = 32

// scrypt needs 128 * r * (N + p + 2) bytes (the N-block table plus a few working blocks).
// Node refuses to run above maxmem (32 MiB by default), so allow exactly that plus a 10 MiB margin.
// The same cap is used when verifying: a stored hash asking for more memory than today's
// parameters (a corrupted or tampered row) makes scrypt throw instead of allocating it.
const MAX_MEMORY = 128 * R * (N + P + 2) + 10 * 1024 * 1024

const PARAMS_REGEX = /^N=(\d+),r=(\d+),p=(\d+)$/
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

type StoredHash = {
  params: { N: number; r: number; p: number }
  salt: Buffer
  hash: Buffer
}

// Format: $algorithm$params$salt$hash, salt and hash in base64
// E.g:    $scrypt$N=131072,r=8,p=1$q8Z0c1Vt2bM9xkL4aP3fWg==$J3k9…
export const hashPassword = async (plain: string): Promise<string> => {
  const salt = await randomBytesAsync(SALT_BYTES)
  const hash = await scryptAsync(plain, salt, KEY_BYTES, { N, r: R, p: P, maxmem: MAX_MEMORY })
  return `$${ALGORITHM}$N=${N},r=${R},p=${P}$${salt.toString("base64")}$${hash.toString("base64")}`
}

// A wrong password returns false. A malformed stored value throws instead: it is not the user's
// mistake but broken data in auth_accounts, and it must reach the error handler and the logs
// rather than look like a failed login.
export const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
  const { params, salt, hash } = parseStoredHash(stored)
  // keylen comes from the stored hash, so hashes created with another key length still verify.
  // It also guarantees both buffers have the same length, which timingSafeEqual requires.
  const candidate = await scryptAsync(plain, salt, hash.length, { ...params, maxmem: MAX_MEMORY })
  return timingSafeEqual(candidate, hash)
}

const parseStoredHash = (stored: string): StoredHash => {
  // "$scrypt$params$salt$hash".split("$") -> ["", "scrypt", params, salt, hash]
  const parts = stored.split("$")
  if (parts.length !== 5 || parts[0] !== "") {
    throw new Error(`malformed password hash: expected 5 "$"-separated parts, got ${parts.length}`)
  }
  const [, algorithm, params, salt, hash] = parts

  if (algorithm !== ALGORITHM) {
    throw new Error(`malformed password hash: unsupported algorithm "${algorithm}"`)
  }

  const match = PARAMS_REGEX.exec(params)
  if (!match) {
    throw new Error(`malformed password hash: invalid params "${params}"`)
  }
  const [, n, r, p] = match.map(Number)

  if (!BASE64_REGEX.test(salt) || !BASE64_REGEX.test(hash)) {
    throw new Error("malformed password hash: salt and hash must be base64")
  }

  return {
    params: { N: n, r, p },
    salt: Buffer.from(salt, "base64"),
    hash: Buffer.from(hash, "base64"),
  }
}
