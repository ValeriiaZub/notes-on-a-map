import { useState } from 'react'
import { GeolocationProvider } from '@/components/providers/GeolocationProvider'
import { NoteInput } from '@/components/notes/NoteInput'
import { NotePreview } from '@/components/notes/NotePreview'
import { MapView } from '@/components/map/MapView'
import type { Note } from '@/types/notes'

export default function Home() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  const handleSaveNote = async (note: Note) => {
    // This will be replaced with actual Supabase integration
    const newNote = {
      ...note,
      id: Math.random().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setNotes((prev) => [...prev, newNote])
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-8">Notes on a Map 📍</h1>
      <GeolocationProvider>
        <div className="w-full max-w-6xl flex flex-col gap-8">
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
        </div>
      </GeolocationProvider>
    </main>
  )
}
