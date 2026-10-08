import type { Prediction, PredictionStatus } from '../api/types'

type Value = PredictionStatus | 'all'

const TABS: { value: Value; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'open', label: 'En cours' },
  { value: 'success', label: 'Réussies' },
  { value: 'failed', label: 'Échouées' },
]

export function StatusTabs({
  value,
  onChange,
  predictions,
}: {
  value: Value
  onChange: (value: Value) => void
  predictions: Prediction[]
}) {
  const count = (tab: Value) => (tab === 'all' ? predictions.length : predictions.filter((p) => p.status === tab).length)
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
            value === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {tab.label} <span className="text-slate-400">{count(tab.value)}</span>
        </button>
      ))}
    </div>
  )
}
