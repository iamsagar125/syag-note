

## Live Meeting Indicator -- Floating Widget

Create a new standalone floating indicator component that mimics an always-visible recording widget. In a web context, this will be a fixed-position widget pinned to the right edge of the viewport, visible across all pages when a recording session is active. (True cross-app visibility requires Electron -- this lays the groundwork for that.)

### New File: `src/components/LiveMeetingIndicator.tsx`

A right-edge floating widget with two states:

**Collapsed (default):**
- Fixed to the right edge of the screen, vertically centered
- 44px circle showing the Syag favicon (`/favicon.png?v=2`)
- Pulsing amber ring animation around the circle to signal active recording
- Slightly offset so it peeks from the edge (half visible)
- Appears with a smooth slide-in from the right

**Expanded (on hover):**
- Smoothly widens to ~240px card
- Dark rounded panel (`bg-foreground/95`) with:
  - Red pulsing dot + "Recording" label
  - Session title (truncated)
  - Live elapsed timer (MM:SS) ticking via a local `setInterval`
  - Click anywhere on the card to navigate back to the recording session
  - X button to stop/dismiss the recording
- Auto-collapses back after 3 seconds when the mouse leaves

### Changes to `src/components/GlobalRecordingBanner.tsx`
- Replace the current top-center pill with a simple import and render of the new `LiveMeetingIndicator` component
- Or remove the banner entirely and render `LiveMeetingIndicator` in its place

### No changes needed to:
- `App.tsx` -- already mounts `GlobalRecordingBanner` globally
- `RecordingContext.tsx` -- already provides all needed data (`activeSession`, `clearSession`, `elapsedSeconds`)

### Animation Details
- **Mount**: `translateX(100%)` to `translateX(50%)` (peeking state) with ease-out
- **Hover expand**: width from 44px to 240px, content fades in with 150ms delay
- **Collapse**: reverse transition, text fades out first then width shrinks
- **Pulse ring**: custom CSS keyframe -- a ring that scales out from the circle and fades, repeating every 2s in amber/accent color

### Technical Notes
- The elapsed timer will use `useEffect` + `setInterval` reading from `activeSession.elapsedSeconds` as the base, incrementing locally each second
- Format helper: `Math.floor(s/60)` and `s%60` padded to MM:SS
- z-index `[9999]` so it floats above everything
- The widget respects the current route -- hidden on `/new-note` (the recording page itself) since controls are already visible there
- For future Electron integration, this component can be extracted into its own `BrowserWindow` with `alwaysOnTop: true` and transparent background to achieve true cross-app floating

