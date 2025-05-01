'use client'

import { useState, useEffect } from 'react'
import type { GeolocationState, GeolocationOptions, GeolocationError } from '@/types/notes'

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
}

export function useGeolocation(options: GeolocationOptions = defaultOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        loading: false,
        error: {
          code: 0,
          message: 'Geolocation is not supported by your browser',
        },
      })
      return
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        loading: false,
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
        error: null,
        timestamp: position.timestamp,
      })
    }

    const handleError = (error: GeolocationPositionError) => {
      setState({
        loading: false,
        position: null,
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge])

  return state
} 