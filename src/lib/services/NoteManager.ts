'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Note } from '@/types/notes'
import { z } from 'zod'

const noteSchema = z.object({
  content: z.string().min(1).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  sync_status: z.enum(['synced', 'pending', 'conflict']).default('synced'),
  version: z.number().int().positive().default(1),
  user_id: z.string().uuid(),
  id: z.string().uuid().optional()
})

export class NoteManager {
  private supabase = createClientComponentClient()
  private realtimeSubscription: (() => void) | null = null

  private async getCurrentUser() {
    const { data: { session }, error } = await this.supabase.auth.getSession()
    if (error || !session?.user) {
      throw new Error('User not authenticated')
    }
    return session.user
  }

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    // Get current user
    const user = await this.getCurrentUser()

    // Validate note data
    const validatedNote = noteSchema.parse({
      ...note,
      user_id: user.id // Explicitly set user_id
    })

    // Insert note into Supabase
    const { data, error } = await this.supabase
      .from('notes')
      .insert([validatedNote])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`)
    }

    return data
  }

  async updateNote(note: Note): Promise<Note> {
    // Validate note data
    const validatedNote = noteSchema.parse(note)

    // Update note in Supabase
    const { data, error } = await this.supabase
      .from('notes')
      .update({
        ...validatedNote,
        updated_at: new Date().toISOString(),
        version: note.version ? note.version + 1 : 1,
      })
      .eq('id', note.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`)
    }

    return data
  }

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`)
    }
  }

  async getNotes(): Promise<Note[]> {
    // Get current user
    const user = await this.getCurrentUser()

    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id) // Explicitly filter by user_id
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    return data || []
  }

  subscribeToNotes(callback: (notes: Note[]) => void): () => void {
    // Clean up any existing subscription
    if (this.realtimeSubscription) {
      this.realtimeSubscription()
    }

    // Subscribe to note changes
    const subscription = this.supabase
      .channel('notes_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        async () => {
          // Fetch latest notes when changes occur
          const notes = await this.getNotes()
          callback(notes)
        }
      )
      .subscribe()

    // Store cleanup function
    this.realtimeSubscription = () => {
      subscription.unsubscribe()
    }

    return this.realtimeSubscription
  }
} 