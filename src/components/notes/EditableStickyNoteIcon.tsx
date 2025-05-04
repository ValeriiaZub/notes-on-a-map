'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Note } from '@/types/notes'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, Trash2 } from 'lucide-react' // Icons for loading/save/cancel/delete
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
  const [isLoading, setIsLoading] = useState(false) // For save/update
  const [isDeleting, setIsDeleting] = useState(false) // For delete
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

  // Start in edit mode if the flag is set (runs only once on mount)
  useEffect(() => {
    if (note.startInEditMode) {
      console.log(`[EditableStickyNoteIcon ${note.id}] Starting in edit mode.`);
      setIsEditing(true);
      // Optionally, reset the flag in the parent state via a callback if needed,
      // but handleSave should correctly identify it as new based on ID format.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once

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

    // Determine if it's a new note (using temporary ID format)
    const isNewNote = note.id?.startsWith('temp-');
    console.log(`[EditableStickyNoteIcon ${note.id}] handleSave called. Is new note?`, isNewNote);

    try {
      let savedNote: Note | null = null;

      // Fetch user ID first, as it might be needed for both insert and update (RLS)
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user or no user logged in:', userError);
        throw new Error('User not authenticated.'); // This will be caught below
      }

      if (isNewNote) {
        // --- INSERT Logic for New Note ---
        console.log(`[EditableStickyNoteIcon ${note.id}] Performing INSERT with content: "${editedContent}" for user ${user.id}`);

        const { data: insertedData, error: insertError } = await supabase
          .from('notes')
          .insert({
            content: editedContent,
            latitude: note.latitude, // Use coordinates from the temporary note
            longitude: note.longitude,
            user_id: user.id // Include user_id for RLS on insert
          })
          .select() // Select the newly inserted row
          .single(); // Expect a single row back

        if (insertError) {
          console.error(`[EditableStickyNoteIcon ${note.id}] Insert Error:`, insertError);
          throw insertError; // Throw error to be caught below
        }
        console.log(`[EditableStickyNoteIcon ${note.id}] Insert successful. New ID:`, insertedData.id);
        savedNote = insertedData as Note;

      } else {
        // --- UPDATE Logic for Existing Note ---
        console.log(`[EditableStickyNoteIcon ${note.id}] Performing UPDATE with content: "${editedContent}" for user ${user.id}`);
        const { data: updatedData, error: updateError } = await supabase
          .from('notes')
          .update({ content: editedContent, updated_at: new Date().toISOString() })
          .eq('id', note.id) // Match the note ID
          .eq('user_id', user.id) // *** ADDED: Ensure user owns the note (RLS) ***
          .select()
          .single();

        if (updateError) {
          // Log the specific update error
          console.error(`[EditableStickyNoteIcon ${note.id}] Update Error:`, updateError);
          // Check if it was a RLS violation (PostgREST returns 404 if filter removes all rows)
          if (updateError.code === 'PGRST116' && updateError.details?.includes('Results contain 0 rows')) {
             console.warn(`[EditableStickyNoteIcon ${note.id}] Update failed, likely RLS violation or note deleted.`);
             throw new Error('Note not found or permission denied.');
          }
          throw updateError; // Throw other errors to be caught below
        }
        console.log(`[EditableStickyNoteIcon ${note.id}] Update successful.`);
        savedNote = updatedData as Note;
      }

      // --- Success Handling (Common for Insert/Update) ---
      setIsLoading(false);
      setIsEditing(false); // Exit edit mode on successful save
      if (savedNote) {
        // IMPORTANT: Call onNoteUpdate with the full note data from Supabase
        // This allows the parent hook to replace the temporary note with the permanent one
        onNoteUpdate?.(savedNote);
      }

    } catch (error: any) {
      // --- Error Handling (Common for Insert/Update) ---
      console.error(`Error ${isNewNote ? 'inserting' : 'updating'} note:`, error);
      setError(`Failed to ${isNewNote ? 'create' : 'save'} note. ${error.message || ''}`);
      setIsLoading(false);
      // Keep editing mode active on error
    }

  }, [isEditing, isLoading, editedContent, note, onNoteUpdate, supabase]); // Updated dependencies

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

  // Handle Delete Action
  const handleDelete = useCallback(async () => {
    // Prevent deleting unsaved new notes
    if (note.id?.startsWith('temp-')) {
      console.log(`[EditableStickyNoteIcon ${note.id}] Attempted to delete temporary note. Cancelling edit instead.`);
      handleCancel(); // Just cancel the edit for temp notes
      return;
    }

    if (isDeleting || isLoading) return; // Prevent double clicks

    console.log(`[EditableStickyNoteIcon ${note.id}] handleDelete called.`);
    setIsDeleting(true);
    setError(null);

    try {
      // Fetch user ID to ensure RLS is respected
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user or no user logged in:', userError);
        throw new Error('User not authenticated.');
      }

      console.log(`[EditableStickyNoteIcon ${note.id}] Performing DELETE for user ${user.id}`);
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id) // Match the note ID
        .eq('user_id', user.id); // Match the user ID for RLS

      if (deleteError) {
        console.error(`[EditableStickyNoteIcon ${note.id}] Delete Error:`, deleteError);
        // Check for RLS violation (PostgREST returns 404 if filter removes all rows)
        if (deleteError.code === 'PGRST116' && deleteError.details?.includes('Results contain 0 rows')) {
           console.warn(`[EditableStickyNoteIcon ${note.id}] Delete failed, likely RLS violation or note already deleted.`);
           throw new Error('Note not found or permission denied.');
        }
        throw deleteError; // Throw other errors
      }

      // --- Success Handling ---
      console.log(`[EditableStickyNoteIcon ${note.id}] Delete successful.`);
      setIsDeleting(false);
      if (note.id) { // Explicit check for note.id before calling callback
        onNoteDelete?.(note.id); // Notify parent component
      }
      // No need to reset state here, as the component will likely unmount

    } catch (error: any) {
      // --- Error Handling ---
      console.error(`Error deleting note:`, error);
      setError(`Failed to delete note. ${error.message || ''}`);
      setIsDeleting(false); // Reset loading state on error
      // Keep editing mode active on error
    }
  }, [note.id, isDeleting, isLoading, supabase, onNoteDelete, handleCancel]); // Added handleCancel dependency


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
      onClick={handleEditClick}
      // onDoubleClick={(e) => {
      // e.stopPropagation();
      // }} // Prevent map zoom on double click
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
            {isLoading || isDeleting ? ( // Show loader if saving OR deleting
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <>
                {/* Save Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-green-600 hover:bg-green-100 disabled:opacity-50"
                  title="Save"
                  onClick={(e) => { e.stopPropagation(); handleSave(); }}
                  disabled={isLoading || isDeleting} // Disable if saving or deleting
                >
                  <Check className="h-4 w-4" />
                </Button>
                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-orange-600 hover:bg-orange-100 disabled:opacity-50" // Changed color for distinction
                  title="Cancel"
                  onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                  disabled={isLoading || isDeleting} // Disable if saving or deleting
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* Delete Button - Don't show for new temp notes */}
                {!note.id?.startsWith('temp-') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={isLoading || isDeleting} // Disable if saving or deleting
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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