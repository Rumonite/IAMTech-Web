import type { ReactNode } from 'react'
import { CONTACT } from '../lib/business.ts'

const YEAR = new Date().getFullYear()
const NAV = 'rounded-lg px-3 py-2 whitespace-nowrap text-silver no-underline hover:text-chrome'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line/70 bg-void/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo-96.webp" alt="" width="40" height="40" className="size-10 rounded-lg" />
            {/* Screen-reader only on the narrowest phones, so the nav fits on one line. */}
            <span className="font-display text-xl font-bold text-chrome italic max-[22rem]:sr-only">IAMTech</span>
          </a>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="/#services" className={`${NAV} hidden md:block`}>Services</a>
            <a href="/#visit" className={`${NAV} hidden md:block`}>Visit</a>
            <a href="/admin/" className={NAV}>Staff login</a>
            <a href="/book/" className="btn btn-primary px-3 sm:px-4">
              <span className="sm:hidden">Appointment</span>
              <span className="hidden sm:inline">Set an appointment</span>
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-mist sm:flex-row sm:justify-between sm:px-6">
          <p>© {YEAR} IAMTech, phone and laptop repair</p>
          {/* py-2 on inline links enlarges the tap area without changing the line layout. */}
          <p>
            Text {CONTACT.phone} by <a className="link py-2" href={CONTACT.sms}>SMS</a> or{' '}
            <a className="link py-2" href={CONTACT.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>, or email{' '}
            <a className="link py-2" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </p>
        </div>
      </footer>
    </>
  )
}
