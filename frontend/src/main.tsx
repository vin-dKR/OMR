import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ContextProvider from './providers/ContextProvider.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ContextProvider>
            <App />
        </ContextProvider>
    </StrictMode>,
)
