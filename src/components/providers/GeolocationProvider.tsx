'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { GeolocationState, GeolocationOptions } from '@/types/notes'

interface GeolocationContextType extends GeolocationState {
  updateOptions: (options: Partial<GeolocationOptions>) => void
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined)

interface GeolocationProviderProps {
  children: ReactNode
  options?: GeolocationOptions
}

export function GeolocationProvider({ children, options }: GeolocationProviderProps) {
  const geolocationState = useGeolocation(options)

  const updateOptions = (newOptions: Partial<GeolocationOptions>) => {
    // Options are handled through props, so parent component needs to update them
    console.log('Update options:', newOptions)
  }

  return (
    <GeolocationContext.Provider value={{ ...geolocationState, updateOptions }}>
      {children}
    </GeolocationContext.Provider>
  )
}

export function useGeolocationContext() {
  const context = useContext(GeolocationContext)
  if (context === undefined) {
    throw new Error('useGeolocationContext must be used within a GeolocationProvider')
  }
  return context
} 