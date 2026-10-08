import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useLogout, useMe } from '../api/hooks'
import { Avatar } from './Avatar'
import { TickerSearch } from './TickerSearch'

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      Algo<span className="text-blue-600">Pitch</span>
    </Link>
  )
}

function UserMenu() {
  const navigate = useNavigate()
  const { data: me, isLoading } = useMe()
  const logout = useLogout()

  if (isLoading) return <div className="h-9 w-32" />
  if (!me) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link to="/connexion" className="btn btn-secondary">Connexion</Link>
        <Link to="/inscription" className="btn btn-primary">Inscription</Link>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link to={`/membres/${me.id}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600">
        <Avatar name={me.display_name} color={me.avatar_color} size="sm" />
        <span className="hidden sm:inline">{me.display_name}</span>
      </Link>
      {me.is_staff && (
        <a href="/admin/" className="hidden text-sm text-slate-500 hover:text-slate-900 md:inline">Admin</a>
      )}
      <button
        type="button"
        className="text-sm text-slate-500 hover:text-slate-900"
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}
      >
        Déconnexion
      </button>
    </div>
  )
}

export function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-4">
            <NavLink to="/" end className={navClass}>Classement</NavLink>
          </nav>
          <div className="order-last flex w-full justify-center md:order-none md:w-auto md:flex-1">
            <TickerSearch />
          </div>
          <div className="ml-auto md:ml-0">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
        AlgoPitch — club étudiant ÉTS. Données de marché fournies à titre indicatif, sans valeur de conseil financier.
      </footer>
    </div>
  )
}
