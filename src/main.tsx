import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Clarity from '@microsoft/clarity'
import { restoreSpaPath } from './lib/spaPathRecovery'
import { installPlatformErrorListeners } from './lib/platformErrors'
import { cleanupDevServiceWorkers } from './lib/devServiceWorkerCleanup'
import './index.css'
import App from './App.tsx'

restoreSpaPath()
installPlatformErrorListeners()

Clarity.init('xxrcpnz5j0')

void cleanupDevServiceWorkers().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
