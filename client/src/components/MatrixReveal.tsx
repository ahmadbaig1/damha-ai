import { useEffect, useRef } from 'react'

interface MatrixRevealProps {
  label: string
}

const KATAKANA =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const POOL = KATAKANA + LATIN + DIGITS

function randChar() {
  return POOL[Math.floor(Math.random() * POOL.length)]
}

const FONT_SIZE = 11
const COL_WIDTH = 7          // pixels per character column
const CANVAS_HEIGHT = 22
const RAIN_DURATION = 1500   // ms before resolving starts
const RESOLVE_SPEED = 60     // ms per column resolving left→right
const FRAME_INTERVAL = 40    // ms per animation frame (~25 fps)

export default function MatrixReveal({ label }: MatrixRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Measure label width with the chosen font so the canvas fits exactly
    ctx.font = `${FONT_SIZE}px monospace`
    const labelWidth = ctx.measureText(label).width
    const cols = Math.ceil(labelWidth / COL_WIDTH) + 2   // +2 padding columns
    const canvasWidth = cols * COL_WIDTH + 12             // a few px breathing room

    canvas.width = canvasWidth
    canvas.height = CANVAS_HEIGHT

    // Each column tracks the current random character shown in it
    const drops: string[] = Array.from({ length: cols }, () => randChar())
    // Which columns have resolved to their final label character
    const resolved: boolean[] = new Array(cols).fill(false)

    const startTime = performance.now()
    let lastFrame = 0
    let animId: number
    let resolveStarted = false

    function draw(now: number) {
      if (now - lastFrame < FRAME_INTERVAL) {
        animId = requestAnimationFrame(draw)
        return
      }
      lastFrame = now

      const elapsed = now - startTime

      // Clear
      ctx.clearRect(0, 0, canvasWidth, CANVAS_HEIGHT)

      // After RAIN_DURATION, start resolving columns left → right
      if (elapsed > RAIN_DURATION && !resolveStarted) resolveStarted = true

      if (resolveStarted) {
        const resolveElapsed = elapsed - RAIN_DURATION
        const colsToResolve = Math.floor(resolveElapsed / RESOLVE_SPEED)
        for (let c = 0; c < Math.min(colsToResolve, cols); c++) {
          resolved[c] = true
        }
      }

      ctx.font = `${FONT_SIZE}px monospace`

      for (let c = 0; c < cols; c++) {
        const x = c * COL_WIDTH + 6   // 6px left padding
        const y = CANVAS_HEIGHT / 2 + FONT_SIZE / 2 - 1  // vertically centred

        if (resolved[c]) {
          // Show the real label character at this column position
          // We map column index → character position in label
          const charIndex = Math.round((c / cols) * label.length)
          const ch = label[Math.min(charIndex, label.length - 1)] ?? ''
          ctx.fillStyle = '#ffffff'
          ctx.globalAlpha = 1
          ctx.fillText(ch, x, y)
        } else {
          // Rain: head character is bright indigo, rest slightly dimmer
          const isHead = Math.random() > 0.7
          ctx.fillStyle = isHead ? '#8182f8' : '#6366f1'
          ctx.globalAlpha = isHead ? 1 : 0.55 + Math.random() * 0.35
          ctx.fillText(drops[c], x, y)
          // Occasionally flicker to a new random char
          if (Math.random() < 0.4) drops[c] = randChar()
        }
      }

      ctx.globalAlpha = 1

      // Keep animating until every column is resolved
      if (!resolved.every(Boolean)) {
        animId = requestAnimationFrame(draw)
      }
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [label])

  return (
    <canvas
      ref={canvasRef}
      height={CANVAS_HEIGHT}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        imageRendering: 'pixelated',
      }}
    />
  )
}
