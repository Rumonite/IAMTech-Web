import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Every HTML entry mounts here; data-page on #root picks the page, loaded as its own chunk.
const pages = {
  home: () => import('./pages/Home.tsx'),
  book: () => import('./pages/Book.tsx'),
  admin: () => import('./pages/Admin.tsx'),
}

const root = document.getElementById('root')!
const { default: Page } = await pages[root.dataset.page as keyof typeof pages]()

createRoot(root).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
