import { Card, CardContent } from '@/components/ui/card'
import type { Note } from '@/types/notes'

interface NotePreviewProps {
  note: Note
  onClose?: () => void
}

export function NotePreview({ note, onClose }: NotePreviewProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="text-sm text-gray-500">
            📍 {note.latitude.toFixed(6)}, {note.longitude.toFixed(6)}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close preview"
            >
              ✕
            </button>
          )}
        </div>
        <p className="whitespace-pre-wrap">{note.content}</p>
        {note.created_at && (
          <div className="mt-4 text-sm text-gray-500">
            Created: {new Date(note.created_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 