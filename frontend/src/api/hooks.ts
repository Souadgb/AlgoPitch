import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { api } from './client'
import type {
  Leaderboard,
  Me,
  MemberProfile,
  NewPrediction,
  PopularTicker,
  Prediction,
  PredictionStatus,
  SearchResult,
  Ticker,
} from './types'

// --- Authentification ---------------------------------------------------------

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me | null>('/auth/me/'), staleTime: Infinity })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api<Me>('/auth/login/', { method: 'POST', body }),
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout/', { method: 'POST' }),
    onSuccess: () => queryClient.setQueryData(['me'], null),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { email: string; display_name: string; password: string }) =>
      api<{ detail: string }>('/auth/register/', { method: 'POST', body }),
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => api<Me>('/auth/verify/', { method: 'POST', body: { token } }),
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ detail: string }>('/auth/resend-verification/', { method: 'POST', body: { email } }),
  })
}

// --- Tickers ------------------------------------------------------------------

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useTickerSearch(query: string) {
  const q = useDebounced(query.trim())
  return useQuery({
    queryKey: ['ticker-search', q.toLowerCase()],
    queryFn: () => api<SearchResult[]>(`/tickers/search/?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
    staleTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
}

export function useTicker(symbol: string) {
  return useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => api<Ticker>(`/tickers/${encodeURIComponent(symbol)}/`),
    retry: false,
  })
}

export function usePopularTickers() {
  return useQuery({ queryKey: ['popular-tickers'], queryFn: () => api<PopularTicker[]>('/tickers/popular/') })
}

// --- Prédictions et classement -----------------------------------------------

export function usePredictions(filters: { ticker?: string; user?: number; status?: PredictionStatus }) {
  const params = new URLSearchParams()
  if (filters.ticker) params.set('ticker', filters.ticker)
  if (filters.user) params.set('user', String(filters.user))
  if (filters.status) params.set('status', filters.status)
  return useQuery({
    queryKey: ['predictions', filters],
    queryFn: () => api<Prediction[]>(`/predictions/?${params}`),
  })
}

export function useCreatePrediction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NewPrediction) => api<Prediction>('/predictions/', { method: 'POST', body }),
    onSuccess: () => {
      for (const key of ['predictions', 'leaderboard', 'popular-tickers', 'member', 'ticker']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export function useLeaderboard() {
  return useQuery({ queryKey: ['leaderboard'], queryFn: () => api<Leaderboard>('/leaderboard/') })
}

export function useMember(id: number) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => api<MemberProfile>(`/members/${id}/`),
    retry: false,
  })
}
