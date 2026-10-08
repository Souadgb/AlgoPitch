export type Me = {
  id: number
  email: string
  display_name: string
  avatar_color: string
  is_staff: boolean
}

export type Ticker = {
  symbol: string
  name: string
  exchange: string
  currency: string
  asset_type: string
  last_price: string | null
  last_price_at: string | null
}

export type PopularTicker = Ticker & {
  open_predictions: number
  total_predictions: number
}

export type SearchResult = {
  symbol: string
  name: string
  exchange: string
  asset_type: string
}

export type Direction = 'up' | 'down'
export type PredictionStatus = 'open' | 'success' | 'failed'

export type Prediction = {
  id: number
  user: { id: number; display_name: string; avatar_color: string; stars: number | null }
  ticker: { symbol: string; name: string; currency: string; last_price: string | null }
  direction: Direction
  entry_price: string
  target_price: string
  target_change_pct: number
  remaining_change_pct: number | null
  deadline: string
  thesis: string
  status: PredictionStatus
  hit_date: string | null
  resolved_at: string | null
  created_at: string
}

export type MemberStats = {
  id: number
  display_name: string
  avatar_color: string
  rank: number | null
  stars: number | null
  successes: number
  failures: number
  closed: number
  open: number
  success_rate: number | null
  score: number
}

export type Leaderboard = {
  ranked: MemberStats[]
  unranked: MemberStats[]
}

export type MemberProfile = MemberStats & {
  date_joined: string
  ranked_count: number
}

export type NewPrediction = {
  ticker: string
  target_price: string
  deadline: string
  thesis: string
}
