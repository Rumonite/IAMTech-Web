import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import Layout from '../components/Layout.tsx'
import { supabase } from '../lib/supabase.ts'

type Status = 'pending' | 'confirmed' | 'cancelled' | 'done'

type Appointment = {
  id: string
  slot_start: string
  name: string
  phone: string
  email: string
  device: string
  issue: string
  status: Status
}

const STATUSES: Status[] = ['pending', 'confirmed', 'cancelled', 'done']

// Which status changes each status offers, as [label, new status].
const ACTIONS: Record<Status, [string, Status][]> = {
  pending: [['Confirm', 'confirmed'], ['Cancel', 'cancelled']],
  confirmed: [['Mark done', 'done'], ['Cancel', 'cancelled']],
  cancelled: [],
  done: [],
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <Layout>
      {session === undefined ? <p className="narrow">Loading…</p>
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
    <section className="narrow">
      <h1>Admin sign in</h1>
      <form className="card form" onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={sending}>{sending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  )
}

function Appointments({ session }: { session: Session }) {
  const [day, setDay] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Appointment[] | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let live = true
    // No date picked = everything from today on.
    const [y, m, d] = (day || new Date().toLocaleDateString('en-CA')).split('-').map(Number)
    let q = supabase
      .from('appointments')
      .select('id, slot_start, name, phone, email, device, issue, status')
      .gte('slot_start', new Date(y, m - 1, d).toISOString())
      .order('slot_start')
    if (day) q = q.lt('slot_start', new Date(y, m - 1, d + 1).toISOString())
    if (status) q = q.eq('status', status)
    q.then(({ data, error }) => {
      if (!live) return
      setError(error ? error.message : '')
      setRows((data as Appointment[] | null) ?? [])
    })
    return () => {
      live = false
    }
  }, [day, status, refresh])

  async function setRowStatus(row: Appointment, next: Status) {
    if (next === 'cancelled' && !confirm(`Cancel ${row.name}'s appointment? The slot becomes bookable again.`)) return
    const { error } = await supabase.from('appointments').update({ status: next }).eq('id', row.id)
    if (error) setError(error.message)
    else setRefresh((n) => n + 1)
  }

  return (
    <section>
      <div className="admin-bar">
        <h1>Appointments</h1>
        <span>
          {session.user.email} <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </span>
      </div>
      {session.user.app_metadata.role !== 'admin' && (
        <p className="error" role="alert">This account is not an admin, so no appointments are shown. See docs/README.md.</p>
      )}
      <div className="filters">
        <label>
          Date
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        {day && <button className="link" onClick={() => setDay('')}>Show all upcoming</button>}
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>No appointments.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>When</th><th>Customer</th><th>Device / issue</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.slot_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    {r.name}<br />
                    <a href={`tel:${r.phone}`}>{r.phone}</a><br />
                    <a href={`mailto:${r.email}`}>{r.email}</a>
                  </td>
                  <td><strong>{r.device}</strong><br />{r.issue}</td>
                  <td><span className={`status status-${r.status}`}>{r.status}</span></td>
                  <td className="actions">
                    {ACTIONS[r.status].map(([label, next]) => (
                      <button key={next} className="button button-sm" onClick={() => setRowStatus(r, next)}>{label}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
