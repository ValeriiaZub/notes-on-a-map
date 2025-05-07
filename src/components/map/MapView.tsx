'use client'

import { useMemo, forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react' // Added useCallback
import { createRoot } from 'react-dom/client'
import { EditableStickyNoteIcon } from '@/components/notes/EditableStickyNoteIcon'
import 'leaflet/dist/leaflet.css'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import type { Note } from '@/types/notes'
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet'
import L, { Map as LeafletMap } from 'leaflet' // Import LeafletMap type and DivIcon

interface MapViewProps {
  notes?: Note[]
  onNoteDelete: (noteId: string) => void // Keep for potential deletion from icon
  onNoteShare?: (note: Note) => void // Keep for potential sharing from icon
  onNoteUpdate: (updatedNote: Note) => void // Add callback for when a note is updated via the icon
  onNotePositionChange: (note: Note, newPosition: L.LatLng) => void
  className?: string
}

// Define the type for the imperative handle
export interface MapViewHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  getCenter: () => L.LatLng | undefined; // Add getCenter method signature
}

function UserLocationMarker() {
  const { position } = useGeolocationContext()
  const map = useMap()


  const userIcon = useMemo(() => {
    return new L.DivIcon({
      className: 'user-location-marker',
      html: '<div style="background-color: #007AFF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(0,122,255,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }, [])


  useMemo(() => {
    if (position) {
      map.setView([position.latitude, position.longitude])
    }
  }, [position, map])

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={userIcon}
    />
  )
}


// Component that uses Leaflet's imperative API to render markers
function DirectMarkerRenderer({
  note,
  onNoteUpdate,
  onNoteDelete,
  onNotePositionChange
}: {
  note: Note,
  onNoteUpdate: (note: Note) => void,
  onNoteDelete: (noteId: string) => void,
  onNotePositionChange?: (note: Note, newPosition: L.LatLng) => void
}) {
  const map = useMap();
  const markersRef = useRef<L.Marker>(null);

  // Function to create a marker for a note
  const createMarker = useCallback((note: Note) => {
    // Create a div element for the marker content
    const markerElement = document.createElement('div');
    markerElement.style.width = '100px';
    markerElement.style.height = '100px';

    // markerElement.style.backgroundColor = '#FFFACD';
    // markerElement.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.3)';
    // markerElement.style.padding = '8px';
    // markerElement.style.borderRadius = '3px';
    // markerElement.style.fontFamily = '"Permanent Marker", cursive';
    // markerElement.style.fontSize = '12px';
    // markerElement.style.lineHeight = '1.3';
    // markerElement.style.textAlign = 'center';
    // markerElement.style.cursor = 'pointer';
    // markerElement.style.display = 'flex';
    // markerElement.style.flexDirection = 'column';
    // markerElement.style.justifyContent = 'space-between';
    // markerElement.style.alignItems = 'center';
    // markerElement.style.overflow = 'hidden';
    markerElement.style.position = 'relative';
    // markerElement.style.wordBreak = 'break-word';

    // Render the EditableStickyNoteIcon component into the marker element
    const root = createRoot(markerElement);
    root.render(
      <EditableStickyNoteIcon
        note={note}
        onNoteUpdate={(partial) => onNoteUpdate({ ...note, ...partial })}
        onNoteDelete={() => onNoteDelete(note.id!)}
      />
    );

    const icon = L.divIcon({
      html: markerElement,
      className: 'custom-marker',
      iconSize: [100, 100],
      iconAnchor: [100, 100],
    });

    // Create a marker with the custom icon
    const marker = L.marker([note.latitude, note.longitude], {
      icon,
      draggable: true
    }).addTo(map);

    // Add drag end event listener
    marker.on('dragend', () => {
      const newPos = marker.getLatLng();
      onNotePositionChange?.(note, newPos);
    });

    return marker;
  }, [map, onNoteDelete, onNotePositionChange, onNoteUpdate]);

  // Effect to handle notes changes
  useEffect(() => {
    // Track which markers need to be removed
    markersRef.current = createMarker(note);
    markersRef.current.setLatLng([note.latitude, note.longitude]);

    // Cleanup function to remove all markers when component unmounts
    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
    };
  }, []);

  return <></>;
}

// Use forwardRef to allow parent components to get a ref to the MapView
export const MapView = forwardRef<MapViewHandle, MapViewProps>(({
  notes = [],
  // Removed onNoteSelect from props destructuring
  onNoteDelete,
  onNoteUpdate, // Add onNoteUpdate
  onNotePositionChange,
  className = ''
}, ref) => {

  // Removed selectedNote state
  const { position } = useGeolocationContext()
  const mapRefInternal = useRef<LeafletMap>(null);

  // Expose the flyTo method via useImperativeHandle
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 15) => {
      mapRefInternal.current?.flyTo([lat, lng], zoom);
    },
    getCenter: () => {
      return mapRefInternal.current?.getCenter();
    }
  }), []);

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

        {/* Use a separate component to ensure map is ready before rendering markers */}
        {notes.map(note => (
          <DirectMarkerRenderer
            key={note.id}
            note={note}
            onNoteUpdate={onNoteUpdate}
            onNoteDelete={onNoteDelete}
            onNotePositionChange={onNotePositionChange} />
        ))}
      </MapContainer>
    </div>
  );
});

MapView.displayName = 'MapView'; // Add display name for DevTools
