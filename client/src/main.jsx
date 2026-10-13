import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
import { CityProvider } from './context/CityContext'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <CityProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CityProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
