# Task 1.8: Implement Editable Sticky Notes on Map

## Success Criteria

Based on the user request and Figma prototype:

- [x] **Marker Styling:** Basic sticky note styling (background, shadow, Permanent Marker font) applied directly to the marker component. *Note: Advanced styling like rotation and multiple colors from README reqs not implemented.*
- [x] **Interaction:** Clicking/tapping a sticky note marker enables direct in-place editing on the marker itself.
- [ ] **Popup/Modal Styling:** N/A - The requirement shifted to direct inline editing on the marker, eliminating the need for a separate popup/modal.
- [x] **In-Place Editing:** The note content is editable directly within the marker component using a `<textarea>`.
- [x] **Save Mechanism:** Changes are saved back to Supabase via a Save button or automatically on clicking outside the editing area.
- [x] **Reactive Update:** After saving, the note content displayed on the marker updates immediately via component state and the `onNoteUpdate` callback.
- [x] **Error Handling:** Basic error handling displays a message within the marker component if saving fails.
- [x] **Code Quality:** Implementation uses custom React components (`EditableStickyNoteIcon`, `InteractiveStickyMarker`), React hooks, `createPortal`, Supabase client function, and attempts to follow project patterns.

## Implementation Summary

Implemented editable sticky notes directly on the map, replacing the previous popup approach.

- Created `EditableStickyNoteIcon.tsx` to handle the display, styling (including Permanent Marker font), editing state, and Supabase save logic for a single note.
- Created `InteractiveStickyMarker.tsx` which uses `react-leaflet`'s `useMap` hook and `createPortal` to render the `EditableStickyNoteIcon` component into a Leaflet-managed DOM element positioned on the map. This allows the React component to function as the marker itself.
- Modified `MapView.tsx` to use `InteractiveStickyMarker` instead of the standard Leaflet `Marker` and `Popup`.
- Updated `layout.tsx` to load the "Permanent Marker" font via `next/font/google`.
- Editing is triggered by clicking the note; saving occurs via button or clicking outside.

*Note: Drag-and-drop functionality for the new markers needs to be re-implemented separately.*

## Files Modified/Created

- **Created:** `src/components/notes/EditableStickyNoteIcon.tsx`
- **Created:** `src/components/map/InteractiveStickyMarker.tsx`
- **Modified:** `src/components/map/MapView.tsx` (Replaced Marker/Popup with InteractiveStickyMarker)
- **Modified:** `src/app/layout.tsx` (Added Permanent Marker font)
- **Modified:** `changes/task1.8.md` (This file)