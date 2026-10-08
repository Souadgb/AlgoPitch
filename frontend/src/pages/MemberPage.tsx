import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { useMember, usePredictions } from '../api/hooks'
import type { PredictionStatus } from '../api/types'
import { Avatar } from '../components/Avatar'
import { PredictionTable } from '../components/PredictionTable'
import { Stars } from '../components/Stars'
import { StatusTabs } from '../components/StatusTabs'
import { rateColor } from '../lib/colors'
import { formatDate, formatPct } from '../lib/format'

export function MemberPage() {
  const id = Number(useParams().id)
  const { data: member, isLoading, error } = useMember(id)
  const { data: predictions = [] } = usePredictions({ user: id })
  const [status, setStatus] = useState<PredictionStatus | 'all'>('all')

  if (isLoading) return <p className="text-slate-400">Chargement du profil…</p>
  if (error || !member) {
    return <div className="card p-10 text-center font-semibold">Membre introuvable.</div>
  }

  const stats = [
    {
      label: 'Taux de succès',
      value: member.success_rate === null ? '—' : formatPct(member.success_rate * 100, { signed: false }),
      className: rateColor(member.success_rate),
    },
    { label: 'Réussies', value: member.successes, className: 'text-emerald-600' },
    { label: 'Échouées', value: member.failures, className: 'text-red-600' },
    { label: 'En cours', value: member.open, className: 'text-blue-600' },
    { label: 'Score', value: (member.score * 100).toFixed(1), className: 'text-slate-900' },
  ]
  const visible = status === 'all' ? predictions : predictions.filter((p) => p.status === status)

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center gap-6 p-6">
        <Avatar name={member.display_name} color={member.avatar_color} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{member.display_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Stars value={member.stars} size={20} />
            <span className="text-sm text-slate-500">
              {member.rank ? (
                <>Rang <strong className="text-slate-900">#{member.rank}</strong> sur {member.ranked_count}</>
              ) : (
                'Pas encore classé'
              )}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Membre depuis le {formatDate(member.date_joined)}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-2xl font-bold ${s.className}`}>{s.value}</div>
            <div className="mt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold">Historique des prédictions</h2>
          <StatusTabs value={status} onChange={setStatus} predictions={predictions} />
        </div>
        <PredictionTable predictions={visible} mode="member" />
      </section>
    </div>
  )
}
