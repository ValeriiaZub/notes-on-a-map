'use client'

import { useRef, useEffect, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createPortal } from 'react-dom'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import { NoteMarkerPopup } from '@/components/notes/NoteMarkerPopup'
import type { Note } from '@/types/notes'

// Fix Leaflet default marker icon issue
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

interface MapViewProps {
  notes?: Note[]
  onNoteSelect?: (note: Note) => void
  onNoteEdit?: (note: Note) => void
  onNoteDelete?: (noteId: string) => void
  onNoteShare?: (note: Note) => void
  className?: string
}

export function MapView({
  notes = [],
  onNoteSelect,
  onNoteEdit,
  onNoteDelete,
  onNoteShare,
  className = ''
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const userMarkerRef = useRef<L.Marker | null>(null)
  const popupContentRef = useRef<HTMLDivElement | null>(null)
  const { position } = useGeolocationContext()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView(
        position ? [position.latitude, position.longitude] : [51.505, -0.09],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current)

      // Add zoom control
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update map center and user marker when location changes
  useEffect(() => {
    if (!mapRef.current || !position) return

    // Update map center
    mapRef.current.setView([position.latitude, position.longitude], mapRef.current.getZoom())

    // Update or create user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([position.latitude, position.longitude])
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background-color: #007AFF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(0,122,255,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })

      userMarkerRef.current = L.marker([position.latitude, position.longitude], { icon: userIcon })
        .addTo(mapRef.current)
    }
  }, [position])

  // Update note markers
  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    notes.forEach(note => {
      const noteIcon = L.divIcon({
        className: 'note-marker',
        html: '<div style="background-color: #FF3B30; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(255,59,48,0.3); cursor: pointer;"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      const marker = L.marker([note.latitude, note.longitude], { icon: noteIcon })
        .addTo(mapRef.current!)

      // Create popup with NoteMarkerPopup component
      const popupContent = document.createElement('div')
      popupContentRef.current = popupContent
      
      const popup = L.popup({
        closeButton: false,
        className: 'note-popup'
      }).setContent(popupContent)

      // Add click handler
      marker.on('click', () => {
        setSelectedNote(note)
        if (onNoteSelect) {
          onNoteSelect(note)
        }
        marker.bindPopup(popup).openPopup()
      })

      markersRef.current.push(marker)
    })
  }, [notes, onNoteSelect, onNoteEdit, onNoteDelete, onNoteShare])

  return (
    <div className={`relative min-h-[300px] ${className}`}>
      <div id="map" className="absolute inset-0 rounded-lg z-0" />
      {selectedNote && popupContentRef.current && createPortal(
        <NoteMarkerPopup
          note={selectedNote}
          onEdit={onNoteEdit}
          onDelete={onNoteDelete}
          onShare={onNoteShare}
          onClose={() => {
            const marker = markersRef.current.find(
              m => m.getLatLng().lat === selectedNote.latitude && 
                   m.getLatLng().lng === selectedNote.longitude
            )
            if (marker) {
              marker.closePopup()
            }
            setSelectedNote(null)
          }}
        />,
        popupContentRef.current
      )}
    </div>
  )
} 