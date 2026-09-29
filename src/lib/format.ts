const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', trailingZeroDisplay: 'stripIfInteger' })
export const peso = (n: number) => PESO.format(n)

/** Short, readable reference for a booking, e.g. "3FA9C1", for phone calls and texts. */
export const ticketNo = (id: string) => id.slice(0, 6).toUpperCase()

// Narrow no-break space keeps "10:00 AM" on one line.
export const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '\u202f')
export const shortDay = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
export const longDay = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
export const dateTime = (d: Date) => d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
