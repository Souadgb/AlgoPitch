import { type KeyboardEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTickerSearch } from '../api/hooks'
import { assetTypeLabel } from '../lib/format'

export function TickerSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const { data: results = [], isFetching } = useTickerSearch(query)

  const go = (symbol: string) => {
    setQuery('')
    setOpen(false)
    navigate(`/ticker/${encodeURIComponent(symbol.trim().toUpperCase())}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (event.key === 'Enter' && query.trim()) {
      event.preventDefault()
      go(results[highlight]?.symbol ?? query)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div className="relative w-full max-w-md">
      <svg
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5L17 17" strokeLinecap="round" />
      </svg>
      <input
        className="input pl-9"
        placeholder="Rechercher un ticker (NVDA, Airbus, BTC-USD…)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        aria-label="Rechercher un ticker"
      />
      {showDropdown && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((r, i) => (
            <li key={r.symbol}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${i === highlight ? 'bg-blue-50' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(r.symbol)}
              >
                <span className="w-20 shrink-0 font-semibold text-slate-900">{r.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{r.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {assetTypeLabel(r.asset_type)} · {r.exchange}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {isFetching ? 'Recherche…' : (
                <>Entrée pour ouvrir <strong>{query.trim().toUpperCase()}</strong></>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
