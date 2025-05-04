'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import type { Note } from '@/types/notes'
import L from 'leaflet'

interface StickyNoteMarkerProps {
  note: Note
  position: L.LatLng
  isSelected: boolean
  onDragStart?: () => void
  onDrag?: (newPos: L.LatLng) => void
  onDragEnd?: (finalPos: L.LatLng) => void
  onClick?: () => void
  color?: string
}

const stickyNoteVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.2 }
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    opacity: 1,
    transition: { duration: 0.2 }
  },
  dragging: {
    scale: 1.15,
    opacity: 0.9,
    transition: { duration: 0.1 }
  },
  selected: {
    scale: 1.2,
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.3 }
  }
}

export function StickyNoteMarker({
  note,
  position,
  isSelected,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  color = '#ffd700'
}: StickyNoteMarkerProps) {
  const [isDragging, setIsDragging] = useState(false)

  const bind = useDrag(({ first, movement: [mx, my], last }) => {
    if (first) {
      setIsDragging(true)
      onDragStart?.()
    }

    if (last) {
      setIsDragging(false)
      onDragEnd?.(new L.LatLng(position.lat + my / 100, position.lng + mx / 100))
    } else {
      onDrag?.(new L.LatLng(position.lat + my / 100, position.lng + mx / 100))
    }
  })

  const getAnimationState = useCallback(() => {
    if (isDragging) return 'dragging'
    if (isSelected) return 'selected'
    return 'idle'
  }, [isDragging, isSelected])

  return (
    <AnimatePresence>
      <motion.div
        {...bind()}
        initial="idle"
        animate={getAnimationState()}
        whileHover={isDragging ? undefined : 'hover'}
        variants={stickyNoteVariants}
        onClick={onClick}
        className="sticky-note cursor-pointer"
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: color,
          borderRadius: '2px',
          position: 'relative',
          transformOrigin: 'center center',
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        {/* Folded corner effect */}
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderStyle: 'solid',
            borderWidth: '0 8px 8px 0',
            borderColor: `transparent ${color} transparent transparent`,
            filter: 'brightness(85%)'
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
} 