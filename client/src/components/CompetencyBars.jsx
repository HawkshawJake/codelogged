// components/CompetencyBars.jsx
// Renders six labelled progress bars for the competency score dimensions.
// Used on both the dashboard sidebar (compact prop) and the public profile page.

const METRICS = [
  { key: 'delivery',      label: 'Delivery' },
  { key: 'code_quality',  label: 'Code Quality' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'testing',       label: 'Testing' },
  { key: 'communication', label: 'Communication' },
]

// Colour the bar based on the score value
function barColor(score) {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-blue-500'
  if (score >= 25) return 'bg-yellow-500'
  return 'bg-neutral-600'
}

export default function CompetencyBars({ scores, compact = false }) {
  if (!scores) {
    return (
      <p className="text-xs text-neutral-600">
        {compact ? 'Submit tasks to build your profile.' : 'No scores yet.'}
      </p>
    )
  }

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {!compact && (
        <p className="text-xs text-neutral-500 mb-4">Scores update after each review.</p>
      )}

      {METRICS.map(({ key, label }) => {
        const value = Math.round(scores[key] ?? 0)
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <span className={`text-neutral-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {label}
              </span>
              <span className={`font-medium text-neutral-300 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {value}
              </span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
