import React from 'react'
import { createRoot } from 'react-dom/client'
import { BreakScreen } from './BreakScreen'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BreakScreen />
  </React.StrictMode>
)
