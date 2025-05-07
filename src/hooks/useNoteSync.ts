'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Note } from '@/types/notes'
import { NoteManager } from '@/lib/services/NoteManager'
import { createClient } from '@/lib/utils/supabase/client'

// Initialize services
const noteManager = new NoteManager()

export function useNoteSync(isAuthenticated: boolean) { // Accept isAuthenticated as an argument
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch notes - only enable when authenticated
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    enabled: isAuthenticated, // Only run the query if the user is authenticated
    queryFn: async () => {
      console.log('[useNoteSync] Fetching notes, isAuthenticated:', isAuthenticated);
      // Since the query is only enabled when authenticated, noteManager.getNotes() should succeed
      // unless there's a network error or other issue.
      // The try/catch for auth errors is less critical here, but can be kept for network errors.
      try {
        // Get notes from Supabase
        console.log('[useNoteSync] Calling noteManager.getNotes()');
        const notes = await noteManager.getNotes()
        
        // Store notes locally
        console.log('[useNoteSync] Saving notes to local storage');
        return notes
      } catch (fetchError) {
        // Handle potential network errors or other issues during fetch
        console.warn('[useNoteSync] Failed to fetch notes from server, trying local:', fetchError)
        // Fallback to local notes if server fetch fails despite being authenticated (e.g., offline)
        console.log('[useNoteSync] Falling back to local notes');
        return [];
      }
    },
    // Add staleTime to prevent frequent refetching
    staleTime: 10000, // 10 seconds
    // Add refetchInterval to periodically check for updates
    // refetchInterval: 5000, // 5 seconds
    // Add retry to handle transient failures
    retry: 3,
    // Add refetchOnWindowFocus to update when the user returns to the app
    refetchOnWindowFocus: true,
  })

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (note: Omit<Note, 'id'>) => {
      
      try {
        // Try to create note in Supabase
        const newNote = await noteManager.createNote(note)
        // Store note locally
        return newNote
      } catch (createError) {
        console.error(createError)
      }
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Update note mutation
  const updateNote = useMutation({
    mutationFn: async (note: Note) => {

      console.log('[useNoteSync] Updating note:', note)
      
      try {
        delete note.created_at
        delete note.updated_at
        // Try to update note in Supabase
        const updatedNote = await noteManager.updateNote(note)
        
        // Update note locally
        return updatedNote
      } catch (error) {
        console.warn('[useNoteSync] Failed to update note in Supabase, falling back to local:', error)
        // If offline, update locally and queue for sync
        const pendingNote = {
          ...note,
          sync_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        }
        return pendingNote
      }
    },
    onSuccess: (updatedNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      try {
        // Try to delete note from Supabase
        await noteManager.deleteNote(noteId)
        
        // Remove note locally - using the proper method now
      } catch (error) {
        // If offline, queue for deletion
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Function to add a temporary note for immediate UI feedback
  const addTemporaryNote = useCallback((latitude: number, longitude: number) => {
    const tempId = `temp-${crypto.randomUUID()}`; // Use a prefix for clarity
    const now = new Date().toISOString();
    const tempNote: Note = {
      id: tempId,
      content: '', // Start with empty content
      latitude,
      longitude,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      startInEditMode: true, // Set the flag
    };

    console.log('[useNoteSync] Created temporary note object:', tempNote);

    // Optimistically update the local cache
    queryClient.setQueryData<Note[]>(['notes'], (oldNotes = []) => {
      console.log('[useNoteSync] Optimistically adding temporary note to cache');
      return [...oldNotes, tempNote];
    });

    // Optionally, you could return the tempId or tempNote if needed
    return tempNote;

  }, [queryClient]);


  // // Sync function
  // const sync = useCallback(async () => {
  //   try {
  //     await syncManager.sync()
  //     setSyncStatus(syncManager.getSyncStatus())
  //     // Refresh notes after sync
  //     queryClient.invalidateQueries({ queryKey: ['notes'] })
  //   } catch (error) {
  //     console.error('Sync failed:', error)
  //     setSyncStatus(syncManager.getSyncStatus())
  //   }
  // }, [queryClient])

  // // Auto-sync when online
  // useEffect(() => {
  //   const handleOnline = () => {
  //     sync()
  //   }

  //   window.addEventListener('online', handleOnline)
  //   return () => {
  //     window.removeEventListener('online', handleOnline)
  //   }
  // }, [sync])

  return {
    notes,
    isLoading,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    addTemporaryNote, // Expose the new function
    // sync,
  }
}