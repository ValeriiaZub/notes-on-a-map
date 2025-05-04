'use client'

import { useEffect, useRef, useState } from 'react'; // Import useState
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { EditableStickyNoteIcon } from '@/components/notes/EditableStickyNoteIcon';
import type { Note } from '@/types/notes';

interface InteractiveStickyMarkerProps {
  note: Note;
  position: L.LatLngExpression; // Accept LatLngExpression for flexibility
  onNoteUpdate?: (updatedNote: Note) => void;
  onNoteDelete?: (noteId: string) => void; // Pass delete handler down
  onNotePositionChange?: (note: Note, newPosition: L.LatLng) => void; // Add position change handler prop
}

export function InteractiveStickyMarker({ note, position, onNoteUpdate, onNoteDelete, onNotePositionChange }: InteractiveStickyMarkerProps) {
  console.log('[InteractiveStickyMarker] Rendering for note:', {
    id: note.id,
    content: note.content.substring(0, 20) + (note.content.length > 20 ? '...' : ''),
    position: position
  });
  
  const map = useMap();
  const markerRef = useRef<HTMLDivElement | null>(null);
  const draggableRef = useRef<L.Draggable | null>(null); // Ref for the draggable instance
  // Memoize LatLng object creation if position prop could change frequently,
  // but for simple rendering, direct conversion is fine.
  // Use state for latLng to update it after drag
  const [currentLatLng, setCurrentLatLng] = useState(() => {
    const latLng = L.latLng(position);
    console.log('[InteractiveStickyMarker] Initial latLng created:', { lat: latLng.lat, lng: latLng.lng });
    return latLng;
  });

  // Update currentLatLng if the position prop changes externally
  useEffect(() => {
    console.log('[InteractiveStickyMarker] Position prop changed for note', note.id, ':', position);
    const newLatLng = L.latLng(position);
    console.log('[InteractiveStickyMarker] Setting new currentLatLng:', { lat: newLatLng.lat, lng: newLatLng.lng });
    setCurrentLatLng(newLatLng);
  }, [position, note.id]);

  // Log when map is available
  useEffect(() => {
    console.log('[InteractiveStickyMarker] Map instance available for note', note.id, ':', !!map);
    if (map) {
      console.log('[InteractiveStickyMarker] Map center:', map.getCenter());
      console.log('[InteractiveStickyMarker] Map zoom:', map.getZoom());
    }
  }, [map, note.id]);


  useEffect(() => {
    console.log('[InteractiveStickyMarker] Setting up marker for note:', note.id);
    
    // Define anchor offset here so it's accessible in dragend
    const anchorOffset = new L.Point(100,100); // Half width, half height (assuming 100x100px note)
    console.log('[InteractiveStickyMarker] Using anchor offset:', anchorOffset);

    // Create the container div using Leaflet's utility
    const markerElement = L.DomUtil.create('div', 'leaflet-interactive-marker');
    console.log('[InteractiveStickyMarker] Created marker DOM element');
    markerRef.current = markerElement;

    // Add the container to the marker pane
    console.log('[InteractiveStickyMarker] Adding marker to map pane');
    map.getPanes().markerPane.appendChild(markerElement);

    // Function to update the DOM element's position based on currentLatLng state
    const updatePosition = () => {
      if (markerRef.current && map) {
        console.log('[InteractiveStickyMarker] Updating position for note', note.id, 'with latLng:',
          { lat: currentLatLng.lat, lng: currentLatLng.lng });
        
        try {
          // Check if map is initialized and has valid bounds
          if (!map.getBounds) {
            console.warn('[InteractiveStickyMarker] Map not fully initialized yet');
            return;
          }
          
          const point = map.latLngToLayerPoint(currentLatLng);
          console.log('[InteractiveStickyMarker] Converted to layer point:', point);
          
          // Adjust point based on the desired anchor (center of the 100x100px note)
          const anchorOffset = new L.Point(50, 50); // Half width, half height
          const adjustedPoint = point.subtract(anchorOffset);
          console.log('[InteractiveStickyMarker] Adjusted point with offset:', adjustedPoint);
          
          // Apply position with a slight delay to ensure map is ready
          L.DomUtil.setPosition(markerRef.current, adjustedPoint);
          console.log('[InteractiveStickyMarker] Position set on DOM element');
          
          // Set a visible z-index to ensure markers are visible
          markerRef.current.style.zIndex = '500';
          
          // Make sure the marker is visible
          markerRef.current.style.display = 'block';
          markerRef.current.style.visibility = 'visible';
          markerRef.current.style.opacity = '1';
          
          // Add a distinctive border for debugging
          markerRef.current.style.border = '2px solid red';
          
          console.log('[InteractiveStickyMarker] Marker visibility enforced');
        } catch (error) {
          console.error('[InteractiveStickyMarker] Error updating position:', error);
        }
      }
    };

    // Set initial position with a longer delay to ensure map is ready
    console.log('[InteractiveStickyMarker] Setting initial position');
    // Delay initial positioning to ensure map is ready
    setTimeout(() => {
      updatePosition();
      console.log('[InteractiveStickyMarker] Initial position set after delay');
    }, 500);
    
    // Also update position periodically to ensure marker stays visible
    const intervalId = setInterval(() => {
      console.log('[InteractiveStickyMarker] Periodic position update for note', note.id);
      updatePosition();
    }, 2000);

    // Update position whenever the map view changes (zoom, pan)
    console.log('[InteractiveStickyMarker] Adding map event listeners');
    const handleViewReset = () => {
      console.log('[InteractiveStickyMarker] Map viewreset event for note', note.id);
      updatePosition();
    };
    
    const handleMove = () => {
      console.log('[InteractiveStickyMarker] Map move event for note', note.id);
      updatePosition();
    };
    
    map.on('viewreset', handleViewReset);
    map.on('move', handleMove);
    // Add additional event to catch when map becomes ready
    map.on('load', updatePosition);

    // --- Draggable Implementation ---
    console.log('[InteractiveStickyMarker] Creating draggable for note', note.id);
    const draggable = new L.Draggable(markerElement);
    draggableRef.current = draggable; // Store draggable instance
    draggable.enable();
    console.log('[InteractiveStickyMarker] Draggable enabled');

    // Bring to front on drag start (Bug 2 - click-to-front)
    draggable.on('dragstart', () => {
      console.log('[InteractiveStickyMarker] Drag started for note', note.id);
      if (markerRef.current) {
        // Temporarily increase z-index while dragging
        console.log('[InteractiveStickyMarker] Increasing z-index during drag');
        markerRef.current.style.zIndex = '1000';
      }
    });

    // Handle drag end: calculate new position and notify parent
    draggable.on('dragend', (e) => {
      console.log('[InteractiveStickyMarker] Drag ended for note', note.id);
      if (markerRef.current && onNotePositionChange) {
        // Reset z-index (optional, could leave it high)
        markerRef.current.style.zIndex = '';

        const elementPoint = L.DomUtil.getPosition(markerRef.current);
        console.log('[InteractiveStickyMarker] Element point after drag:', elementPoint);
        
        // Add back the anchor offset to get the LatLng of the center
        const centerPoint = elementPoint.add(anchorOffset);
        console.log('[InteractiveStickyMarker] Center point with offset:', centerPoint);
        
        const newLatLng = map.layerPointToLatLng(centerPoint);
        console.log('[InteractiveStickyMarker] New latLng after drag:',
          { lat: newLatLng.lat, lng: newLatLng.lng });

        // Update local state immediately for responsiveness
        console.log('[InteractiveStickyMarker] Updating currentLatLng state');
        setCurrentLatLng(newLatLng);

        // Call the callback to persist the change
        console.log('[InteractiveStickyMarker] Calling onNotePositionChange callback');
        onNotePositionChange(note, newLatLng);
      }
    });
    // --- End Draggable Implementation ---


    // Cleanup function
    return () => {
      console.log('[InteractiveStickyMarker] Cleaning up marker for note', note.id);
      
      // Clear the interval
      clearInterval(intervalId);
      
      // Disable and remove draggable instance
      if (draggableRef.current) {
        console.log('[InteractiveStickyMarker] Disabling draggable');
        draggableRef.current.disable();
        draggableRef.current = null;
      }

      // Remove map event listeners
      console.log('[InteractiveStickyMarker] Removing map event listeners');
      map.off('viewreset', handleViewReset);
      map.off('move', handleMove);
      map.off('load', updatePosition);

      // Remove the marker element from the map pane
      if (markerElement && map.getPanes && map.getPanes().markerPane &&
          markerElement.parentNode === map.getPanes().markerPane) {
        console.log('[InteractiveStickyMarker] Removing marker element from DOM');
        map.getPanes().markerPane.removeChild(markerElement);
      }
      markerRef.current = null; // Clear the ref
      console.log('[InteractiveStickyMarker] Cleanup complete for note', note.id);
    };
    // Dependencies: Re-run if map instance or currentLatLng changes.
  }, [map, currentLatLng, note, onNotePositionChange]); // Added note and onNotePositionChange dependencies

  // Use createPortal to render the React component into the Leaflet-managed DOM element
  if (!markerRef.current) {
    console.log('[InteractiveStickyMarker] markerRef not available yet for note', note.id, ', not rendering content');
    return null;
  }
  
  console.log('[InteractiveStickyMarker] Rendering EditableStickyNoteIcon via portal for note', note.id);
  return createPortal(
    <EditableStickyNoteIcon
      note={note}
      onNoteUpdate={onNoteUpdate}
      onNoteDelete={onNoteDelete}
      // Pass other necessary props down
    />,
    markerRef.current
  );
}