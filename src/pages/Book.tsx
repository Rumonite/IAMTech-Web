import { useEffect, useState, type FormEvent } from 'react'
import Layout from '../components/Layout.tsx'
import { DEVICES, slotsFor } from '../lib/business.ts'
import { supabase } from '../lib/supabase.ts'

const localDate = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD
const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const today = new Date()
const maxDay = new Date(today)
maxDay.setDate(maxDay.getDate() + 60)

export default function Book() {
  const [day, setDay] = useState(localDate(today))
  const [taken, setTaken] = useState<number[] | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [booked, setBooked] = useState<Date | null>(null)

  useEffect(() => {
    if (!day) return
    let live = true
    const [y, m, d] = day.split('-').map(Number)
    supabase
      .rpc('taken_slots', { from_ts: new Date(y, m - 1, d).toISOString(), to_ts: new Date(y, m - 1, d + 1).toISOString() })
      .then(({ data, error }) => {
        if (!live) return
        if (error) setError('Could not load available times. Please refresh the page.')
        else setTaken((data as string[]).map((t) => new Date(t).getTime()))
      })
    return () => {
      live = false
    }
  }, [day, refresh])

  const free = taken ? slotsFor(day).filter((s) => !taken.includes(s.getTime())) : []

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setSending(true)
    setError('')
    const { error } = await supabase.from('appointments').insert({
      slot_start: f.slot,
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      device: f.device,
      issue: f.issue.trim(),
    })
    setSending(false)
    if (!error) return setBooked(new Date(f.slot))
    if (error.code === '23505') {
      setError('Sorry, that time was just booked by someone else. Please pick another.')
      setTaken(null)
      setRefresh((n) => n + 1)
    } else {
      setError('Booking failed. Please try again, or message us by SMS or WhatsApp.')
    }
  }

  if (booked) {
    return (
      <Layout>
        <section className="card narrow" role="status">
          <h1>You're booked in</h1>
          <p className="lead">
            {booked.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {time(booked)}.
          </p>
          <p>We'll contact you to confirm. Need to change it? Just message us by SMS or WhatsApp.</p>
          <a href="/" className="button">Back to home</a>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="narrow">
        <h1>Book a repair</h1>
        <form className="card form" onSubmit={submit}>
          <label>
            Name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" required minLength={5} maxLength={30} autoComplete="tel" />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={200} autoComplete="email" />
          </label>
          <label>
            Device
            <select name="device" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {DEVICES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>
            What's wrong?
            <textarea name="issue" required maxLength={2000} rows={4} placeholder="e.g. iPhone 13, cracked screen, touch still works" />
          </label>
          <label>
            Date
            <input type="date" required value={day} min={localDate(today)} max={localDate(maxDay)} onChange={(e) => {
              setDay(e.target.value)
              setTaken(null)
            }} />
          </label>
          <fieldset key={day + refresh} className="slots">
            <legend>Time</legend>
            {!day ? <p>Pick a date first.</p>
              : !taken ? <p>Loading available times…</p>
              : free.length === 0 ? <p>No times available on this day. Try another date.</p>
              : free.map((s) => (
                <label key={s.getTime()}>
                  <input type="radio" name="slot" value={s.toISOString()} required />
                  {time(s)}
                </label>
              ))}
          </fieldset>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button button-lg" disabled={sending}>{sending ? 'Booking…' : 'Book appointment'}</button>
        </form>
      </section>
    </Layout>
  )
}
