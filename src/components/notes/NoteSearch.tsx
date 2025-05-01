'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import type { Note } from '@/types/notes'
import type { SelectSingleEventHandler } from 'react-day-picker'

interface SearchFilters {
  text?: string
  startDate?: Date | null
  endDate?: Date | null
  sortBy: 'date' | 'distance'
}

interface NoteSearchProps {
  notes: Note[]
  userLocation?: { latitude: number; longitude: number }
  onFilterChange: (filteredNotes: Note[]) => void
}

export function NoteSearch({ notes, userLocation, onFilterChange }: NoteSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'date'
  })

  // Apply filters and sorting
  useEffect(() => {
    let filteredNotes = [...notes]

    // Apply text filter
    if (filters.text) {
      const searchText = filters.text.toLowerCase()
      filteredNotes = filteredNotes.filter(note =>
        note.content.toLowerCase().includes(searchText)
      )
    }

    // Apply date filters
    if (filters.startDate) {
      filteredNotes = filteredNotes.filter(note =>
        note.created_at && new Date(note.created_at) >= filters.startDate!
      )
    }
    if (filters.endDate) {
      filteredNotes = filteredNotes.filter(note =>
        note.created_at && new Date(note.created_at) <= filters.endDate!
      )
    }

    // Sort notes
    filteredNotes.sort((a, b) => {
      if (filters.sortBy === 'date') {
        return new Date(b.created_at || Date.now()).getTime() - 
               new Date(a.created_at || Date.now()).getTime()
      } else if (filters.sortBy === 'distance' && userLocation) {
        const distA = getDistance(userLocation, a)
        const distB = getDistance(userLocation, b)
        return distA - distB
      }
      return 0
    })

    onFilterChange(filteredNotes)
  }, [notes, filters, userLocation, onFilterChange])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, text: e.target.value }))
  }

  const handleStartDateSelect: SelectSingleEventHandler = (date) => {
    setFilters(prev => ({ ...prev, startDate: date }))
  }

  const handleEndDateSelect: SelectSingleEventHandler = (date) => {
    setFilters(prev => ({ ...prev, endDate: date }))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search notes..."
          value={filters.text || ''}
          onChange={handleTextChange}
          className="flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {filters.startDate ? format(filters.startDate, 'PP') : 'Start Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate || undefined}
              onSelect={handleStartDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {filters.endDate ? format(filters.endDate, 'PP') : 'End Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.endDate || undefined}
              onSelect={handleEndDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          onClick={() => setFilters(prev => ({
            ...prev,
            sortBy: prev.sortBy === 'date' ? 'distance' : 'date'
          }))}
        >
          Sort by: {filters.sortBy === 'date' ? '📅 Date' : '📍 Distance'}
        </Button>
      </div>
    </div>
  )
}

// Helper function to calculate distance between two points
function getDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180
  const φ2 = point2.latitude * Math.PI / 180
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
} 