import { Tray, Menu, BrowserWindow, nativeImage, app, Notification } from 'electron'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

// Meeting state for tray
let currentMeeting: { title: string; startTime: number } | null = null
let isRecording = false
let titleUpdateInterval: ReturnType<typeof setInterval> | null = null

// Colored tray icon (like Claude, Notion, ChatGPT) — visible in light and dark menu bar
const TRAY_ICON_BG = '#9B7B4F'
const TRAY_ICON_FG = '#FFFFFF'

function createTrayIcon(): Electron.NativeImage {
  const size = 22
  const scale = 2
  const s = size * scale
  const r = s * 0.22

  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${TRAY_ICON_BG}"/>
    <text x="${s / 2}" y="${s * 0.72}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="${s * 0.58}" font-weight="700" text-anchor="middle" fill="${TRAY_ICON_FG}">S</text>
  </svg>`

  const img = nativeImage.createFromBuffer(Buffer.from(svg), { width: size, height: size, scaleFactor: scale })
  return img
}

function createRecordingIcon(): Electron.NativeImage {
  const size = 22
  const scale = 2
  const s = size * scale
  const r = s * 0.22

  const svg = `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${TRAY_ICON_BG}"/>
    <text x="${s * 0.42}" y="${s * 0.72}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="${s * 0.5}" font-weight="700" text-anchor="middle" fill="${TRAY_ICON_FG}">S</text>
    <circle cx="${s * 0.78}" cy="${s * 0.22}" r="${s * 0.14}" fill="#E53935"/>
  </svg>`

  const img = nativeImage.createFromBuffer(Buffer.from(svg), { width: size, height: size, scaleFactor: scale })
  return img
}

function formatElapsed(startTime: number): string {
  const sec = Math.floor((Date.now() - startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function startTitleUpdater(): void {
  stopTitleUpdater()
  updateTrayTitle()
  titleUpdateInterval = setInterval(updateTrayTitle, 1000)
}

function stopTitleUpdater(): void {
  if (titleUpdateInterval) {
    clearInterval(titleUpdateInterval)
    titleUpdateInterval = null
  }
}

function updateTrayTitle(): void {
  if (!tray) return

  if (isRecording && currentMeeting) {
    // Show: "Meeting Name  00:42" next to the tray icon (like Apple Music shows song title)
    const elapsed = formatElapsed(currentMeeting.startTime)
    const shortTitle = currentMeeting.title.length > 20
      ? currentMeeting.title.slice(0, 18) + '…'
      : currentMeeting.title
    tray.setTitle(` ${shortTitle}  ${elapsed}`)
  } else if (isRecording) {
    tray.setTitle(' Recording')
  } else {
    tray.setTitle('')
  }
}

export function setupTray(win: BrowserWindow): void {
  mainWindow = win
  const icon = createTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('Syag')

  rebuildMenu()

  tray.on('click', () => {
    if (isRecording) {
      // If a meeting is running, clicking the tray icon navigates to that meeting
      mainWindow?.show()
      mainWindow?.focus()
      mainWindow?.webContents.send('tray:navigate-to-meeting')
    } else {
      if (mainWindow?.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow?.show()
      }
    }
  })
}

function rebuildMenu(): void {
  if (!tray || !mainWindow) return

  const template: Electron.MenuItemConstructorOptions[] = []

  if (isRecording && currentMeeting) {
    // Active meeting header
    template.push({
      label: `● ${currentMeeting.title}`,
      enabled: false,
    })
    template.push({
      label: `  ${formatElapsed(currentMeeting.startTime)} elapsed`,
      enabled: false,
    })
    template.push({ type: 'separator' })
    template.push({
      label: 'Open Meeting',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('tray:navigate-to-meeting')
      }
    })
    template.push({
      label: 'Pause Recording',
      click: () => {
        mainWindow?.webContents.send('tray:pause-recording')
      }
    })
    template.push({
      label: 'End Meeting',
      click: () => {
        mainWindow?.webContents.send('tray:stop-recording')
      }
    })
  } else if (isRecording) {
    template.push({
      label: '● Recording...',
      enabled: false,
    })
    template.push({ type: 'separator' })
    template.push({
      label: 'Open Recording',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('tray:navigate-to-meeting')
      }
    })
    template.push({
      label: 'Stop Recording',
      click: () => {
        mainWindow?.webContents.send('tray:stop-recording')
      }
    })
  } else {
    template.push({
      label: 'New Note',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('tray:start-recording')
      }
    })
  }

  template.push({ type: 'separator' })
  template.push({
    label: 'Show Syag',
    click: () => {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
  template.push({ type: 'separator' })
  template.push({
    label: 'Quit Syag',
    accelerator: 'CommandOrControl+Q',
    click: () => {
      mainWindow?.removeAllListeners('close')
      app.quit()
    }
  })

  tray.setContextMenu(Menu.buildFromTemplate(template))
}

export function updateTrayRecordingState(recording: boolean): void {
  isRecording = recording
  if (!tray) return

  tray.setToolTip(recording ? 'Syag — Recording' : 'Syag')
  tray.setImage(recording ? createRecordingIcon() : createTrayIcon())

  if (recording) {
    startTitleUpdater()
  } else {
    stopTitleUpdater()
    tray.setTitle('')
    currentMeeting = null
  }

  rebuildMenu()
}

export function updateTrayMeetingInfo(info: { title: string; startTime: number } | null): void {
  currentMeeting = info
  if (info && isRecording) {
    startTitleUpdater()
  }
  rebuildMenu()
}

export function showMeetingDetectedNotification(meetingTitle: string, appName: string): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: 'Meeting Detected',
    body: `${meetingTitle} on ${appName} — Click to start taking notes`,
    silent: false,
  })

  notification.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
    mainWindow?.webContents.send('tray:start-recording')
  })

  notification.show()
}
