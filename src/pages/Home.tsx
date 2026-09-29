import Layout from '../components/Layout.tsx'
import { CONTACT, HOURS_TEXT, SERVICES } from '../lib/business.ts'

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <img src="/logo.webp" alt="IAMTech — Phone and Laptop Repair" width="320" height="320" />
        <div>
          <h1>Broken phone or laptop? We fix it fast.</h1>
          <p className="lead">Screens, batteries, charging ports, water damage and more. Book a time that suits you and walk in.</p>
          <a href="/book/" className="button button-lg">Book a repair</a>
        </div>
      </section>

      <section id="services">
        <h2>Services</h2>
        <div className="grid">
          {SERVICES.map((s) => (
            <article key={s.title} className="card">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="visit" className="grid">
        <div className="card">
          <h2>Opening hours</h2>
          <dl className="hours">
            {HOURS_TEXT.map((h) => (
              <div key={h.day}>
                <dt>{h.day}</dt>
                <dd>{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card">
          <h2>Find us</h2>
          <p>{CONTACT.address}</p>
          <p>
            {CONTACT.phone} — <a href={CONTACT.sms}>SMS</a> · <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
          </p>
          <p><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
        </div>
      </section>
    </Layout>
  )
}
