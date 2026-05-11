const SECRET_KEY = process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-me'

async function getKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(SECRET_KEY)
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function makeToken(): Promise<string> {
  const key       = await getKey()
  const timestamp = Date.now().toString()
  const nonce     = crypto.randomUUID()
  const payload   = `${timestamp}:${nonce}`
  const sig       = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const hmac      = Buffer.from(sig).toString('base64url')
  return `${payload}:${hmac}`
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(':')
    if (parts.length < 3) return false
    const hmac    = parts.pop()!
    const payload = parts.join(':')
    const key     = await getKey()
    const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const expected = Buffer.from(sig).toString('base64url')

    // Timing-safe compare
    if (hmac.length !== expected.length) return false
    const a = new TextEncoder().encode(hmac)
    const b = new TextEncoder().encode(expected)
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
    return diff === 0
  } catch { return false }
}
