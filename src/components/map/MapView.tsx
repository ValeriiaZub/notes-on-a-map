'use client'

import { useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import { NoteMarkerPopup } from '@/components/notes/NoteMarkerPopup'
import type { Note } from '@/types/notes'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet'
import { DivIcon, LatLng } from 'leaflet'

interface MapViewProps {
  notes?: Note[]
  onNoteSelect?: (note: Note) => void
  onNoteEdit?: (note: Note) => void
  onNoteDelete?: (noteId: string) => void
  onNoteShare?: (note: Note) => void
  className?: string
}

function UserLocationMarker() {
  const { position } = useGeolocationContext()
  const map = useMap()

  const userIcon = useMemo(() => new DivIcon({
    className: 'user-location-marker',
    html: '<div style="background-color: #007AFF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(0,122,255,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  }), [])

  useMemo(() => {
    if (position) {
      map.setView([position.latitude, position.longitude])
    }
  }, [position, map])

  if (!position) return null

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={userIcon}
    />
  )
}

export function MapView({
  notes = [],
  onNoteSelect,
  onNoteEdit,
  onNoteDelete,
  onNoteShare,
  className = ''
}: MapViewProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const { position } = useGeolocationContext()

  const noteIcon = useMemo(() => new DivIcon({
    className: 'note-marker',
    html: '<div style="background-color: #FF3B30; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(255,59,48,0.3); cursor: pointer;"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }), [])

  const center = position
    ? new LatLng(position.latitude, position.longitude)
    : new LatLng(51.505, -0.09)

  return (
    <div className={`relative min-h-[300px] ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="absolute inset-0 rounded-lg z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <UserLocationMarker />

        {notes.map(note => (
          <Marker
            key={note.id}
            position={[note.latitude, note.longitude]}
            icon={noteIcon}
            eventHandlers={{
              click: () => {
                setSelectedNote(note)
                onNoteSelect?.(note)
              }
            }}
          >
            <Popup
              closeButton={false}
              className="note-popup"
            >
              <NoteMarkerPopup
                note={note}
                onEdit={onNoteEdit}
                onDelete={onNoteDelete}
                onShare={onNoteShare}
                onClose={() => setSelectedNote(null)}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
