import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App.tsx'

if (typeof window !== 'undefined') {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)
}

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light })
  StatusBar.setBackgroundColor({ color: '#F3F7FC' })
  SplashScreen.hide()

  const shouldHide = localStorage.getItem('recall_hide_status_bar') === 'true'
  if (shouldHide) {
    StatusBar.hide().catch(() => {})
  }
}

// Prevent unwanted native Android/browser context menus and callout popups on long press
window.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
    return
  }
  e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
