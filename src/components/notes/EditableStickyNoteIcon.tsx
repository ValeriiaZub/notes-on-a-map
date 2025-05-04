'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Note } from '@/types/notes'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X } from 'lucide-react' // Icons for loading/save/cancel
import L from 'leaflet' // Import Leaflet for DomEvent
import { createClient } from '@/lib/utils/supabase/client'

interface EditableStickyNoteIconProps {
  note: Note
  onNoteUpdate?: (updatedNote: Note) => void
  onNoteDelete?: (noteId: string) => void // Keep for future
  // Add other props like color later if needed
}

export function EditableStickyNoteIcon({ note, onNoteUpdate, onNoteDelete }: EditableStickyNoteIconProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(note.content)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient() // Create the client instance

  // Update local state if note prop changes from parent (e.g., due to real-time updates)
  useEffect(() => {
    // Only update if not currently editing to avoid overwriting user input
    if (!isEditing) {
      setEditedContent(note.content);
    }
  }, [note.content, note.updated_at, isEditing]); // Depend on updated_at to catch external updates

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select() // Select text for easy replacement
    }
  }, [isEditing])

  // Use useCallback for handleSave to stabilize its reference for useEffect dependency
  const handleSave = useCallback(async () => {
    // Check isEditing status *inside* the async function to avoid stale closures
    // Also check if content actually changed
    if (!isEditing || isLoading || editedContent === note.content) {
      if (isEditing) setIsEditing(false); // Exit edit mode if no changes or not editing
      setError(null); // Clear any previous error message
      return;
    }

    setIsLoading(true)
    setError(null)

    // Check session validity before attempting the update
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Session is invalid or error occurred fetching it
      console.error('Session error or no session before update:', sessionError);
      setError('Your session has expired. Please log in again to save changes.');
      setIsLoading(false);
      // Do not proceed with the update if session is invalid
      return;
    }

    // Session is valid, proceed with the update
    const { data, error: updateError } = await supabase
      .from('notes')
      .update({ content: editedContent, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select()
      .single()

    setIsLoading(false)

    if (updateError) {
      console.error('Error updating note:', updateError)
      setError('Failed to save note.')
      // Keep editing mode active on error to allow retry/correction
    } else if (data) {
      setIsEditing(false)
      onNoteUpdate?.(data as Note)
      // Parent should update the note prop, which useEffect will catch
    }
  }, [isEditing, isLoading, editedContent, note.content, note.id, onNoteUpdate]); // Added dependencies

  // Handle clicks outside the component to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ensure we are in editing mode and the click is outside the container
      if (isEditing && containerRef.current && !containerRef.current.contains(event.target as Node)) {
           handleSave(); // Save on outside click
      }
    }
    // Use mousedown to catch clicks before potential blur events trigger other actions
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    // Re-run if isEditing changes or handleSave function identity changes
  }, [isEditing, handleSave]);


  const handleEditClick = (e: React.MouseEvent) => {
    // Prevent Leaflet drag/pan when clicking inside the note
    e.stopPropagation(); // Use React's event propagation stop
    if (!isEditing) {
      setIsEditing(true)
      setError(null) // Clear previous errors
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContent(note.content) // Revert changes
    setError(null)
  }

  // Basic styling - refine later with Tailwind and font
  const noteStyle: React.CSSProperties = {
    width: '100px', // Adjust size
    height: '100px',
    backgroundColor: '#FFFACD', // LemonChiffon - adjust later
    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: '"Permanent Marker", cursive', // Apply font
    fontSize: '12px', // Adjust font size
    lineHeight: '1.3',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Space out content and buttons
    alignItems: 'center', // Center content horizontally
    overflow: 'hidden', // Hide overflow
    position: 'relative', // Needed for absolute positioning of buttons
    wordBreak: 'break-word',
  }

  return (
    <div
      ref={containerRef}
      style={noteStyle}
      // onClick={handleEditClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleEditClick(e)
      }} // Prevent map zoom on double click
      // Prevent map drag/click when interacting with the note
      // onMouseDown={(e) => { e.stopPropagation(); }}
      // onMouseUp={(e) => { e.stopPropagation(); }}
      // onTouchStart={(e) => { e.stopPropagation(); }}
    >
      {isEditing ? (
        <>
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full flex-grow resize-none border-none focus:ring-0 bg-transparent p-0 m-0 text-center"
            style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
            // Stop propagation for textarea events too
            onMouseDown={(e) => { e.stopPropagation(); }}
            onMouseUp={(e) => { e.stopPropagation(); }}
            onTouchStart={(e) => { e.stopPropagation(); }}
            onDoubleClick={(e) => { e.stopPropagation(); }}
          />
          {/* Buttons container */}
          <div className="flex justify-center items-center gap-1 mt-1 h-6"> {/* Fixed height for buttons */}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600 hover:bg-green-100" title="Save" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-red-600 hover:bg-red-100" title="Cancel" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {/* Error message display */}
          <div className="h-4 text-center"> {/* Fixed height for error message */}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </>
      ) : (
        // Display mode: center content vertically and horizontally
        <div className="flex-grow flex items-center justify-center overflow-hidden w-full">
          <span className="max-h-full overflow-hidden">{editedContent}</span>
        </div>
      )}
    </div>
  )
}