// ── Auth Token — Web Crypto API (compatible with Edge + Node) ─────────────────
// Uses the global `crypto.subtle` so it works in both Next.js middleware
// (Edge Runtime) and API route handlers (Node.js Runtime).

const encoder = new TextEncoder()

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function uint8ToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

// Generate a signed session token: "timestamp:nonce:hmac"
export async function makeToken(secret: string): Promise<string> {
  const ts    = Date.now().toString(36)
  const nonce = uint8ToHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const payload = `${ts}:${nonce}`
  const key     = await importKey(secret)
  const sig     = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${payload}:${uint8ToHex(sig)}`
}

// Verify the token signature — returns false if tampered or malformed
export async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const lastColon = token.lastIndexOf(':')
    if (lastColon < 0) return false
    const payload = token.slice(0, lastColon)
    const sig     = token.slice(lastColon + 1)
    const key     = await importKey(secret)
    return await crypto.subtle.verify(
      'HMAC',
      key,
      hexToUint8(sig),
      encoder.encode(payload),
    )
  } catch {
    return false
  }
}
