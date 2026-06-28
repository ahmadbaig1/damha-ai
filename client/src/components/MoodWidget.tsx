import { useMoodStore } from '../store/moodStore'

function moodColor(score: number): string {
  // 0=frustrated red → 50=orange → 100=calm indigo
  const r1 = [239, 68, 68]
  const mid = [249, 115, 22]
  const r2 = [99, 102, 241]
  let r: number, g: number, b: number
  if (score <= 50) {
    const t = score / 50
    r = Math.round(r1[0] + (mid[0] - r1[0]) * t)
    g = Math.round(r1[1] + (mid[1] - r1[1]) * t)
    b = Math.round(r1[2] + (mid[2] - r1[2]) * t)
  } else {
    const t = (score - 50) / 50
    r = Math.round(mid[0] + (r2[0] - mid[0]) * t)
    g = Math.round(mid[1] + (r2[1] - mid[1]) * t)
    b = Math.round(mid[2] + (r2[2] - mid[2]) * t)
  }
  return `rgb(${r},${g},${b})`
}

function moodLabel(score: number): string {
  if (score <= 20) return 'Very Frustrated'
  if (score <= 40) return 'Upset'
  if (score <= 60) return 'Neutral'
  if (score <= 80) return 'Positive'
  return 'Satisfied'
}

interface Props {
  ticketId: number
}

export function MoodWidget({ ticketId }: Props) {
  const { moods, loading } = useMoodStore()
  const mood = moods[ticketId]
  const isLoading = loading[ticketId]

  if (!isLoading && !mood) return null

  const score = mood?.score ?? 50
  const color = moodColor(score)
  const label = mood ? moodLabel(score) : 'Neutral'

  // Tint strength: 0=no tint (calm), 1=heavy tint (frustrated)
  const tintStrength = Math.max(0, (50 - score) / 50)
  const bgAlpha = (0.08 + tintStrength * 0.22).toFixed(2)
  const borderAlpha = (0.15 + tintStrength * 0.3).toFixed(2)

  return (
    <div style={{
      background: `rgba(${color.slice(4, -1)}, ${bgAlpha})`,
      border: `1px solid rgba(${color.slice(4, -1)}, ${borderAlpha})`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      boxShadow: `var(--shadow-sm)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'background 0.6s ease, border-color 0.6s ease',
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Customer Mood
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: 26,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: isLoading ? 'var(--color-text-secondary)' : color,
          lineHeight: 1,
          transition: 'color 0.6s ease',
        }}>
          {isLoading ? '—' : score}
        </span>
        {!isLoading && (
          <span style={{ fontSize: 'var(--text-xs)', color, fontFamily: 'var(--font-mono)', fontWeight: 600, transition: 'color 0.6s ease' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
