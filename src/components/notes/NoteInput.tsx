'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import type { Note } from '@/types/notes'

interface NoteInputProps {
  onSave: (note: Note) => Promise<void>
  initialValue?: string
  maxLength?: number
}

export function NoteInput({ onSave, initialValue = '', maxLength = 1000 }: NoteInputProps) {
  const [content, setContent] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const { position, error, loading } = useGeolocationContext()

  // Auto-save draft to localStorage
  useEffect(() => {
    if (content) {
      localStorage.setItem('note-draft', content)
    } else {
      localStorage.removeItem('note-draft')
    }
  }, [content])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('note-draft')
    if (draft && !initialValue) {
      setContent(draft)
    }
  }, [initialValue])

  const handleSave = async () => {
    if (!position || !content.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        content: content.trim(),
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      })
      setContent('')
      localStorage.removeItem('note-draft')
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const charactersLeft = maxLength - content.length

  return <></>
  //   <Card className="w-full max-w-md mx-auto">
  //     <CardContent className="pt-6">
  //       <Textarea
  //         placeholder="Write your note here..."
  //         value={content}
  //         onChange={(e) => setContent(e.target.value)}
  //         maxLength={maxLength}
  //         disabled={isSaving}
  //         className="min-h-[100px] resize-none"
  //       />
  //       <div className="mt-2 text-sm text-gray-500 flex justify-between">
  //         <span>{charactersLeft} characters left</span>
  //         {loading ? (
  //           <span>Getting location...</span>
  //         ) : error ? (
  //           <span className="text-red-500">{error.message}</span>
  //         ) : position ? (
  //           <span>
  //             📍 {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
  //           </span>
  //         ) : null}
  //       </div>
  //     </CardContent>
      
  //     <CardFooter className="flex justify-end gap-2">
  //       <Button
  //         variant="outline"
  //         onClick={() => setContent('')}
  //         disabled={!content || isSaving}
  //       >
  //         Clear
  //       </Button>
  //       <Button
  //         onClick={handleSave}
  //         disabled={!content || !position || isSaving}
  //       >
  //         {isSaving ? 'Saving...' : 'Save Note'}
  //       </Button>
  //     </CardFooter>
  //   </Card>
 // )
} 