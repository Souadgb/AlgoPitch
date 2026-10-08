import { Link, Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { LoginPage, RegisterPage, VerifyEmailPage } from './pages/AuthPages'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MemberPage } from './pages/MemberPage'
import { TickerPage } from './pages/TickerPage'

function NotFound() {
  return (
    <div className="card p-10 text-center">
      <h1 className="text-xl font-bold">Page introuvable</h1>
      <Link to="/" className="mt-3 inline-block font-semibold text-blue-600 hover:underline">Retour au classement</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LeaderboardPage />} />
        <Route path="ticker/:symbol" element={<TickerPage />} />
        <Route path="membres/:id" element={<MemberPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="verification" element={<VerifyEmailPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
