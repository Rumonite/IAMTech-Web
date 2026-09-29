// Business details shown across the site. Services, hours, and address are still placeholders.

// Phone takes SMS and WhatsApp (not calls). WhatsApp needs the international form: PH +63, leading 0 dropped.
export const CONTACT = {
  phone: '0965 553 3389',
  sms: 'sms:09655533389',
  whatsapp: 'https://wa.me/639655533389',
  email: 'ampolconcepcion88@gmail.com',
  address: '123 Main Street, Your City',
}

export const SERVICES = [
  { title: 'Screen replacement', text: 'Cracked or unresponsive phone and laptop screens.' },
  { title: 'Battery replacement', text: 'Restore all-day battery life on phones and laptops.' },
  { title: 'Charging port repair', text: 'Loose, dirty, or dead charging ports fixed.' },
  { title: 'Water damage', text: 'Cleaning and board-level recovery after spills.' },
  { title: 'Keyboard & trackpad', text: 'Sticky keys, dead keys, and trackpad faults.' },
  { title: 'Software & data', text: 'OS reinstalls, virus removal, and data recovery.' },
]

// Where customers send the downpayment. Placeholder: confirm the number and account name with the client.
export const GCASH = { number: '0965 553 3389', name: 'IAMTech' }

// Share of the quote paid up front. Display only: the database computes the real amount
// (`downpayment` column in supabase/schema.sql), so change both together.
export const DOWNPAYMENT_RATE = 0.2

export const DEVICES = ['Phone', 'Laptop', 'Tablet', 'Other']

// Opening hours per weekday (0 = Sunday), as [open, close] in whole hours; null = closed.
export const HOURS: (readonly [number, number] | null)[] = [
  null,
  [10, 18],
  [10, 18],
  [10, 18],
  [10, 18],
  [10, 18],
  [10, 16],
]

export const SLOT_MINUTES = 60

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const HOURS_TEXT = DAY_NAMES.map((day, i) => {
  const h = HOURS[i]
  return { day, text: h ? `${h[0]}:00 – ${h[1]}:00` : 'Closed' }
})

// ponytail: slots use the visitor's browser timezone, so remote visitors in other zones see shifted times.
// Pass an explicit business timezone here if that becomes a problem.
/** Bookable slot start times for a `YYYY-MM-DD` day, excluding any not after `now`. */
export function slotsFor(day: string, now = new Date()): Date[] {
  const [y, m, d] = day.split('-').map(Number)
  const hours = HOURS[new Date(y, m - 1, d).getDay()]
  if (!hours) return []
  const slots: Date[] = []
  for (let min = hours[0] * 60; min + SLOT_MINUTES <= hours[1] * 60; min += SLOT_MINUTES) {
    const slot = new Date(y, m - 1, d, 0, min)
    if (slot > now) slots.push(slot)
  }
  return slots
}
