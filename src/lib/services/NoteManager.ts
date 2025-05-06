'use client'

import type { Note } from '@/types/notes'
import { z } from 'zod'
import { createClient } from '../utils/supabase/client'

const noteSchema = z.object({
  content: z.string().min(1).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  sync_status: z.enum(['synced', 'pending', 'conflict']).default('synced'),
  version: z.number().int().positive().default(1),
  user_id: z.string().uuid(),
  id: z.string().uuid().optional()
})

export class NoteManager {
  private realtimeSubscription: (() => void) | null = null

  async createNote(note: Omit<Note, 'id'>): Promise<Note> {
    // Get current user
    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Validate note data
    const validatedNote = noteSchema.parse({
      ...note,
      user_id: (user.user as any).id as string,
    })

    // Insert note into Supabase
    const { data, error } = await supabase
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
    const supabase = createClient()
    const validatedNote = noteSchema.parse(note)

    // Update note in Supabase
    const { data, error } = await supabase
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
    const supabase = createClient()

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`)
    }
  }

  async getNotes(): Promise<Note[]> {
    // Get current user
    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', (user.user as any).id) // Explicitly filter by user_id
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    return data || []
  }

  subscribeToNotes(callback: (notes: Note[]) => void): () => void {
    // Clean up any existing subscription
    const supabase = createClient()

    if (this.realtimeSubscription) {
      this.realtimeSubscription()
    }

    // Subscribe to note changes
    const subscription = supabase
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