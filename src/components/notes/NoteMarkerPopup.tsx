'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import type { Note } from '@/types/notes'

interface NoteMarkerPopupProps {
  note: Note
  onEdit?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onShare?: (note: Note) => void
  onClose?: () => void
}

export function NoteMarkerPopup({
  note,
  onEdit,
  onDelete,
  onShare,
  onClose
}: NoteMarkerPopupProps) {
  const createdAt = note.created_at ? new Date(note.created_at) : new Date()
  
  return (
    <Card className="w-[280px] shadow-lg">
      <CardContent className="pt-4">
        <p className="text-sm text-gray-600 mb-2">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </p>
        <p className="text-sm">{note.content}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onShare && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(note)}
          >
            Share
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(note)}
          >
            Edit
          </Button>
        )}
        {onDelete && note.id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(note.id as string)}
          >
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 