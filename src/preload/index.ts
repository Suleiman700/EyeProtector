import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type BreakAction, type BreakPayload, type StatusPayload } from '../shared/ipc'
import type { AppSettings } from '../shared/settings'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.setSettings, patch),
  onBreakStart: (cb: (p: BreakPayload) => void): (() => void) => {
    const h = (_e: unknown, p: BreakPayload): void => cb(p)
    ipcRenderer.on(IPC.breakStart, h)
    return () => ipcRenderer.removeListener(IPC.breakStart, h)
  },
  breakAction: (action: BreakAction): void => ipcRenderer.send(IPC.breakAction, action),
  takeBreakNow: (): void => ipcRenderer.send(IPC.takeBreakNow),
  getBreak: (): Promise<BreakPayload | null> => ipcRenderer.invoke(IPC.getBreak),
  takeBlinkNow: (): void => ipcRenderer.send(IPC.takeBlinkNow),
  blinkDone: (): void => ipcRenderer.send(IPC.blinkDone),
  onStatus: (cb: (s: StatusPayload) => void): (() => void) => {
    const h = (_e: unknown, s: StatusPayload): void => cb(s)
    ipcRenderer.on(IPC.status, h)
    return () => ipcRenderer.removeListener(IPC.status, h)
  }
}

contextBridge.exposeInMainWorld('eyeprotector', api)
export type EyeProtectorApi = typeof api
