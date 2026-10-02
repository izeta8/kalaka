// localStorage can throw (private mode, blocked site data) or be missing.
// Every access goes through these helpers so a failure only loses the preference.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // The preference is not remembered, but the app keeps working.
  }
}
