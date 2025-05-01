'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import type { Note } from '@/types/notes'

interface NoteDetailProps {
  note: Note
  onSave?: (note: Note) => Promise<void>
  onDelete?: (noteId: string) => Promise<void>
  onShare?: (note: Note) => void
  onClose?: () => void
}

export function NoteDetail({
  note,
  onSave,
  onDelete,
  onShare,
  onClose
}: NoteDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave({ ...note, content })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !note.id) return
    setIsDeleting(true)
    try {
      await onDelete(note.id)
      onClose?.()
    } catch (error) {
      console.error('Failed to delete note:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="text-sm text-gray-600">
          {formatDistanceToNow(new Date(note.created_at || Date.now()), { addSuffix: true })}
        </div>
        <div className="flex gap-2">
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(note)}
            >
              Share
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
            placeholder="Write your note here..."
          />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
        <div className="mt-4 text-sm text-gray-600">
          📍 {note.latitude.toFixed(6)}, {note.longitude.toFixed(6)}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onSave && (
          isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setContent(note.content)
                  setIsEditing(false)
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || content === note.content}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )
        )}
        {onDelete && !isEditing && (
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 