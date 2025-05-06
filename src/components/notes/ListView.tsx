'use client'
import React from 'react'
import type { Note } from '@/types/notes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ListViewProps {
  notes: Note[]
  onNoteSelect: (note: Note) => void
  className?: string
}

export function ListView({ notes, onNoteSelect, className }: ListViewProps) {
  // Filter notes that have a created_at date before grouping
  const notesWithDate = notes.filter(note => note.created_at);

  // Basic grouping logic placeholder
  const groupedNotes = {
    Today: notesWithDate.filter(note => {
      const today = new Date();
      // We know created_at exists here due to the filter above
      const noteDate = new Date(note.created_at!);
      return noteDate.toDateString() === today.toDateString();
    }),
    Older: notesWithDate.filter(note => {
        const today = new Date();
        // We know created_at exists here due to the filter above
        const noteDate = new Date(note.created_at!);
        return noteDate.toDateString() !== today.toDateString();
      })
  };


  return (
    <div className={`space-y-6 ${className}`} >
      {/* <h2 className="text-2xl font-semibold mb-4">Notes List</h2> */}
      {Object.entries(groupedNotes).map(([group, notesInGroup]) => (
        notesInGroup.length > 0 && (
          <div key={group}>
            <h3 className="text-lg font-medium mb-2 sticky top-0 bg-background py-1">{group}</h3>
            <div className="space-y-3">
              {notesInGroup.map((note) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-shadow bg-yellow-100 border-yellow-300" // Sticky note style
                  onClick={() => onNoteSelect(note)}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium">Note</CardTitle> {/* Simple title */}
                  </CardHeader>
                  <CardContent className="p-3 text-sm">
                    <p className="line-clamp-3">{note.content}</p> {/* Truncate long content */}
                    <p className="text-xs text-gray-500 mt-1">
                      {note.created_at ? new Date(note.created_at).toLocaleString() : 'Date unknown'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      ))}
       {notes.length === 0 && <p>No notes yet. Add one!</p>}
       {/* Add fade animation later */}
    </div>
  )
}

export default ListView;