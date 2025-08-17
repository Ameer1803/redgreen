// supabase.js
import { createClient } from '@supabase/supabase-js'

// Env vars from .env (Vite expects them prefixed with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Insert a new score
export async function saveScore(name, timeMs) {
  const { error } = await supabase
    .from('rgl')
    .insert([{ player_name: name, time_ms: timeMs }])

  if (error) console.error('Insert error:', error)
}

// Get top 5 scores
export async function getTop5() {
  const { data, error } = await supabase
    .from('rgl')
    .select('player_name, time_ms')
    .order('time_ms', { ascending: true })
    .limit(5)

  if (error) {
    console.error('Select error:', error)
    return []
  }
  return data
}
