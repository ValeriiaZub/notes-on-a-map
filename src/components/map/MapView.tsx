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
import L, { Map as LeafletMap, DivIcon } from 'leaflet' // Import LeafletMap type and DivIcon

interface MapViewProps {
  notes?: Note[]
  // onNoteSelect is likely no longer needed as interaction is direct
  onNoteEdit?: (note: Note) => void // Keep for potential future use or different edit flows
  onNoteDelete?: (noteId: string) => void // Keep for potential deletion from icon
  onNoteShare?: (note: Note) => void // Keep for potential sharing from icon
  onNoteUpdate?: (updatedNote: Note) => void // Add callback for when a note is updated via the icon
  onNotePositionChange?: (note: Note, newPosition: L.LatLng) => void
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

  console.log('[MapView:UserLocationMarker] Rendering with position:', position);

  const userIcon = useMemo(() => {
    console.log('[MapView:UserLocationMarker] Creating user location icon');
    return new L.DivIcon({
      className: 'user-location-marker',
      html: '<div style="background-color: #007AFF; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px rgba(0,122,255,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }, [])

  // Log when map is available
  useEffect(() => {
    console.log('[MapView:UserLocationMarker] Map instance available:', !!map);
  }, [map]);

  useMemo(() => {
    if (position) {
      console.log('[MapView:UserLocationMarker] Setting map view to user position:',
        { lat: position.latitude, lng: position.longitude });
      map.setView([position.latitude, position.longitude])
    }
  }, [position, map])

  if (!position) {
    console.log('[MapView:UserLocationMarker] No position available, not rendering marker');
    return null;
  }

  console.log('[MapView:UserLocationMarker] Rendering marker at:',
    { lat: position.latitude, lng: position.longitude });
  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={userIcon}
    />
  )
}

// Component to log map initialization
function MapInitLogger() {
  const map = useMap();

  useEffect(() => {
    console.log('[MapView:MapInitLogger] Map initialized with center:', map.getCenter());
    console.log('[MapView:MapInitLogger] Map zoom level:', map.getZoom());

    const logMapEvent = (event: string) => {
      console.log(`[MapView:MapInitLogger] Map event: ${event}`);
    };

    map.on('load', () => logMapEvent('load'));
    map.on('zoomend', () => logMapEvent('zoomend'));
    map.on('moveend', () => logMapEvent('moveend'));

    return () => {
      map.off('load', () => logMapEvent('load'));
      map.off('zoomend', () => logMapEvent('zoomend'));
      map.off('moveend', () => logMapEvent('moveend'));
    };
  }, [map]);

  return null;
}

// Component that uses Leaflet's imperative API to render markers
function DirectMarkerRenderer({
  notes,
  onNoteUpdate,
  onNoteDelete,
  onNotePositionChange
}: {
  notes: Note[],
  onNoteUpdate?: (note: Note) => void,
  onNoteDelete?: (noteId: string) => void,
  onNotePositionChange?: (note: Note, newPosition: L.LatLng) => void
}) {
  // console.log('aaaaaaa ', notes.map(n => ({ lat: n.latitude, lng: n.longitude })));
  const map = useMap();
  const markersRef = useRef<Record<string, L.Marker>>({});

  // Function to create a marker for a note
  const createMarker = useCallback((note: Note) => {
    console.log('[MapView:DirectMarkerRenderer] Creating marker for note:', note.id);

    // Create a div element for the marker content
    const markerElement = document.createElement('div');
    markerElement.style.width = '120px';
    markerElement.style.height = '120px';

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
        onNoteUpdate={onNoteUpdate}
        onNoteDelete={onNoteDelete}
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
    if (!map) return;

    console.log('[MapView:DirectMarkerRenderer] Notes changed, count:', notes.length);

    if (notes.length > 0) {

      // Track which markers need to be removed
      const currentMarkerIds = Object.keys(markersRef.current);
      const newMarkerIds = new Set(notes.map(note => note.id));

      // Add or update markers
      notes.forEach(note => {
        // Ensure note.id is a string
        const noteId = String(note.id);

        // Check if the marker already exists
        if (markersRef.current && noteId && noteId in markersRef.current) {
          // Update existing marker position
          const marker = markersRef.current[noteId];
          if (marker) {
            marker.setLatLng([note.latitude, note.longitude]);
          }
        } else {
          // Create new marker
          if (markersRef.current && noteId) {
            markersRef.current[noteId] = createMarker(note);
          }
        }
      });

      // Remove markers that are no longer in the notes array
      currentMarkerIds.forEach(id => {
        if (!newMarkerIds.has(id) && markersRef.current) {
          console.log('[MapView:DirectMarkerRenderer] Removing marker for note:', id);
          const marker = markersRef.current[id];
          if (marker) {
            map.removeLayer(marker);
            delete markersRef.current[id];
          }
        }
      });
    } else {
      // If no notes, clear all markers
      console.log('[MapView:DirectMarkerRenderer] No notes, removing all markers');
    }

    // Cleanup function to remove all markers when component unmounts
    return () => {
      if (markersRef.current) {
        Object.values(markersRef.current).forEach(marker => {
          if (marker) {
            map.removeLayer(marker);
          }
        });
        markersRef.current = {};
      }
    };
  }, [map, notes, createMarker]);

  return <></>;
}

// Use forwardRef to allow parent components to get a ref to the MapView
export const MapView = forwardRef<MapViewHandle, MapViewProps>(({
  notes = [],
  // Removed onNoteSelect from props destructuring
  onNoteEdit,
  onNoteDelete,
  onNoteShare,
  onNoteUpdate, // Add onNoteUpdate
  onNotePositionChange,
  className = ''
}, ref) => {
  console.log('[MapView] Rendering with', notes.length, 'notes');

  // Removed selectedNote state
  const { position } = useGeolocationContext()
  const mapRefInternal = useRef<LeafletMap>(null);

  // Log when map ref changes
  useEffect(() => {
    console.log('[MapView] Map ref internal state:', !!mapRefInternal.current);

    return () => {
      console.log('[MapView] Component unmounting, cleaning up');
    };
  }, [mapRefInternal.current]);

  // Expose the flyTo method via useImperativeHandle
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 15) => {
      console.log('[MapView] flyTo called with:', { lat, lng, zoom });
      mapRefInternal.current?.flyTo([lat, lng], zoom);
    },
    getCenter: () => {
      console.log('[MapView] getCenter called');
      return mapRefInternal.current?.getCenter();
    }
  }), []);

  const center = position
    ? new L.LatLng(position.latitude, position.longitude)
    : new L.LatLng(51.505, -0.09)

  console.log('[MapView] Using center:', { lat: center.lat, lng: center.lng });

  return (
    <div className={`relative min-h-[300px] ${className}`}>
      <MapContainer
        ref={mapRefInternal} // Assign internal ref directly to MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="absolute inset-0 rounded-lg z-0"
      >
        <MapInitLogger />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <UserLocationMarker />

        {/* Use a separate component to ensure map is ready before rendering markers */}
        <DirectMarkerRenderer notes={notes}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          onNotePositionChange={onNotePositionChange} />
      </MapContainer>
    </div>
  );
});

MapView.displayName = 'MapView'; // Add display name for DevTools
