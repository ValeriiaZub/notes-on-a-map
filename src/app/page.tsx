import { GeolocationProvider } from '@/components/providers/GeolocationProvider'
import { NoteInput } from '@/components/notes/NoteInput'
import type { Note } from '@/types/notes'

export default function Home() {
  const handleSaveNote = async (note: Note) => {
    // This will be replaced with actual Supabase integration
    console.log('Saving note:', note)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-8">Notes on a Map 📍</h1>
      <GeolocationProvider>
        <div className="w-full max-w-2xl">
          <NoteInput onSave={handleSaveNote} />
        </div>
      </GeolocationProvider>
    </main>
  )
}
