'use client'
import { useState, useEffect, useRef } from 'react' // Added useRef
import { GeolocationProvider } from '@/components/providers/GeolocationProvider'
import { NoteInput } from '@/components/notes/NoteInput'
import { NotePreview } from '@/components/notes/NotePreview'
import { AuthForm } from '@/components/auth/AuthForm'
import type { Note } from '@/types/notes'
import { authService } from '@/lib/services/AuthService'
import { useNoteSync } from '@/hooks/useNoteSync'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import type { LatLng } from 'leaflet'

// Import type for MapView component
import type { MapViewHandle } from '@/components/map/MapView' // Import the handle type
// Placeholder for ListView import
// import ListView from '@/components/notes/ListView'

const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => mod.MapView),
  { ssr: false }
)

// Dynamic ListView import using default export
const ListView = dynamic(
  () => import('@/components/notes/ListView'), // Use default export
  { ssr: false, loading: () => <p>Loading list...</p> } // Add loading state
)


export default function Home() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map') // State for view mode
  const [isTransitioning, setIsTransitioning] = useState(false); // State for animation
  const { notes, createNote, updateNote } = useNoteSync()
  const mapRef = useRef<MapViewHandle | null>(null); // Use the imported MapViewHandle type for the ref
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for timeout

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

  const handleNotePositionChange = async (note: Note, newPosition: LatLng) => {
    if (!isAuthenticated) {
      console.error('User must be authenticated to update notes')
      return
    }

    try {
      await updateNote({
        ...note,
        latitude: newPosition.lat,
        longitude: newPosition.lng
      })
    } catch (error) {
      console.error('Failed to update note position:', error)
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
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 relative"> {/* Added relative positioning for button */}
      <div className="w-full max-w-6xl flex flex-col flex-grow"> {/* Added flex-grow */}
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
            <div className="flex flex-col gap-8 flex-grow"> {/* Changed to flex-col and added flex-grow */}
              {/* Note Input and Preview Section */}
              <div className="flex flex-col gap-4">
                <NoteInput onSave={handleSaveNote} />
                {selectedNote && viewMode === 'map' && ( // Only show preview in map mode for now, or adjust later
                  <NotePreview
                    note={selectedNote}
                    onClose={() => setSelectedNote(null)}
                  />
                )}
              </div>

              {/* Conditional Map/List View Section with Animation */}
              <div className="flex-grow relative overflow-hidden"> {/* Added overflow-hidden */}
                {/* Map View */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                    viewMode === 'map' && !isTransitioning ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  <MapView
                    ref={mapRef} // Assign ref
                    notes={notes}
                    onNoteSelect={setSelectedNote}
                    onNotePositionChange={handleNotePositionChange}
                    className="h-[500px] md:h-[600px] lg:h-full w-full" // Adjusted height and width
                  />
                 </div>

                {/* List View */}
                 <div
                   className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                     viewMode === 'list' && !isTransitioning ? 'opacity-100 z-10' : 'opacity-0 z-0'
                   }`}
                 >
                   <ListView
                     notes={notes}
                     onNoteSelect={(note: Note) => { // Add Note type to parameter
                       setSelectedNote(note); // Keep track of selected note if needed for preview later
                       setViewMode('map'); // Switch back to map view
                       // Use a short delay to allow the map view to render before flying
                       setTimeout(() => {
                         mapRef.current?.flyTo(note.latitude, note.longitude, 15); // Fly to note location
                       }, 50); // Small delay (adjust if needed)
                     }}
                     className="h-[500px] md:h-[600px] lg:h-full w-full overflow-y-auto" // Added overflow
                   />
                 </div> 
              </div>

              {/* Toggle Button - Positioned at bottom center */}
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20"> {/* Increased z-index */}
                 <Button
                   onClick={() => {
                     const nextView = viewMode === 'map' ? 'list' : 'map';
                     setIsTransitioning(true);
                     setViewMode(nextView);

                     // Clear any existing timeout
                     if (transitionTimeoutRef.current) {
                       clearTimeout(transitionTimeoutRef.current);
                     }

                     // End transition after animation duration (300ms)
                     transitionTimeoutRef.current = setTimeout(() => {
                       setIsTransitioning(false);
                     }, 300);
                   }}
                   disabled={isTransitioning} // Disable button during transition
                 >
                   {viewMode === 'map' ? 'Show List' : 'Show Map'}
                 </Button>
              </div>
            </div>
          )}
        </GeolocationProvider>
      </div>
    </main>
  )
}
