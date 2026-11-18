import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import { App } from './App'
import { buildOidcConfig } from './auth/oidcConfig'
import { config } from './config'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <AuthProvider {...buildOidcConfig(config, window.location.origin)}>
      <App baseUrl={config.coreBaseUrl} />
    </AuthProvider>
  </StrictMode>,
)
