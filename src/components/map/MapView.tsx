import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useGeolocationContext } from '@/components/providers/GeolocationProvider'
import type { Note } from '@/types/notes'

// Initialize Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface MapViewProps {
  notes?: Note[]
  onNoteSelect?: (note: Note) => void
  className?: string
}

export function MapView({ notes = [], onNoteSelect, className = '' }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const { position } = useGeolocationContext()
  const [zoom] = useState(14)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: position ? [position.longitude, position.latitude] : [-74.5, 40],
      zoom: zoom,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map center when location changes
  useEffect(() => {
    if (!map.current || !position) return

    map.current.flyTo({
      center: [position.longitude, position.latitude],
      essential: true,
    })

    // Add or update user location marker
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.backgroundColor = '#007AFF'
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 0 0 2px rgba(0,122,255,0.3)'

    new mapboxgl.Marker(el)
      .setLngLat([position.longitude, position.latitude])
      .addTo(map.current)
  }, [position])

  // Add note markers to map
  useEffect(() => {
    if (!map.current) return

    // Remove existing markers
    const markers = document.getElementsByClassName('note-marker')
    while (markers[0]) {
      markers[0].remove()
    }

    // Add new markers
    notes.forEach((note) => {
      const el = document.createElement('div')
      el.className = 'note-marker'
      el.style.backgroundColor = '#FF3B30'
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 0 0 2px rgba(255,59,48,0.3)'
      el.style.cursor = 'pointer'

      const marker = new mapboxgl.Marker(el)
        .setLngLat([note.longitude, note.latitude])
        .addTo(map.current)

      if (onNoteSelect) {
        el.addEventListener('click', () => onNoteSelect(note))
      }
    })
  }, [notes, onNoteSelect])

  return (
    <div className={`relative min-h-[300px] ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
    </div>
  )
} 