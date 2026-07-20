import { useEffect, useRef, useState } from 'react'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function useVoiceDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (SR) {
      setSupported(true)
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'
      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(' ')
          .trim()
        if (text) onTranscript(text)
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      recRef.current = rec
    }
  }, [])

  // Cmd+Shift+M (Mac) / Ctrl+Shift+M (Windows/Linux)
  useEffect(() => {
    if (!supported) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'm' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [supported, listening])

  function toggle() {
    if (!recRef.current) return
    if (listening) {
      recRef.current.stop()
      setListening(false)
    } else {
      recRef.current.start()
      setListening(true)
    }
  }

  return { listening, supported, toggle }
}
