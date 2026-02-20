type TranscriptChunk = {
  speaker: string
  time: string
  text: string
}

type DownloadProgress = {
  modelId: string
  bytesDownloaded: number
  totalBytes: number
  percent: number
}

type ElectronAPI = {
  db: {
    notes: {
      getAll: () => Promise<any[]>
      get: (id: string) => Promise<any | null>
      add: (note: any) => Promise<boolean>
      update: (id: string, data: any) => Promise<boolean>
      delete: (id: string) => Promise<boolean>
      updateFolder: (noteId: string, folderId: string | null) => Promise<boolean>
    }
    folders: {
      getAll: () => Promise<any[]>
      add: (folder: any) => Promise<boolean>
      update: (id: string, data: any) => Promise<boolean>
      delete: (id: string) => Promise<boolean>
    }
    settings: {
      get: (key: string) => Promise<string | null>
      set: (key: string, value: string) => Promise<boolean>
      getAll: () => Promise<Record<string, string>>
    }
  }
  models: {
    download: (modelId: string) => Promise<boolean>
    cancelDownload: (modelId: string) => Promise<boolean>
    delete: (modelId: string) => Promise<boolean>
    list: () => Promise<string[]>
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
    onDownloadComplete: (callback: (data: { modelId: string; success: boolean; error?: string }) => void) => () => void
  }
  recording: {
    start: (options: { sttModel: string; deviceId?: string }) => Promise<boolean>
    stop: () => Promise<any>
    pause: () => Promise<boolean>
    resume: () => Promise<boolean>
    sendAudioChunk: (pcmData: Float32Array) => Promise<boolean>
    onTranscriptChunk: (callback: (chunk: TranscriptChunk) => void) => () => void
    onRecordingStatus: (callback: (status: { state: string; error?: string }) => void) => () => void
  }
  llm: {
    summarize: (data: { transcript: any[]; personalNotes: string; model: string }) => Promise<any>
    chat: (data: { messages: any[]; context: any; model: string }) => Promise<string>
    onChatChunk: (callback: (chunk: { text: string; done: boolean }) => void) => () => void
  }
  audio: {
    getDevices: () => Promise<any[]>
    getDesktopSources: () => Promise<{ id: string; name: string }[]>
  }
  permissions: {
    checkMicrophone: () => Promise<string>
    requestMicrophone: () => Promise<boolean>
    checkScreenRecording: () => Promise<string>
    requestScreenRecording: () => Promise<string>
  }
  keychain: {
    get: (service: string) => Promise<string | null>
    set: (service: string, value: string) => Promise<boolean>
    delete: (service: string) => Promise<boolean>
  }
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => string
    onTrayStartRecording: (callback: () => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function getElectronAPI(): ElectronAPI | null {
  return window.electronAPI ?? null
}
