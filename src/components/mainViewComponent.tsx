'use client'

import { useRef, useState } from "react";
import { GeolocationProvider } from "./providers/GeolocationProvider";
import { Button } from "./ui/button";
import { Note } from "@/types/notes";
import { MapViewHandle } from "./map/MapView";
import { useNoteSync } from "@/hooks/useNoteSync";
import { LatLng } from "leaflet";
import { NoteInput } from "./notes/NoteInput";
import { NotePreview } from "./notes/NotePreview";
import ListView from "./notes/ListView";
import { createClient } from "@/lib/utils/supabase/client";
import dynamic from "next/dynamic";

const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => mod.MapView),
  { ssr: false }
)

// // Dynamic ListView import using default export
// const ListView = dynamic(
//   () => import('@/components/notes/ListView'), // Use default export
//   { ssr: false, loading: () => <p>Loading list...</p> } // Add loading state
// )

interface Props {
    isAuthenticated: boolean;
}

const MainMapView = ({ isAuthenticated }: Props) => {
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map') // State for view mode
    const [isTransitioning, setIsTransitioning] = useState(false); // State for animation
    const mapRef = useRef<MapViewHandle | null>(null); // Use the imported MapViewHandle type for the ref
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for timeout
    const { notes, createNote, updateNote, isLoading } = useNoteSync(isAuthenticated) // Pass isAuthenticated and get isLoading
    const supabase = createClient()

    const handleSaveNote = async (note: Note) => {
        console.log('[page] handleSaveNote called with note:', {
            content: note.content,
            lat: note.latitude,
            lng: note.longitude
        });

        if (!isAuthenticated) {
            console.error('[page] User must be authenticated to save notes')
            return
        }

        try {
            console.log('[page] Calling createNote');
            await createNote(note)
            console.log('[page] Note created successfully');
        } catch (error) {
            console.error('[page] Failed to save note:', error)
        }
    }

    const handleNotePositionChange = async (note: Note, newPosition: LatLng) => {
        console.log('[page] handleNotePositionChange called with:', {
            noteId: note.id,
            newLat: newPosition.lat,
            newLng: newPosition.lng
        });

        if (!isAuthenticated) {
            console.error('[page] User must be authenticated to update notes')
            return
        }

        try {
            console.log('[page] -------------- Calling updateNote with new position');
            await updateNote({
                id: note.id,
                user_id: note.user_id,
                content: note.content,
                latitude: newPosition.lat,
                longitude: newPosition.lng
            })
            console.log('[page] Note position updated successfully');
        } catch (error) {
            console.error('[page] Failed to update note position:', error)
        }
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut()
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
                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                                    <p className="text-lg font-semibold animate-pulse">Loading notes...</p>
                                </div>
                            )}
                            {/* Map View */}
                            <div
                                className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${viewMode === 'map' && !isTransitioning ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                    }`}
                            >
                                <MapView
                                    ref={mapRef} // Assign ref
                                    notes={notes}
                                    // onNoteSelect={setSelectedNote} // Removed - MapView no longer handles direct selection this way
                                    onNotePositionChange={handleNotePositionChange}
                                    className="h-[500px] md:h-[600px] lg:h-full w-full" // Adjusted height and width
                                />
                            </div>

                            {/* List View */}
                            <div
                                className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${viewMode === 'list' && !isTransitioning ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                    }`}
                            >
                                <ListView
                                    notes={notes}
                                    onNoteSelect={(note: Note) => { // Add Note type to parameter
                                        console.log('[page] Note selected in list view:', note.id);
                                        setSelectedNote(note); // Keep track of selected note if needed for preview later
                                        console.log('[page] Switching to map view');
                                        setViewMode('map'); // Switch back to map view
                                        // Use a short delay to allow the map view to render before flying
                                        setTimeout(() => {
                                            console.log('[page] Flying to note location:', { lat: note.latitude, lng: note.longitude });
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
                                    console.log(`[page] Toggle button clicked, switching from ${viewMode} to ${nextView}`);
                                    setIsTransitioning(true);
                                    setViewMode(nextView);

                                    // Clear any existing timeout
                                    if (transitionTimeoutRef.current) {
                                        clearTimeout(transitionTimeoutRef.current);
                                    }

                                    // End transition after animation duration (300ms)
                                    transitionTimeoutRef.current = setTimeout(() => {
                                        console.log('[page] Transition animation completed');
                                        setIsTransitioning(false);
                                    }, 300);
                                }}
                                disabled={isTransitioning} // Disable button during transition
                            >
                                {viewMode === 'map' ? 'Show List' : 'Show Map'}
                            </Button>
                        </div>
                    </div>
                </GeolocationProvider>
            </div>
        </main>
    )
}

export default MainMapView