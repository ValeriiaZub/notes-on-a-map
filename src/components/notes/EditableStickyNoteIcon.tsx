'use client'

import { useState, useRef, useEffect } from 'react'
import type { Note } from '@/types/notes'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, Trash2 } from 'lucide-react' // Icons for loading/save/cancel/delete

interface EditableStickyNoteIconProps {
  note: Note
  onNoteUpdate: (updatedNote: Partial<Note>) => void
  onNoteDelete: () => void // Keep for future
  noteStyle?: React.CSSProperties // Optional prop for custom styles
}

export function EditableStickyNoteIcon({ note, onNoteUpdate, onNoteDelete}: EditableStickyNoteIconProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(note.content)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select() // Select text for easy replacement
    }
  }, [isEditing])

  // Handle clicks outside the component to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ensure we are in editing mode and the click is outside the container
      if (isEditing && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false)
        onNoteUpdate({
          content: editedContent,
        });
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, editedContent]);


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

  const handleSave = () => {
    console.log(editedContent)
    setIsEditing(false)
    onNoteUpdate({
      content: editedContent,
    });
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
      onClick={handleEditClick}
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
            <>
              {/* Save Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-green-600 hover:bg-green-100 disabled:opacity-50"
                title="Save"
                onClick={handleSave}
              >
                <Check className="h-4 w-4" />
              </Button>
              {/* Cancel Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-orange-600 hover:bg-orange-100 disabled:opacity-50" // Changed color for distinction
                title="Cancel"
                onClick={handleCancel}
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
                  onClick={onNoteDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
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