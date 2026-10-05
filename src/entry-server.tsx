import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'

/** Home as static markup, rendered at build time and placed in index.html. */
export const renderHome = (): string =>
  renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
