import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../resources/trayTemplate.png')
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  if (icon.isEmpty()) {
    icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVQ4jWNgGAWjYBSMglEwCkbBKBgFgwoABOAAATK5GFQAAAAASUVORK5CYII=',
        'base64'
      )
    )
  }

  tray = new Tray(icon)
  tray.setToolTip('Syag')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Syag',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('tray:start-recording')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Syag',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        mainWindow.removeAllListeners('close')
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

export function updateTrayRecordingState(isRecording: boolean): void {
  if (!tray) return
  tray.setToolTip(isRecording ? 'Syag (Recording...)' : 'Syag')
}
