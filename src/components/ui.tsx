import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/** A question to confirm before an action runs. */
export type Ask = {
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  run: () => Promise<unknown>
}

export type ToastMsg = { text: string; error?: boolean }

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** Native modal <dialog>: shown on mount; Esc, the close button, or a backdrop click call onClose. */
export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const back = useRef(document.activeElement as HTMLElement | null)
  const id = useId()

  useEffect(() => {
    const d = ref.current!
    const opener = back.current
    if (!d.open) d.showModal()
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    // Parents unmount instead of calling close(), so hand focus back ourselves.
    return () => opener?.focus()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="modal"
      onClose={onClose}
      // Content sits in a padded div, so a click whose target is the <dialog> itself was on the backdrop.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={id} className="text-xl leading-snug">{title}</h2>
          <button type="button" aria-label="Close" className="-m-2 cursor-pointer rounded-lg p-2 text-mist hover:text-chrome" onClick={() => ref.current?.close()}>
            <svg {...svg} className="size-5"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** Confirmation dialog. Focuses the safe choice for dangerous actions, the action otherwise. */
export function Confirm({ ask, onClose }: { ask: Ask; onClose: () => void }) {
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      await ask.run()
    } finally {
      onClose()
    }
  }

  return (
    <Modal title={ask.title} onClose={onClose}>
      <div className="space-y-3">{ask.body}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost" onClick={onClose} data-autofocus={ask.danger || undefined}>
          {ask.cancelLabel ?? 'Go back'}
        </button>
        <button type="button" className={`btn ${ask.danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={run} data-autofocus={!ask.danger || undefined}>
          {busy ? `${ask.confirmLabel}…` : ask.confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// A popover sits above open dialogs. Older phones (iOS before 17) lack it and get a plain fixed box instead.
const POPOVER = typeof HTMLElement.prototype.showPopover === 'function'

/** Short message after an action; each new message object shows again. */
export function Toast({ toast }: { toast: ToastMsg | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current!
    const show = (on: boolean) => {
      if (!POPOVER) el.hidden = !on
      else if (on) el.showPopover()
      else if (el.matches(':popover-open')) el.hidePopover()
    }
    // Hide first so a new message re-enters the top layer above any dialog opened since.
    show(false)
    if (!toast) return
    show(true)
    const t = setTimeout(() => show(false), toast.error ? 7000 : 4000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div
      ref={ref}
      popover={POPOVER ? 'manual' : undefined}
      hidden={!POPOVER}
      role={toast?.error ? 'alert' : 'status'}
      className={`fixed inset-x-0 top-auto bottom-6 mx-auto w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border bg-raised px-4 py-3 text-sm text-chrome shadow-2xl shadow-black motion-safe:animate-pop ${POPOVER ? 'open:flex' : 'z-50 flex'} ${toast?.error ? 'border-danger/60' : 'border-done/50'}`}
    >
      {toast?.error ? (
        <svg {...svg} className="size-5 shrink-0 text-danger"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
      ) : (
        <svg {...svg} className="size-5 shrink-0 text-done"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
      )}
      {toast?.text}
    </div>
  )
}

export function Chevron({ className = '' }: { className?: string }) {
  return <svg {...svg} className={className}><path d="m9 6 6 6-6 6" /></svg>
}
