import { powerMonitor, BrowserWindow } from 'electron'
import { setPollInterval } from './meeting-detector'
import { setChunkInterval } from './audio/capture'
import { setSTTThreadCount } from './models/stt-engine'

let mainWindow: BrowserWindow | null = null
let isOnBattery = false

const AC_CONFIG = {
  meetingPollMs: 15000,
  chunkIntervalMs: 30000,
  sttThreads: Math.min(4, Math.floor(require('os').cpus().length / 2)),
}

const BATTERY_CONFIG = {
  meetingPollMs: 30000,
  chunkIntervalMs: 45000,
  sttThreads: Math.max(1, Math.min(2, Math.floor(require('os').cpus().length / 4))),
}

function applyConfig(config: typeof AC_CONFIG, mode: string): void {
  console.log(`[PowerManager] Switching to ${mode} mode`)
  setPollInterval(config.meetingPollMs)
  setChunkInterval(config.chunkIntervalMs)
  setSTTThreadCount(config.sttThreads)
  mainWindow?.webContents.send('power:mode-changed', { onBattery: isOnBattery })
}

export function setupPowerMonitor(win: BrowserWindow): void {
  mainWindow = win

  // Check initial state
  isOnBattery = powerMonitor.isOnBatteryPower()
  if (isOnBattery) {
    applyConfig(BATTERY_CONFIG, 'battery-saving')
  }

  powerMonitor.on('on-ac', () => {
    isOnBattery = false
    applyConfig(AC_CONFIG, 'AC')
  })

  powerMonitor.on('on-battery', () => {
    isOnBattery = true
    applyConfig(BATTERY_CONFIG, 'battery-saving')
  })
}

export function getIsOnBattery(): boolean {
  return isOnBattery
}
