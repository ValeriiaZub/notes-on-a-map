'use client'
import { useState, useEffect } from 'react'
import { GeolocationProvider } from '@/components/providers/GeolocationProvider'
import { NoteInput } from '@/components/notes/NoteInput'
import { NotePreview } from '@/components/notes/NotePreview'
import { AuthForm } from '@/components/auth/AuthForm'
import type { Note } from '@/types/notes'
import { authService } from '@/lib/services/AuthService'
import { useNoteSync } from '@/hooks/useNoteSync'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'

// Import type for MapView component
import type { MapView as MapViewType } from '@/components/map/MapView'

const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => {
    const { MapView } = mod
    return MapView
  }),
  { ssr: false }
)

export default function Home() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { notes, createNote } = useNoteSync()

  useEffect(() => {
    // Check authentication status on mount
    authService.getCurrentUser().then(user => {
      setIsAuthenticated(!!user)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange((session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSaveNote = async (note: Note) => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to save notes')
      return
    }

    try {
      await createNote(note)
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Notes on a Map 📍</h1>
          {isAuthenticated && (
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          )}
        </div>
        
        <GeolocationProvider>
          {!isAuthenticated ? (
            <AuthForm onAuthSuccess={() => setIsAuthenticated(true)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-8">
                <NoteInput onSave={handleSaveNote} />
                {selectedNote && (
                  <NotePreview
                    note={selectedNote}
                    onClose={() => setSelectedNote(null)}
                  />
                )}
              </div>
              <MapView
                notes={notes}
                onNoteSelect={setSelectedNote}
                className="h-[500px] lg:h-full"
              />
            </div>
          )}
        </GeolocationProvider>
      </div>
    </main>
  )
}
