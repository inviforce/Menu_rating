import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App_main from './Router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App_main />
  </StrictMode>,
)
