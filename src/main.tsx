import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { restoreSpaPath } from './lib/spaPathRecovery'
import './index.css'
import App from './App.tsx'

restoreSpaPath()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
