import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Prediction } from '../api/types'
import { formatDate, formatPct, formatPrice } from '../lib/format'
import { Avatar } from './Avatar'
import { pctColor } from '../lib/colors'
import { DirectionBadge, StatusBadge } from './Badges'
import { Stars } from './Stars'

type Props = {
  predictions: Prediction[]
  /** « ticker » : page d'un ticker (colonne membre) ; « member » : page profil (colonne ticker). */
  mode: 'ticker' | 'member'
}

function Potential({ prediction }: { prediction: Prediction }) {
  const open = prediction.status === 'open'
  const value = open ? prediction.remaining_change_pct : prediction.target_change_pct
  return (
    <div className={`font-semibold ${pctColor(value)}`}>
      {formatPct(value)}
      <div className="text-xs font-normal text-slate-400">{open ? 'restant' : 'visé'}</div>
    </div>
  )
}

export function PredictionTable({ predictions, mode }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const columns = 8

  if (predictions.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune prédiction pour le moment.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-slate-200 bg-slate-50/60">
          <tr>
            <th className="th">{mode === 'ticker' ? 'Membre' : 'Ticker'}</th>
            <th className="th text-right">Prix cible</th>
            <th className="th">Sens</th>
            <th className="th text-right">Potentiel</th>
            <th className="th">Date limite</th>
            <th className="th">Statut</th>
            <th className="th">Publiée le</th>
            <th className="th text-center">Thèse</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {predictions.map((p) => {
            const currency = p.ticker.currency
            const isExpanded = expanded === p.id
            return (
              <Fragment key={p.id}>
                <tr className="hover:bg-slate-50/70">
                  <td className="td">
                    {mode === 'ticker' ? (
                      <Link to={`/membres/${p.user.id}`} className="flex items-center gap-3">
                        <Avatar name={p.user.display_name} color={p.user.avatar_color} />
                        <span>
                          <span className="block font-semibold text-blue-600 hover:underline">{p.user.display_name}</span>
                          <Stars value={p.user.stars} />
                        </span>
                      </Link>
                    ) : (
                      <Link to={`/ticker/${encodeURIComponent(p.ticker.symbol)}`} className="block">
                        <span className="block font-semibold text-blue-600 hover:underline">{p.ticker.symbol}</span>
                        <span className="block max-w-48 truncate text-xs text-slate-500">{p.ticker.name}</span>
                      </Link>
                    )}
                  </td>
                  <td className="td text-right">
                    <div className="font-bold">{formatPrice(p.target_price, currency)}</div>
                    <div className="text-xs text-slate-400">départ {formatPrice(p.entry_price, currency)}</div>
                  </td>
                  <td className="td"><DirectionBadge direction={p.direction} /></td>
                  <td className="td text-right"><Potential prediction={p} /></td>
                  <td className="td font-medium whitespace-nowrap">{formatDate(p.deadline)}</td>
                  <td className="td">
                    <StatusBadge status={p.status} />
                    {p.hit_date && <div className="mt-1 text-xs text-slate-400">le {formatDate(p.hit_date)}</div>}
                  </td>
                  <td className="td whitespace-nowrap text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="td text-center">
                    {p.thesis ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                        className={`rounded-lg p-1.5 transition ${isExpanded ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                        aria-expanded={isExpanded}
                        aria-label="Afficher la thèse"
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <path d="M7 8h4v4H7zM14 8h3M14 12h3M7 16h10" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-blue-50/40">
                    <td colSpan={columns} className="px-6 py-4">
                      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Thèse de {p.user.display_name}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{p.thesis}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
