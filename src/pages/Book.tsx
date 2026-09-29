import { useEffect, useState, type FormEvent } from 'react'
import Layout from '../components/Layout.tsx'
import { Confirm, Toast, type Ask, type ToastMsg } from '../components/ui.tsx'
import { copyText, uuid } from '../lib/browser.ts'
import { CONTACT, DEVICES, DOWNPAYMENT_RATE, GCASH, slotsFor } from '../lib/business.ts'
import { longDay, peso, ticketNo, time } from '../lib/format.ts'
import { supabase } from '../lib/supabase.ts'

const localDate = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD

const today = new Date()
const maxDay = new Date(today)
maxDay.setDate(maxDay.getDate() + 60)

const RATE = `${DOWNPAYMENT_RATE * 100}%`

// A radio drawn as a selectable tile; the real input covers it invisibly.
const OPTION =
  'relative cursor-pointer rounded-lg border border-line px-3 py-2.5 text-center font-medium text-silver hover:border-mist has-checked:border-volt has-checked:bg-volt has-checked:text-void has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-volt'
const OPTION_INPUT = 'absolute inset-0 cursor-pointer opacity-0'
const LEGEND = 'mb-2 text-sm font-semibold text-chrome'

type Booking = {
  slot_start: string
  device: string
  status: 'pending' | 'quoted' | 'confirmed' | 'declined' | 'cancelled' | 'done'
  price: number | null
  downpayment: number | null
  payment_ref: string | null
}

const TITLES: Record<Booking['status'], string> = {
  pending: "We're preparing your quote",
  quoted: 'Your quote is ready',
  confirmed: 'Your appointment is confirmed',
  declined: 'Quote declined',
  cancelled: 'Appointment cancelled',
  done: 'Repair complete',
}

// Progress shown on the ticket; declined and cancelled bookings leave the track.
const STEPS: Booking['status'][] = ['pending', 'quoted', 'confirmed', 'done']
const STEP_LABELS = ['Requested', 'Quoted', 'Confirmed', 'Repaired']

// /book/?id=<uuid> shows that booking's ticket; otherwise the booking form.
export default function Book() {
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('id'))
  const [justBooked, setJustBooked] = useState(false)

  return (
    <Layout>
      {id ? <Ticket id={id} justBooked={justBooked} /> : (
        <BookForm
          onBooked={(newId) => {
            history.replaceState(null, '', `?id=${newId}`)
            setJustBooked(true)
            setId(newId)
            scrollTo(0, 0)
          }}
        />
      )}
    </Layout>
  )
}

function BookForm({ onBooked }: { onBooked: (id: string) => void }) {
  const [day, setDay] = useState(localDate(today))
  const [taken, setTaken] = useState<number[] | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [ask, setAsk] = useState<Ask | null>(null)

  useEffect(() => {
    if (!day) return
    let live = true
    const [y, m, d] = day.split('-').map(Number)
    supabase
      .rpc('taken_slots', { from_ts: new Date(y, m - 1, d).toISOString(), to_ts: new Date(y, m - 1, d + 1).toISOString() })
      .then(({ data, error }) => {
        if (!live) return
        if (error) setError("Available times didn't load. Refresh the page to try again.")
        else setTaken((data as string[]).map((t) => new Date(t).getTime()))
      })
    return () => {
      live = false
    }
  }, [day, refresh])

  const free = taken ? slotsFor(day).filter((s) => !taken.includes(s.getTime())) : []

  async function book(f: Record<string, string>) {
    // Made here because anon can't read the row back; this id is the customer's ticket link.
    const id = uuid()
    const { error } = await supabase.from('appointments').insert({
      id,
      slot_start: f.slot,
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      device: f.device,
      issue: f.issue.trim(),
    })
    if (!error) return onBooked(id)
    if (error.code === '23505') {
      setError('Someone took that time a moment ago. Pick another time.')
      setTaken(null)
      setRefresh((n) => n + 1)
    } else {
      setError('The appointment didn\'t go through. Try again, or message us by SMS or WhatsApp.')
    }
  }

  // The form only reaches here once the browser's own validation passes; review before booking.
  function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const slot = new Date(f.slot)
    setAsk({
      title: 'Set this appointment?',
      body: (
        <>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-2 rounded-xl border border-line bg-void/60 p-4">
            <dt className="text-mist">When</dt>
            <dd className="text-chrome">{longDay(slot)} at {time(slot)}</dd>
            <dt className="text-mist">Device</dt>
            <dd className="text-chrome">{f.device}</dd>
            <dt className="text-mist">Name</dt>
            <dd className="text-chrome">{f.name}</dd>
            <dt className="text-mist">Phone</dt>
            <dd className="text-chrome">{f.phone}</dd>
          </dl>
          <p>Nothing to pay yet. We'll send you a price first, and you decide whether to go ahead.</p>
        </>
      ),
      confirmLabel: 'Set appointment',
      cancelLabel: 'Edit details',
      run: () => book(f),
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl font-bold italic sm:text-5xl">Set an appointment</h1>
      <p className="mt-3 text-lg">Tell us what's wrong and pick a time. You'll get a price before you pay anything.</p>

      <form className="panel mt-8 divide-y divide-line" onSubmit={review}>
        <div className="grid gap-4 p-5 sm:p-7">
          <h2 className="text-lg">Your details</h2>
          <label className="field">
            Name
            <input name="name" className="input" required maxLength={100} autoComplete="name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              Mobile number
              <input name="phone" type="tel" className="input" required minLength={5} maxLength={30} autoComplete="tel" placeholder="09XX XXX XXXX" />
            </label>
            <label className="field">
              Email
              <input name="email" type="email" className="input" required maxLength={200} autoComplete="email" />
            </label>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-7">
          <h2 className="text-lg">Your device</h2>
          <fieldset>
            <legend className={LEGEND}>Type</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DEVICES.map((d) => (
                <label key={d} className={OPTION}>
                  <input type="radio" name="device" value={d} required className={OPTION_INPUT} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            What's wrong?
            <textarea name="issue" className="input resize-y" required maxLength={2000} rows={4} placeholder="e.g. iPhone 13, cracked screen, touch still works" />
          </label>
        </div>

        <div className="grid gap-4 p-5 sm:p-7">
          <h2 className="text-lg">Pick a time</h2>
          <label className="field sm:max-w-xs">
            Date
            <input
              type="date"
              className="input"
              required
              value={day}
              min={localDate(today)}
              max={localDate(maxDay)}
              onChange={(e) => {
                setDay(e.target.value)
                setTaken(null)
              }}
            />
          </label>
          <fieldset key={day + refresh}>
            <legend className={LEGEND}>Time</legend>
            {!day ? <p className="text-mist">Pick a date first.</p>
              : !taken ? <p className="text-mist">Loading free times…</p>
              : free.length === 0 ? <p className="text-mist">No free times on this day. Try another date.</p>
              : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {free.map((s) => (
                    <label key={s.getTime()} className={`${OPTION} tabular-nums`}>
                      <input type="radio" name="slot" value={s.toISOString()} required className={OPTION_INPUT} />
                      {time(s)}
                    </label>
                  ))}
                </div>
              )}
          </fieldset>
        </div>

        <div className="grid gap-3 p-5 sm:p-7">
          {error && <p className="text-danger" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg w-full sm:w-auto sm:justify-self-start">Review appointment</button>
        </div>
      </form>
      {ask && <Confirm ask={ask} onClose={() => setAsk(null)} />}
    </div>
  )
}

function Ticket({ id, justBooked }: { id: string; justBooked: boolean }) {
  const [b, setB] = useState<Booking | null | undefined>(undefined)
  const [refresh, setRefresh] = useState(0)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)

  useEffect(() => {
    let live = true
    supabase.rpc('booking', { booking_id: id }).maybeSingle().then(({ data }) => {
      // A malformed id errors instead of returning no row; both mean "not found" to the customer.
      if (live) setB((data as Booking | null) ?? null)
    })
    return () => {
      live = false
    }
  }, [id, refresh])

  async function copy(text: string, done: string) {
    try {
      await copyText(text)
      setToast({ text: done })
    } catch {
      setToast({ text: "This browser blocked copying. Press and hold the text to copy it instead.", error: true })
    }
  }

  if (b === undefined) return <p className="mx-auto max-w-2xl text-mist">Loading your appointment…</p>
  if (!b) {
    return (
      <div className="panel mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold italic">Appointment not found</h1>
        <p className="mt-3">Check that you opened the whole link we sent you. Still stuck? Message {CONTACT.phone} by SMS or WhatsApp.</p>
      </div>
    )
  }

  const booking = b
  const when = new Date(b.slot_start)
  const step = STEPS.indexOf(b.status)

  function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const ref = String(new FormData(e.currentTarget).get('ref')).trim()
    setAsk({
      title: 'Submit this reference number?',
      body: (
        <p>
          Check that <strong className="text-chrome">{ref}</strong> matches the reference on your GCash receipt for{' '}
          <strong className="text-chrome">{peso(booking.downpayment ?? 0)}</strong>. We confirm your slot once it shows in our GCash.
        </p>
      ),
      confirmLabel: 'Submit reference',
      cancelLabel: 'Edit',
      run: async () => {
        const { data, error } = await supabase.rpc('submit_payment', { booking_id: id, method: 'gcash', ref })
        if (error || !data) return setToast({ text: "Your reference didn't go through. Check it and try again, or message us.", error: true })
        setToast({ text: "Reference submitted. We'll confirm your appointment once we've checked it." })
        setRefresh((n) => n + 1)
      },
    })
  }

  function decline() {
    setAsk({
      title: 'Decline this quote?',
      body: <p>We'll release your {longDay(when)}, {time(when)} slot and close this appointment. You can set a new one any time.</p>,
      confirmLabel: 'Decline quote',
      cancelLabel: 'Keep quote',
      danger: true,
      run: async () => {
        const { data, error } = await supabase.rpc('decline_quote', { booking_id: id })
        if (error || !data) return setToast({ text: "The quote couldn't be declined. Refresh the page, or message us.", error: true })
        setToast({ text: 'Quote declined. Your slot has been released.' })
        setRefresh((n) => n + 1)
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      {justBooked && (
        <div role="status" className="mb-6 rounded-xl border border-done/40 bg-done/10 px-5 py-4">
          <p className="font-semibold text-chrome">Appointment request sent</p>
          <p className="mt-1">This page is your repair ticket. Your quote will appear here, and we'll text you when it's ready.</p>
        </div>
      )}

      <article className="panel overflow-hidden">
        {/* Dashed tear line with notches, like a paper claim ticket. */}
        <header className="relative border-b border-dashed border-line p-5 before:absolute before:-bottom-3 before:-left-3 before:size-6 before:rounded-full before:border before:border-line before:bg-void after:absolute after:-right-3 after:-bottom-3 after:size-6 after:rounded-full after:border after:border-line after:bg-void sm:p-7">
          <p className="font-display text-mist">
            Repair ticket <span className="font-semibold text-chrome">#{ticketNo(id)}</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold italic sm:text-4xl">{TITLES[b.status]}</h1>
          <p className="mt-2">
            {b.device} repair, {longDay(when)} at {time(when)}
          </p>
        </header>

        {step >= 0 && <Trace step={step} />}

        <div className="grid gap-6 p-5 sm:p-7">
          {b.status === 'pending' && (
            <p>We're looking at your request and will post a price here. There's nothing to pay until you accept it.</p>
          )}

          {b.price !== null && b.downpayment !== null && <Summary price={b.price} downpayment={b.downpayment} />}

          {b.status === 'quoted' && b.downpayment !== null && (
            <>
              <section className="rounded-xl border border-line bg-void/60 p-4 sm:p-5">
                <h2 className="text-lg">Pay the downpayment by GCash</h2>
                <ol className="mt-3 list-decimal space-y-3 pl-5 marker:text-mist">
                  <li>
                    Send <strong className="text-chrome">{peso(b.downpayment)}</strong> to this GCash account:
                    {/* A real button, since on a phone the number gets copied into the GCash app. */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel py-2.5 pr-2.5 pl-4">
                      <div>
                        <p className="font-display text-xl font-semibold whitespace-nowrap text-chrome tabular-nums">{GCASH.number}</p>
                        <p className="text-sm text-mist">{GCASH.name}</p>
                      </div>
                      <button type="button" className="btn btn-ghost shrink-0" onClick={() => copy(GCASH.number.replace(/\s/g, ''), 'GCash number copied')}>
                        Copy number
                      </button>
                    </div>
                  </li>
                  <li>Enter the reference number from your GCash receipt below.</li>
                </ol>
                {b.payment_ref && (
                  <p className="mt-4 rounded-lg border border-quoted/40 bg-quoted/10 px-4 py-3">
                    We got reference <strong className="text-chrome">{b.payment_ref}</strong> and will confirm your appointment once we've checked it.
                    Typed it wrong? Submit the right one below.
                  </p>
                )}
                <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={pay}>
                  <label className="field flex-1">
                    GCash reference number
                    <input name="ref" className="input tabular-nums" required minLength={4} maxLength={50} inputMode="numeric" autoComplete="off" />
                  </label>
                  <button className="btn btn-primary">Submit reference</button>
                </form>
              </section>
              {b.payment_ref ? (
                <p className="text-sm text-mist">Changed your mind? Message us to cancel and arrange a refund.</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">Not going ahead? Declining releases your time slot.</p>
                  <button type="button" className="btn btn-ghost shrink-0" onClick={decline}>Decline quote</button>
                </div>
              )}
            </>
          )}

          {b.status === 'confirmed' && b.price !== null && b.downpayment !== null && (
            <p>
              Your downpayment is in. Bring your {b.device.toLowerCase()} on {longDay(when)} at {time(when)} and pay the{' '}
              {peso(b.price - b.downpayment)} balance at the shop.
            </p>
          )}
          {b.status === 'done' && <p>Your repair is done. Thanks for choosing IAMTech.</p>}
          {(b.status === 'declined' || b.status === 'cancelled') && (
            <div className="flex flex-col items-start gap-4">
              <p>
                {b.status === 'declined'
                  ? 'You declined this quote, so the time slot was released.'
                  : "This appointment was cancelled. If you didn't expect that, message us by SMS or WhatsApp."}
              </p>
              <a href="/book/" className="btn btn-ghost">Set another appointment</a>
            </div>
          )}
        </div>
      </article>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-mist">
          Bookmark this page or save its link to check on your repair. Questions? Message {CONTACT.phone} and mention ticket #{ticketNo(id)}.
        </p>
        <button type="button" className="btn btn-ghost shrink-0" onClick={() => copy(location.href, 'Link copied')}>Copy link</button>
      </div>

      {ask && <Confirm ask={ask} onClose={() => setAsk(null)} />}
      <Toast toast={toast} />
    </div>
  )
}

function Trace({ step }: { step: number }) {
  return (
    <div className="border-b border-line px-5 py-6 sm:px-7">
      <div className="relative">
        {/* Track between the first and last pad centers (columns are quarters, so centers sit at 12.5%). */}
        <div aria-hidden="true" className="absolute top-[7px] right-[12.5%] left-[12.5%] h-0.5 bg-line">
          <div
            className="h-full bg-linear-to-r from-volt to-plasma shadow-[0_0_10px_var(--color-volt)] motion-safe:transition-[width] motion-safe:duration-700"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <ol aria-label="Progress" className="relative grid grid-cols-4 text-center">
          {STEP_LABELS.map((label, i) => (
            <li key={label} aria-current={i === step ? 'step' : undefined} className="grid justify-items-center gap-2">
              <span
                className={`size-4 rounded-[4px] border-2 ${
                  i <= step ? 'border-volt bg-volt shadow-[0_0_12px_var(--color-volt)]' : 'border-line bg-panel'
                } ${i === step && i < STEPS.length - 1 ? 'motion-safe:animate-pulse-node' : ''}`}
              />
              <span className={`text-xs sm:text-sm ${i <= step ? 'font-semibold text-chrome' : 'text-mist'}`}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function Summary({ price, downpayment }: { price: number; downpayment: number }) {
  const rows: [string, number][] = [
    ['Repair price', price],
    [`Downpayment (${RATE})`, downpayment],
    ['Pay at the shop', price - downpayment],
  ]
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 bg-panel px-4 py-3 sm:block sm:py-3.5">
          <dt className="text-sm text-mist">{label}</dt>
          <dd className="font-display text-xl font-semibold text-chrome tabular-nums sm:mt-1 sm:text-2xl">{peso(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
