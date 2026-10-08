import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '../api/client'
import { useLogin, useRegister, useResendVerification, useVerifyEmail } from '../api/hooks'
import { SCHOOL_EMAIL_DOMAIN } from '../lib/rules'

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string | null | undefined }) {
  return message ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null
}

function ResendLink({ email }: { email: string }) {
  const resend = useResendVerification()
  if (resend.isSuccess) return <p className="text-sm text-emerald-700">{resend.data.detail}</p>
  return (
    <button
      type="button"
      className="text-sm font-semibold text-blue-600 hover:underline"
      disabled={resend.isPending}
      onClick={() => resend.mutate(email)}
    >
      Renvoyer le lien de vérification
    </button>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const notVerified = login.error instanceof ApiError && login.error.code === 'email_not_verified'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate('/') })
  }

  return (
    <AuthCard
      title="Connexion"
      subtitle={<>Pas encore de compte ? <Link to="/inscription" className="font-semibold text-blue-600 hover:underline">Inscris-toi</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Adresse e-mail</label>
          <input id="email" type="email" className="input" autoComplete="email" required
            placeholder={`prenom.nom@${SCHOOL_EMAIL_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" type="password" className="input" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorBox message={login.error?.message} />
        {notVerified && <ResendLink email={email} />}
        <button type="submit" className="btn btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthCard>
  )
}

export function RegisterPage() {
  const register = useRegister()
  const [form, setForm] = useState({ email: '', display_name: '', password: '' })
  const errors = register.error instanceof ApiError ? register.error.fieldErrors() : {}
  const set = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  if (register.isSuccess) {
    return (
      <AuthCard title="Vérifie ta boîte mail 📬">
        <p className="text-sm text-slate-600">
          Un lien de confirmation a été envoyé à <strong>{form.email}</strong>. Clique dessus pour activer ton compte.
        </p>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          En développement local, l'e-mail n'est pas réellement envoyé : le lien s'affiche dans la console du
          serveur Django.
        </p>
        <div className="mt-4"><ResendLink email={form.email} /></div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Rejoindre AlgoPitch"
      subtitle={<>Réservé aux membres du club avec une adresse @{SCHOOL_EMAIL_DOMAIN}.</>}
    >
      <form onSubmit={(e) => { e.preventDefault(); register.mutate(form) }} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Adresse e-mail de l'école</label>
          <input id="email" type="email" className="input" autoComplete="email" required
            placeholder={`prenom.nom@${SCHOOL_EMAIL_DOMAIN}`} value={form.email} onChange={set('email')} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="display_name">Pseudo</label>
          <input id="display_name" className="input" required minLength={3} maxLength={30}
            value={form.display_name} onChange={set('display_name')} />
          {errors.display_name && <p className="field-error">{errors.display_name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" type="password" className="input" autoComplete="new-password" required minLength={8}
            value={form.password} onChange={set('password')} />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <ErrorBox message={register.error && Object.keys(errors).length === 0 ? register.error.message : null} />
        <button type="submit" className="btn btn-primary w-full" disabled={register.isPending}>
          {register.isPending ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Déjà inscrit ? <Link to="/connexion" className="font-semibold text-blue-600 hover:underline">Connecte-toi</Link>
        </p>
      </form>
    </AuthCard>
  )
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const verify = useVerifyEmail()
  const sent = useRef(false)

  useEffect(() => {
    // StrictMode exécute les effets deux fois en développement : on n'envoie le jeton qu'une fois
    if (!token || sent.current) return
    sent.current = true
    verify.mutate(token, { onSuccess: () => setTimeout(() => navigate('/'), 1500) })
  }, [token, verify, navigate])

  return (
    <AuthCard title="Vérification de l'adresse e-mail">
      {!token && <ErrorBox message="Lien de vérification incomplet." />}
      {verify.isPending && <p className="text-sm text-slate-500">Vérification en cours…</p>}
      {verify.isSuccess && (
        <p className="text-sm text-emerald-700">
          Adresse confirmée, bienvenue {verify.data.display_name} ! Redirection…
        </p>
      )}
      {verify.isError && (
        <div className="space-y-3">
          <ErrorBox message={verify.error.message} />
          <Link to="/connexion" className="text-sm font-semibold text-blue-600 hover:underline">
            Retour à la connexion
          </Link>
        </div>
      )}
    </AuthCard>
  )
}
