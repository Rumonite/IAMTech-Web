import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import Layout from '../components/Layout.tsx'
import { Chevron, Confirm, Modal, Toast, type Ask, type ToastMsg } from '../components/ui.tsx'
import { copyText } from '../lib/browser.ts'
import { DOWNPAYMENT_RATE } from '../lib/business.ts'
import { dateTime, longDay, peso, shortDay, ticketNo, time } from '../lib/format.ts'
import { supabase } from '../lib/supabase.ts'

type Status = 'pending' | 'quoted' | 'confirmed' | 'declined' | 'cancelled' | 'done'

type Appointment = {
  id: string
  slot_start: string
  name: string
  phone: string
  email: string
  device: string
  issue: string
  status: Status
  created_at: string
  price: number | null
  downpayment: number | null
  payment_ref: string | null
  paid_at: string | null
}

// Tabs in workflow order. "cancelled" also holds quotes the customer declined.
const TABS = [
  { key: 'pending', label: 'Pending', hint: 'New requests. Open one to send a quote.', empty: 'No new requests.' },
  { key: 'quoted', label: 'Quoted', hint: "Waiting for the customer's GCash downpayment. Confirm it once it shows in GCash.", empty: 'No quotes waiting for payment.' },
  { key: 'confirmed', label: 'Accepted', hint: 'Downpayment received. These customers are coming in.', empty: 'No accepted appointments.' },
  { key: 'done', label: 'Done', hint: 'Finished repairs, newest first.', empty: 'No finished repairs yet.' },
  { key: 'cancelled', label: 'Cancelled', hint: 'Cancelled by you or declined by the customer, newest first.', empty: 'Nothing cancelled.' },
] as const
type Tab = (typeof TABS)[number]['key']
const tabOf = (s: Status): Tab => (s === 'declined' ? 'cancelled' : s)

const LABELS: Record<Status, string> = {
  pending: 'Pending',
  quoted: 'Quoted',
  confirmed: 'Accepted',
  done: 'Done',
  cancelled: 'Cancelled',
  declined: 'Declined by customer',
}

const localDate = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD
const downpaymentFor = (price: number) => Math.round(price * DOWNPAYMENT_RATE * 100) / 100
const customerLink = (row: Appointment) => `${location.origin}/book/?id=${row.id}`

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <Layout>
      {session === undefined ? <p className="text-mist">Loading…</p>
        : session ? <Appointments session={session} />
        : <Login />}
    </Layout>
  )
}

function Login() {
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSending(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get('email')),
      password: String(f.get('password')),
    })
    setSending(false)
    setError(error ? error.message : '')
  }

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold italic">Staff sign in</h1>
      <p className="mt-2 text-mist">For IAMTech staff. Customers don't need an account: their appointment link is their ticket.</p>
      <form className="panel mt-6 grid gap-4 p-5 sm:p-6" onSubmit={submit}>
        <label className="field">
          Email
          <input name="email" type="email" className="input" required autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input name="password" type="password" className="input" required autoComplete="current-password" />
        </label>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={sending}>{sending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  )
}

function Appointments({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('pending')
  const [day, setDay] = useState('')
  const [rows, setRows] = useState<Appointment[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [openId, setOpenId] = useState('')
  const [ask, setAsk] = useState<Ask | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)

  useEffect(() => {
    let live = true
    const [y, m, d] = (day || localDate(new Date())).split('-').map(Number)
    // No date picked: the last 30 days (so recent done and cancelled show) and everything upcoming.
    let q = supabase
      .from('appointments')
      .select('*')
      .gte('slot_start', new Date(y, m - 1, day ? d : d - 30).toISOString())
      .order('slot_start')
    if (day) q = q.lt('slot_start', new Date(y, m - 1, d + 1).toISOString())
    q.then(({ data, error }) => {
      if (!live) return
      setLoadError(error ? `Appointments didn't load: ${error.message}` : '')
      setRows((data as Appointment[] | null) ?? [])
    })
    return () => {
      live = false
    }
  }, [day, refresh])

  // Coming back from the GCash app should show payments submitted meanwhile.
  useEffect(() => {
    const reload = () => setRefresh((n) => n + 1)
    addEventListener('focus', reload)
    return () => removeEventListener('focus', reload)
  }, [])

  // Only applies if the row is still in the status it was shown in, so a quote the customer
  // declined a moment ago can't be confirmed over the top.
  async function save(row: Appointment, changes: Partial<Appointment>, done: string) {
    const { data, error } = await supabase.from('appointments').update(changes).eq('id', row.id).eq('status', row.status).select('id')
    setRefresh((n) => n + 1)
    if (error) return setToast({ text: `Not saved: ${error.message}`, error: true })
    if (!data.length) return setToast({ text: `Not saved: ${row.name}'s appointment changed in the meantime. Check it again.`, error: true })
    setToast({ text: done })
  }

  const actions: Actions = {
    quote(row, price) {
      const dp = downpaymentFor(price)
      setAsk({
        title: 'Send this quote?',
        body: (
          <>
            <p>
              {row.name} will see a repair price of <strong className="text-chrome">{peso(price)}</strong> on their appointment page and pay a{' '}
              <strong className="text-chrome">{peso(dp)}</strong> GCash downpayment to confirm.
            </p>
            <p className="text-mist">The price can't be changed after sending. To re-quote, cancel and have them set a new appointment.</p>
          </>
        ),
        confirmLabel: 'Send quote',
        run: () => save(row, { price, status: 'quoted' }, `Quote sent. Copy ${row.name}'s appointment link and send it to them.`),
      })
    },
    confirmPayment(row) {
      setAsk({
        title: 'Confirm payment?',
        body: row.payment_ref ? (
          <p>
            Check that GCash reference <strong className="text-chrome">{row.payment_ref}</strong> for{' '}
            <strong className="text-chrome">{peso(row.downpayment ?? 0)}</strong> is in your GCash history. {row.name}'s appointment then moves to Accepted.
          </p>
        ) : (
          <p className="text-pending">
            {row.name} hasn't sent a GCash reference yet. Only confirm if you received the {peso(row.downpayment ?? 0)} downpayment another way.
          </p>
        ),
        confirmLabel: 'Confirm payment',
        run: () => save(row, { status: 'confirmed' }, `Payment confirmed. ${row.name}'s appointment is accepted.`),
      })
    },
    markDone(row) {
      setAsk({
        title: 'Mark this repair done?',
        body: row.price !== null && row.downpayment !== null
          ? <p>Collect the <strong className="text-chrome">{peso(row.price - row.downpayment)}</strong> balance from {row.name} before handing the device back.</p>
          : <p>{row.name}'s appointment moves to Done.</p>,
        confirmLabel: 'Mark done',
        run: () => save(row, { status: 'done' }, 'Marked done.'),
      })
    },
    cancel(row) {
      const when = new Date(row.slot_start)
      setAsk({
        title: `Cancel ${row.name}'s appointment?`,
        body: (
          <>
            <p>The {shortDay(when)}, {time(when)} slot becomes free for others. This can't be undone.</p>
            {row.payment_ref && (
              <p className="text-pending">They sent a {peso(row.downpayment ?? 0)} downpayment. Refund it through GCash yourself.</p>
            )}
          </>
        ),
        confirmLabel: 'Cancel appointment',
        cancelLabel: 'Keep appointment',
        danger: true,
        run: () => save(row, { status: 'cancelled' }, 'Appointment cancelled. The slot is free again.'),
      })
    },
    async copyLink(row) {
      try {
        await copyText(customerLink(row))
        setToast({ text: `Link copied. Paste it in a message to ${row.name}.` })
      } catch {
        setToast({ text: `This browser blocked copying. The link is ${customerLink(row)}`, error: true })
      }
    },
  }

  const inTab = (t: Tab) => (rows ?? []).filter((r) => tabOf(r.status) === t)
  const list = inTab(tab)
  if (tab === 'done' || tab === 'cancelled') list.reverse()
  const paymentsToCheck = inTab('quoted').filter((r) => r.payment_ref).length
  const current = TABS.find((t) => t.key === tab)!
  const open = rows?.find((r) => r.id === openId)

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold italic sm:text-4xl">Repair queue</h1>
          <p className="mt-1 text-sm text-mist">
            Signed in as {session.user.email}.{' '}
            <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="field">
            Date
            <input type="date" className="input py-2" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          {day && <button type="button" className="btn btn-ghost" onClick={() => setDay('')}>All dates</button>}
        </div>
      </div>

      {session.user.app_metadata.role !== 'admin' && (
        <p className="mt-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-danger" role="alert">
          This account isn't an admin, so no appointments are shown. See docs/README.md.
        </p>
      )}

      <div className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`tone-${t.key} flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'border-(--tone) bg-(--tone)/12 text-chrome' : 'border-line text-silver hover:border-mist'
            }`}
          >
            <span aria-hidden="true" className="size-2 rounded-[3px] bg-(--tone)" />
            {t.label}
            <span className="min-w-6 rounded-md bg-void/70 px-1.5 py-0.5 text-xs text-silver tabular-nums">{rows ? inTab(t.key).length : '–'}</span>
            {t.key === 'quoted' && paymentsToCheck > 0 && (
              <span className="rounded-md bg-done/15 px-1.5 py-0.5 text-xs text-done">{paymentsToCheck} paid</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-mist">
        {current.hint}
        {!day && ' Showing the last 30 days and everything upcoming.'}
      </p>

      {loadError && <p className="mt-4 text-danger" role="alert">{loadError}</p>}

      {!rows ? <p className="mt-6 text-mist">Loading appointments…</p>
        : list.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line px-5 py-10 text-center text-mist">
            {current.empty}{day && ' Try another date or show all dates.'}
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {list.map((r) => <Row key={r.id} row={r} onOpen={() => setOpenId(r.id)} />)}
          </ul>
        )}

      {open && <Details row={open} actions={actions} onClose={() => setOpenId('')} />}
      {ask && <Confirm ask={ask} onClose={() => setAsk(null)} />}
      <Toast toast={toast} />
    </section>
  )
}

function Row({ row, onOpen }: { row: Appointment; onOpen: () => void }) {
  const when = new Date(row.slot_start)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`tone-${row.status} grid w-full cursor-pointer grid-cols-[5.5rem_1fr_auto] items-center gap-3 rounded-xl border border-l-4 border-line border-l-(--tone) bg-panel py-3 pr-3 pl-4 text-left transition-colors hover:bg-raised sm:gap-5 sm:pr-4`}
      >
        <span className="leading-tight">
          <span className="block text-sm whitespace-nowrap text-mist">{shortDay(when)}</span>
          <span className="block font-display font-semibold text-chrome tabular-nums">{time(when)}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-chrome">{row.name}</span>
          <span className="block truncate text-sm text-mist">{row.device}: {row.issue}</span>
        </span>
        <span className="flex items-center gap-2 sm:gap-3">
          <span className="grid justify-items-end gap-1 text-right">
            {row.price !== null && <span className="font-display font-semibold text-chrome tabular-nums">{peso(row.price)}</span>}
            {row.status === 'quoted' && (row.payment_ref
              ? <span className="chip tone-done">Payment sent</span>
              : <span className="text-xs text-mist">Awaiting payment</span>)}
            {row.status === 'declined' && <span className="chip tone-declined">Declined</span>}
          </span>
          <Chevron className="size-5 shrink-0 text-mist" />
        </span>
      </button>
    </li>
  )
}

type Actions = {
  quote: (row: Appointment, price: number) => void
  confirmPayment: (row: Appointment) => void
  markDone: (row: Appointment) => void
  cancel: (row: Appointment) => void
  copyLink: (row: Appointment) => void
}

function Details({ row, actions, onClose }: { row: Appointment; actions: Actions; onClose: () => void }) {
  const [price, setPrice] = useState('')
  const p = Number(price)
  const when = new Date(row.slot_start)
  const live = row.status === 'pending' || row.status === 'quoted' || row.status === 'confirmed'

  return (
    <Modal title={row.name} onClose={onClose}>
      <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`chip tone-${row.status}`}>{LABELS[row.status]}</span>
        <span className="font-display text-sm text-mist">Ticket #{ticketNo(row.id)}</span>
      </div>
      <p className="mt-3 font-display text-lg text-chrome">{longDay(when)}, {time(when)}</p>

      <dl className="mt-5 grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2.5 border-t border-line pt-5 text-sm">
        <dt className="text-mist">Mobile</dt>
        <dd className="text-chrome">{row.phone}</dd>
        <dt className="text-mist">Email</dt>
        <dd className="break-all"><a className="link" href={`mailto:${row.email}`}>{row.email}</a></dd>
        <dt className="text-mist">Device</dt>
        <dd className="text-chrome">{row.device}</dd>
        <dt className="text-mist">Problem</dt>
        <dd className="whitespace-pre-line text-chrome">{row.issue}</dd>
        <dt className="text-mist">Requested</dt>
        <dd>{dateTime(new Date(row.created_at))}</dd>
      </dl>

      {row.price !== null && row.downpayment !== null && (
        <dl className="mt-5 grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2.5 border-t border-line pt-5 text-sm">
          <dt className="text-mist">Price</dt>
          <dd className="font-display text-base font-semibold text-chrome tabular-nums">{peso(row.price)}</dd>
          <dt className="text-mist">Downpayment</dt>
          <dd className="text-chrome tabular-nums">{peso(row.downpayment)}</dd>
          <dt className="text-mist">At the shop</dt>
          <dd className="text-chrome tabular-nums">{peso(row.price - row.downpayment)}</dd>
          <dt className="text-mist">GCash ref</dt>
          <dd>
            {row.payment_ref
              ? <><strong className="text-chrome tabular-nums">{row.payment_ref}</strong>{row.paid_at && <span className="text-mist">, sent {dateTime(new Date(row.paid_at))}</span>}</>
              : <span className="text-mist">None yet</span>}
          </dd>
        </dl>
      )}

      {row.status === 'pending' && (
        <form
          className="mt-5 grid gap-3 rounded-xl border border-line bg-void/60 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            actions.quote(row, p)
          }}
        >
          <label className="field">
            Repair price (₱)
            <input
              type="number"
              className="input tabular-nums"
              min="1"
              step="0.01"
              inputMode="decimal"
              required
              placeholder="e.g. 2500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <p className="text-sm text-mist">
            {p > 0
              ? <>They pay <strong className="text-chrome">{peso(downpaymentFor(p))}</strong> now by GCash and {peso(p - downpaymentFor(p))} at the shop.</>
              : `They pay ${DOWNPAYMENT_RATE * 100}% now by GCash to confirm, the rest at the shop.`}
          </p>
          <button className="btn btn-primary">Send quote</button>
        </form>
      )}

      {row.status === 'quoted' && (
        <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => actions.confirmPayment(row)}>Confirm payment</button>
      )}
      {row.status === 'confirmed' && (
        <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => actions.markDone(row)}>Mark done</button>
      )}

      {/* Secondary actions; cancelling sits apart on the left so it isn't hit by mistake. */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        {live && (
          <button type="button" className="btn btn-danger order-last w-full sm:order-none sm:mr-auto sm:w-auto" onClick={() => actions.cancel(row)}>
            Cancel appointment
          </button>
        )}
        <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={() => actions.copyLink(row)}>Copy customer link</button>
      </div>
    </Modal>
  )
}
