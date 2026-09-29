import type { ReactNode } from 'react'
import { CONTACT } from '../lib/business.ts'

const YEAR = new Date().getFullYear()

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <a href="/" className="brand">
          <img src="/logo.webp" alt="" width="44" height="44" />
          <span>IAMTech</span>
        </a>
        <nav>
          <a href="/#services">Services</a>
          <a href="/#visit">Visit</a>
          <a href="/admin/">Log in</a>
          <a href="/book/" className="button">Book a repair</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <p>© {YEAR} IAMTech — Phone and Laptop Repair</p>
        <p>
          {CONTACT.phone} (<a href={CONTACT.sms}>SMS</a> / <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>) · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </p>
      </footer>
    </>
  )
}
