import Layout from '../components/Layout.tsx'
import { CONTACT, DOWNPAYMENT_RATE, HOURS_TEXT, SERVICES } from '../lib/business.ts'

const STEPS = [
  { title: 'Pick a time', text: "Choose a free slot and tell us what's wrong with your device." },
  { title: 'Get a quote', text: 'We check your request and post the price on your appointment page.' },
  { title: `Pay ${DOWNPAYMENT_RATE * 100}% by GCash`, text: 'Send the downpayment and enter the reference number to lock in your slot.' },
  { title: 'Bring your device', text: 'Come in at your time and pay the rest at the shop.' },
]

export default function Home() {
  return (
    <Layout>
      <section className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-14">
        <div>
          <h1 className="text-4xl leading-[1.05] font-bold italic sm:text-6xl">Broken phone or laptop? Set a repair appointment online.</h1>
          <p className="mt-6 max-w-xl text-lg">
            Screens, batteries, charging ports, water damage and more. You get a price before you pay anything, and a{' '}
            {DOWNPAYMENT_RATE * 100}% GCash downpayment holds your slot.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/book/" className="btn btn-primary btn-lg">Set an appointment</a>
            <a href="#services" className="btn btn-ghost btn-lg">See services</a>
          </div>
        </div>
        {/* The logo art is a square; a radial fade keeps the glowing ring and melts the corners into the page. */}
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden="true" className="absolute inset-[18%] rounded-full bg-linear-to-br from-volt/35 to-plasma/45 blur-3xl" />
          <img
            src="/logo-800.webp"
            alt="IAMTech, phone and laptop repair"
            width="800"
            height="800"
            fetchPriority="high"
            className="relative w-full [mask-image:radial-gradient(circle_closest-side,#000_82%,transparent)]"
          />
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-3xl">How appointments work</h2>
        {/* A circuit trace: vertical on phones, horizontal from sm up. Numbered because it is a real sequence. */}
        <ol className="mt-10 grid sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative border-l border-line pb-8 pl-8 last:pb-0 sm:border-t sm:border-l-0 sm:pt-8 sm:pr-8 sm:pb-0 sm:pl-0">
              <span className="absolute top-0 -left-3.5 grid size-7 place-items-center rounded-md border border-volt/70 bg-void font-display text-sm font-semibold text-volt shadow-[0_0_14px_-4px_var(--color-volt)] sm:-top-3.5 sm:left-0">
                {i + 1}
              </span>
              <h3 className="text-lg">{s.title}</h3>
              <p className="mt-2 max-w-xs">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="services" className="mt-24 scroll-mt-24">
        <h2 className="text-3xl">Services</h2>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <li key={s.title} className="border-l-2 border-line pl-5">
              <h3 className="text-lg">{s.title}</h3>
              <p className="mt-1.5">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="visit" className="mt-24 grid scroll-mt-24 gap-6 md:grid-cols-2 md:items-start">
        <div className="panel p-6 sm:p-8">
          <h2 className="text-2xl">Opening hours</h2>
          <dl className="mt-4 divide-y divide-line">
            {HOURS_TEXT.map((h) => (
              <div key={h.day} className="flex justify-between gap-4 py-2.5">
                <dt>{h.day}</dt>
                <dd className={h.text === 'Closed' ? 'text-mist' : 'text-chrome tabular-nums'}>{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="panel p-6 sm:p-8">
          <h2 className="text-2xl">Find us</h2>
          <p className="mt-4 text-lg text-chrome">{CONTACT.address}</p>
          <p className="mt-4">
            Message <strong className="text-chrome">{CONTACT.phone}</strong> by SMS or WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={CONTACT.sms} className="btn btn-ghost">Send an SMS</a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="btn btn-ghost">Open WhatsApp</a>
            <a href={`mailto:${CONTACT.email}`} className="btn btn-ghost">Email us</a>
          </div>
        </div>
      </section>
    </Layout>
  )
}
