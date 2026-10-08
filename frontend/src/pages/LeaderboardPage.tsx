import { Link } from 'react-router-dom'

import { useLeaderboard, usePopularTickers } from '../api/hooks'
import type { MemberStats } from '../api/types'
import { Avatar } from '../components/Avatar'
import { Stars } from '../components/Stars'
import { rateColor } from '../lib/colors'
import { formatPct, formatPrice } from '../lib/format'

const MEDALS = ['bg-amber-400 text-white', 'bg-slate-400 text-white', 'bg-orange-400 text-white']

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank - 1]
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${medal ?? 'bg-slate-100 text-slate-600'}`}
    >
      {rank}
    </span>
  )
}

function LeaderboardTable({ members }: { members: MemberStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-slate-200 bg-slate-50/60">
          <tr>
            <th className="th w-16">Rang</th>
            <th className="th">Membre</th>
            <th className="th text-right">Taux de succès</th>
            <th className="th text-right">Réussies / clôturées</th>
            <th className="th text-right">En cours</th>
            <th className="th text-right" title="Borne basse de Wilson à 95 %">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50/70">
              <td className="td"><RankBadge rank={m.rank ?? 0} /></td>
              <td className="td">
                <Link to={`/membres/${m.id}`} className="flex items-center gap-3">
                  <Avatar name={m.display_name} color={m.avatar_color} />
                  <span>
                    <span className="block font-semibold text-blue-600 hover:underline">{m.display_name}</span>
                    <Stars value={m.stars} />
                  </span>
                </Link>
              </td>
              <td className={`td text-right text-lg font-bold ${rateColor(m.success_rate)}`}>
                {m.success_rate === null ? '—' : formatPct(m.success_rate * 100, { signed: false })}
              </td>
              <td className="td text-right font-medium">
                {m.successes} <span className="text-slate-400">/ {m.closed}</span>
              </td>
              <td className="td text-right text-slate-600">{m.open}</td>
              <td className="td text-right font-mono text-slate-600">{(m.score * 100).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PopularTickers() {
  const { data: tickers = [], isLoading } = usePopularTickers()
  return (
    <section className="card p-5">
      <h2 className="mb-3 font-bold">Tickers actifs</h2>
      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : tickers.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun ticker suivi pour l'instant. Utilise la recherche pour publier la première prédiction.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tickers.map((t) => (
            <li key={t.symbol}>
              <Link to={`/ticker/${encodeURIComponent(t.symbol)}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-blue-600">
                <span className="min-w-0">
                  <span className="block font-semibold">{t.symbol}</span>
                  <span className="block truncate text-xs text-slate-500">{t.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-medium">{formatPrice(t.last_price, t.currency)}</span>
                  <span className="block text-xs text-slate-500">
                    {t.open_predictions} en cours
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="card p-5 text-sm text-slate-600">
      <h2 className="mb-3 font-bold text-slate-900">Comment ça marche ?</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Choisis un ticker et publie un <strong>prix cible</strong> avec une <strong>date limite</strong>.</li>
        <li>Si le cours <strong>touche</strong> la cible (plus haut ou plus bas du jour) avant la date limite, c'est un succès. Sinon, c'est un échec.</li>
        <li>
          Le classement utilise un <strong>score de Wilson</strong> : un taux de succès sur beaucoup de prédictions
          pèse plus qu'un 1/1 chanceux.
        </li>
        <li>Les <strong>étoiles</strong> reflètent ta position par rapport aux autres membres classés.</li>
      </ol>
    </section>
  )
}

export function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard()

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Classement général</h1>
          <p className="mt-1 text-slate-500">Les meilleurs analystes du club, toutes prédictions confondues.</p>
        </div>

        <section className="card overflow-hidden">
          {isLoading && <p className="p-6 text-sm text-slate-400">Chargement du classement…</p>}
          {error && <p className="p-6 text-sm text-red-600">{error.message}</p>}
          {data && data.ranked.length === 0 && (
            <p className="px-6 py-12 text-center text-slate-500">
              Aucune prédiction clôturée pour l'instant.
              <br />
              Le classement apparaîtra dès que les premières prédictions seront résolues.
            </p>
          )}
          {data && data.ranked.length > 0 && <LeaderboardTable members={data.ranked} />}
        </section>

        {data && data.unranked.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">
              En attente de classement (prédictions en cours uniquement)
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.unranked.map((m) => (
                <Link
                  key={m.id}
                  to={`/membres/${m.id}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 text-sm hover:border-blue-300"
                >
                  <Avatar name={m.display_name} color={m.avatar_color} size="sm" />
                  {m.display_name}
                  <span className="text-xs text-slate-400">{m.open} en cours</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-6">
        <PopularTickers />
        <HowItWorks />
      </aside>
    </div>
  )
}
