'use client'

import { useMemo, useState, forwardRef, useImperativeHandle, useRef } from 'react' // Added forwardRef, useImperativeHandle, useRef
import 'leaflet/dist/leaflet.css'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import { NoteMarkerPopup } from '@/components/notes/NoteMarkerPopup'
import { StickyNoteMarker } from '@/components/notes/StickyNoteMarker'
import type { Note } from '@/types/notes'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  MapContainerProps // Import MapContainerProps
} from 'react-leaflet'
import L, { Map as LeafletMap } from 'leaflet' // Import LeafletMap type

interface MapViewProps {
  notes?: Note[]
  onNoteSelect?: (note: Note) => void
  onNoteEdit?: (note: Note) => void
  onNoteDelete?: (noteId: string) => void
  onNoteShare?: (note: Note) => void
  onNotePositionChange?: (note: Note, newPosition: L.LatLng) => void
  className?: string
}

// Define the type for the imperative handle
export interface MapViewHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

function UserLocationMarker() {
  const { position } = useGeolocationContext()
  const map = useMap()

  const userIcon = useMemo(() => new L.DivIcon({
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

// Use forwardRef to allow parent components to get a ref to the MapView
export const MapView = forwardRef<MapViewHandle, MapViewProps>(({
  notes = [],
  onNoteSelect,
  onNoteEdit,
  onNoteDelete,
  onNoteShare,
  onNotePositionChange,
  className = ''
}, ref) => { // Correctly add the ref parameter and arrow function syntax
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const { position } = useGeolocationContext()
  const mapRefInternal = useRef<LeafletMap>(null); // Define the internal ref for the Leaflet map instance

  // Expose the flyTo method via useImperativeHandle
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 15) => {
      mapRefInternal.current?.flyTo([lat, lng], zoom);
    }
  }));

  const center = position
    ? new L.LatLng(position.latitude, position.longitude)
    : new L.LatLng(51.505, -0.09)

    
  return (
    <div className={`relative min-h-[300px] ${className}`}>
      <MapContainer
        ref={mapRefInternal} // Assign internal ref directly to MapContainer
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
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target
                const position = marker.getLatLng()
                // handleNotePositionChange(note, position)
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
            <StickyNoteMarker
              note={note}
              position={new L.LatLng(note.latitude, note.longitude)}
              isSelected={selectedNote?.id === note.id}
              onClick={() => {
                setSelectedNote(note)
                onNoteSelect?.(note)
              }}
              // onDragEnd={(newPos) => handleNotePositionChange(note, newPos)}
            />
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
});

MapView.displayName = 'MapView'; // Add display name for DevTools
