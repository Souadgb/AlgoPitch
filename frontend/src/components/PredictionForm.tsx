import { type FormEvent, useState } from 'react'

import { ApiError } from '../api/client'
import { useCreatePrediction } from '../api/hooks'
import type { Ticker } from '../api/types'
import { addDays, formatDate, formatPct, formatPrice, toIsoDate } from '../lib/format'
import { MAX_HORIZON_DAYS, MIN_HORIZON_DAYS, MIN_TARGET_GAP_PCT, THESIS_MAX_LENGTH } from '../lib/rules'
import { pctColor } from '../lib/colors'
import { DirectionBadge } from './Badges'

const TARGET_PRESETS = [-20, -10, 10, 20, 30]
const DEADLINE_PRESETS = [
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 91 },
  { label: '6 mois', days: 182 },
  { label: '1 an', days: 365 },
]

function roundPrice(value: number): string {
  return value < 1 ? value.toPrecision(4) : value.toFixed(2)
}

export function PredictionForm({ ticker, onDone }: { ticker: Ticker; onDone: () => void }) {
  const createPrediction = useCreatePrediction()
  const [today] = useState(() => new Date())
  const minDate = toIsoDate(addDays(today, MIN_HORIZON_DAYS))
  const maxDate = toIsoDate(addDays(today, MAX_HORIZON_DAYS))

  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState(toIsoDate(addDays(today, 91)))
  const [thesis, setThesis] = useState('')

  const price = Number(ticker.last_price)
  const targetValue = Number(target.replace(',', '.'))
  const hasTarget = target !== '' && targetValue > 0
  const changePct = hasTarget && price ? ((targetValue - price) / price) * 100 : null
  const gapOk = changePct !== null && Math.abs(changePct) >= MIN_TARGET_GAP_PCT
  const deadlineOk = deadline >= minDate && deadline <= maxDate

  const serverErrors = createPrediction.error instanceof ApiError ? createPrediction.error.fieldErrors() : {}
  const generalError =
    createPrediction.error && !serverErrors.target_price && !serverErrors.deadline && !serverErrors.thesis
      ? createPrediction.error.message
      : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    createPrediction.mutate(
      { ticker: ticker.symbol, target_price: String(targetValue), deadline, thesis: thesis.trim() },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Nouvelle prédiction sur {ticker.symbol}</h2>
        <span className="text-sm text-slate-500">
          Cours actuel : <strong className="text-slate-900">{formatPrice(ticker.last_price, ticker.currency)}</strong>
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="target">Prix cible ({ticker.currency})</label>
          <input
            id="target"
            className="input text-lg font-semibold"
            inputMode="decimal"
            placeholder={price ? roundPrice(price * 1.15) : ''}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TARGET_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${pct > 0 ? 'text-teal-700 ring-teal-200 hover:bg-teal-50' : 'text-red-700 ring-red-200 hover:bg-red-50'}`}
                onClick={() => setTarget(roundPrice(price * (1 + pct / 100)))}
              >
                {pct > 0 ? '+' : ''}{pct} %
              </button>
            ))}
          </div>
          {serverErrors.target_price && <p className="field-error">{serverErrors.target_price}</p>}
        </div>

        <div>
          <label className="label" htmlFor="deadline">Date limite</label>
          <input
            id="deadline"
            type="date"
            className="input text-lg font-semibold"
            min={minDate}
            max={maxDate}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEADLINE_PRESETS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                className="rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50"
                onClick={() => setDeadline(toIsoDate(addDays(today, days)))}
              >
                {label}
              </button>
            ))}
          </div>
          {serverErrors.deadline && <p className="field-error">{serverErrors.deadline}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        {changePct !== null ? (
          <>
            <DirectionBadge direction={changePct >= 0 ? 'up' : 'down'} />
            <span>
              Variation visée : <strong className={pctColor(changePct)}>{formatPct(changePct)}</strong>
            </span>
            {deadlineOk && (
              <span className="text-slate-500">
                Succès si le cours touche {formatPrice(targetValue, ticker.currency)} avant le {formatDate(deadline)}
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-500">Indique un prix cible pour voir la variation visée.</span>
        )}
        {changePct !== null && !gapOk && (
          <span className="font-medium text-red-600">Écart minimum : ±{MIN_TARGET_GAP_PCT} % du cours actuel.</span>
        )}
        {!deadlineOk && (
          <span className="font-medium text-red-600">
            Horizon : entre {MIN_HORIZON_DAYS} jours et {MAX_HORIZON_DAYS} jours.
          </span>
        )}
      </div>

      <div>
        <label className="label" htmlFor="thesis">
          Thèse <span className="font-normal text-slate-400">(optionnel)</span>
        </label>
        <textarea
          id="thesis"
          className="input min-h-32 resize-y"
          placeholder="Pourquoi ce prix cible ? Catalyseurs, valorisation, risques…"
          maxLength={THESIS_MAX_LENGTH}
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
        />
        <div className="mt-1 text-right text-xs text-slate-400">{thesis.length} / {THESIS_MAX_LENGTH}</div>
        {serverErrors.thesis && <p className="field-error">{serverErrors.thesis}</p>}
      </div>

      {generalError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{generalError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          ⚠️ Une fois publiée, ta prédiction ne pourra plus être modifiée ni supprimée.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={onDone}>Annuler</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!gapOk || !deadlineOk || createPrediction.isPending}
          >
            {createPrediction.isPending ? 'Publication…' : 'Publier la prédiction'}
          </button>
        </div>
      </div>
    </form>
  )
}
