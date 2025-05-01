export interface Note {
  id?: string
  user_id?: string
  content: string
  latitude: number
  longitude: number
  accuracy?: number
  created_at?: string
  updated_at?: string
}

export interface GeolocationState {
  position: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  error: GeolocationError | null
  loading: boolean
  timestamp?: number
}

export type GeolocationError = {
  code: number
  message: string
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
} 