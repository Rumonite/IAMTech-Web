// Fallbacks for browsers that block newer APIs: plain-http pages (testing from a phone on the LAN)
// and some in-app browsers (Messenger, Facebook) opened from a shared link.

type RandomSource = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string }

/** Random v4 UUID. crypto.randomUUID needs HTTPS; getRandomValues works everywhere. */
export function uuid(c: RandomSource = crypto): string {
  if (c.randomUUID) return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Copies text, falling back to a selected textarea where the Clipboard API is missing or blocked. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    t.readOnly = true
    t.style.cssText = 'position:fixed;top:0;opacity:0'
    // An open modal makes the rest of the page inert, so the textarea must go inside it.
    ;(document.querySelector('dialog[open]') ?? document.body).append(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    if (!ok) throw new Error('Copy blocked')
  }
}
