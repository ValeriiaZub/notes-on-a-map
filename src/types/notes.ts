export interface Note {
  id?: string
  user_id?: string
  content: string
  latitude: number
  longitude: number
  accuracy?: number
  created_at?: string
  updated_at?: string
  sync_status?: 'synced' | 'pending' | 'conflict'
  version?: number
  startInEditMode?: boolean; // Flag to indicate if the note should start in edit mode
}

export interface GeolocationState {
  position: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
  error: GeolocationError | null
  loading: boolean
  timestamp?: number
}

export interface GeolocationError {
  code: number
  message: string
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export interface NoteChange {
  type: 'create' | 'update' | 'delete'
  note: Note
  timestamp: number
}

export type ConflictStrategy = 'client' | 'server' | 'manual'

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error'
  lastSynced?: Date
  pendingChanges: number
  error?: string
} 