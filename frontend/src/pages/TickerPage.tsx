import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useMe, usePredictions, useTicker } from '../api/hooks'
import type { Prediction, PredictionStatus, Ticker } from '../api/types'
import { PredictionForm } from '../components/PredictionForm'
import { PredictionTable } from '../components/PredictionTable'
import { StatusTabs } from '../components/StatusTabs'
import { pctColor } from '../lib/colors'
import { assetTypeLabel, formatDateTime, formatPct, formatPrice } from '../lib/format'

function Summary({ ticker, predictions }: { ticker: Ticker; predictions: Prediction[] }) {
  const open = predictions.filter((p) => p.status === 'open')
  const targets = open.map((p) => Number(p.target_price))
  const average = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null
  const price = Number(ticker.last_price)
  const averagePct = average !== null && price ? ((average - price) / price) * 100 : null
  const ups = open.filter((p) => p.direction === 'up').length

  const items = [
    { label: 'Prédictions en cours', value: String(open.length) },
    {
      label: 'Prix cible moyen',
      value: average === null ? '—' : formatPrice(average, ticker.currency),
      sub: averagePct === null ? null : <span className={pctColor(averagePct)}>{formatPct(averagePct)}</span>,
    },
    {
      label: 'Fourchette',
      value: targets.length
        ? `${formatPrice(Math.min(...targets), ticker.currency)} – ${formatPrice(Math.max(...targets), ticker.currency)}`
        : '—',
    },
    {
      label: 'Sentiment',
      value: open.length ? `${ups} hausse · ${open.length - ups} baisse` : '—',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{item.label}</div>
          <div className="mt-1 text-lg font-bold">{item.value}</div>
          {item.sub && <div className="text-sm font-semibold">{item.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function TickerPage() {
  const symbol = decodeURIComponent(useParams().symbol ?? '').toUpperCase()
  const { data: me } = useMe()
  const { data: ticker, isLoading, error } = useTicker(symbol)
  const { data: predictions = [] } = usePredictions({ ticker: symbol })
  const [status, setStatus] = useState<PredictionStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <p className="text-slate-400">Chargement de {symbol}…</p>
  if (error || !ticker) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-bold">Ticker « {symbol} » introuvable</h1>
        <p className="mt-2 text-slate-500">Vérifie le symbole (ex. NVDA, AIR.PA, BTC-USD) ou utilise la recherche.</p>
      </div>
    )
  }

  const hasOpenPrediction = !!me && predictions.some((p) => p.user.id === me.id && p.status === 'open')
  const visible = status === 'all' ? predictions : predictions.filter((p) => p.status === status)

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-end justify-between gap-6 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{ticker.symbol}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {assetTypeLabel(ticker.asset_type)}
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            {ticker.name} {ticker.exchange && <span className="text-slate-400">· {ticker.exchange}</span>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatPrice(ticker.last_price, ticker.currency)}</div>
          <div className="text-xs text-slate-400">Mis à jour {formatDateTime(ticker.last_price_at)}</div>
        </div>
      </section>

      <Summary ticker={ticker} predictions={predictions} />

      {showForm ? (
        <PredictionForm ticker={ticker} onDone={() => setShowForm(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!me ? (
            <p className="text-sm text-slate-600">
              <Link to="/connexion" className="font-semibold text-blue-600 hover:underline">Connecte-toi</Link> pour
              publier une prédiction sur {ticker.symbol}.
            </p>
          ) : hasOpenPrediction ? (
            <p className="text-sm text-slate-500">
              Tu as déjà une prédiction en cours sur {ticker.symbol}. Tu pourras en publier une nouvelle une fois
              celle-ci clôturée.
            </p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Nouvelle prédiction
            </button>
          )}
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold">Prédictions des membres</h2>
          <StatusTabs value={status} onChange={setStatus} predictions={predictions} />
        </div>
        <PredictionTable predictions={visible} mode="ticker" />
      </section>
    </div>
  )
}
