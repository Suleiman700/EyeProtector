import React from 'react'
import { createRoot } from 'react-dom/client'
import { BlinkScreen } from './BlinkScreen'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlinkScreen />
  </React.StrictMode>
)
