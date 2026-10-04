import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Scrolling the mouse wheel over a focused number box (bid, budget, price filters) changes
// its value in most browsers. Unfocus it instead, so the page just scrolls.
document.addEventListener('wheel', () => {
  const el = document.activeElement
  if (el && el.tagName === 'INPUT' && el.type === 'number') el.blur()
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
