import React from 'react'
import SpinGame from './SpinGame'

// If the path is /game/<slug> → show full-screen viewer
const path = location.pathname
const isGame = path.startsWith('/game/')
const slug = isGame ? decodeURIComponent(path.replace('/game/','').replace(/\/+$/,'')) : ''
const apiBaseUrl = '/spinner/api'   // our PHP API path

export default function App() {
  if (isGame) {
    return <SpinGame mode="viewer" apiBaseUrl={apiBaseUrl} gameSlug={slug} />
  }
  return <SpinGame mode="editor" apiBaseUrl={apiBaseUrl} />
}
