import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { AuthError, User, Session } from '@supabase/supabase-js'

export class AuthService {
  private supabase = createClientComponentClient()

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { session }, error } = await this.supabase.auth.getSession()
    if (error) throw error
    return session?.user ?? null
  }

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await this.supabase.auth.getSession()
    if (error) throw error
    return session
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
  }
}

// Create a singleton instance
export const authService = new AuthService()
