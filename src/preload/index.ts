import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type AppInfo,
  type BreakAction,
  type BreakPayload,
  type ReminderAction,
  type ReminderPayload,
  type StatusPayload,
  type UpdateInfo,
  type FocusState
} from '../shared/ipc'
import type { AppSettings } from '../shared/settings'
import type { StatsData } from '../shared/stats'

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
  onBreakExtend: (cb: (ms: number) => void): (() => void) => {
    const h = (_e: unknown, ms: number): void => cb(ms)
    ipcRenderer.on(IPC.breakExtend, h)
    return () => ipcRenderer.removeListener(IPC.breakExtend, h)
  },
  takeBreakNow: (type?: 'short' | 'long'): void => ipcRenderer.send(IPC.takeBreakNow, type),
  getBreak: (): Promise<BreakPayload | null> => ipcRenderer.invoke(IPC.getBreak),
  takeBlinkNow: (): void => ipcRenderer.send(IPC.takeBlinkNow),
  blinkDone: (): void => ipcRenderer.send(IPC.blinkDone),
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.getAppInfo),
  quitApp: (): void => ipcRenderer.send(IPC.quitApp),
  onStatus: (cb: (s: StatusPayload) => void): (() => void) => {
    const h = (_e: unknown, s: StatusPayload): void => cb(s)
    ipcRenderer.on(IPC.status, h)
    return () => ipcRenderer.removeListener(IPC.status, h)
  },
  getStats: (): Promise<StatsData> => ipcRenderer.invoke(IPC.getStats),
  resetStats: (): Promise<StatsData> => ipcRenderer.invoke(IPC.resetStats),
  onStatsUpdate: (cb: (s: StatsData) => void): (() => void) => {
    const h = (_e: unknown, s: StatsData): void => cb(s)
    ipcRenderer.on(IPC.statsUpdate, h)
    return () => ipcRenderer.removeListener(IPC.statsUpdate, h)
  },
  onReminderShow: (cb: (p: ReminderPayload) => void): (() => void) => {
    const h = (_e: unknown, p: ReminderPayload): void => cb(p)
    ipcRenderer.on(IPC.reminderShow, h)
    return () => ipcRenderer.removeListener(IPC.reminderShow, h)
  },
  getReminder: (): Promise<ReminderPayload | null> => ipcRenderer.invoke(IPC.getReminder),
  reminderAction: (action: ReminderAction): void => ipcRenderer.send(IPC.reminderAction, action),
  takeReminderNow: (id: string): void => ipcRenderer.send(IPC.takeReminderNow, id),
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC.checkUpdate),
  getUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC.getUpdate),
  openUpdatePage: (url: string): void => ipcRenderer.send(IPC.openUpdatePage, url),
  onUpdateChange: (cb: (info: UpdateInfo) => void): (() => void) => {
    const h = (_e: unknown, info: UpdateInfo): void => cb(info)
    ipcRenderer.on(IPC.updateAvailable, h)
    return () => ipcRenderer.removeListener(IPC.updateAvailable, h)
  },
  startFocus: (ms: number): void => ipcRenderer.send(IPC.startFocus, ms),
  endFocus: (): void => ipcRenderer.send(IPC.endFocus),
  getFocus: (): Promise<FocusState> => ipcRenderer.invoke(IPC.getFocus),
  onFocusChange: (cb: (f: FocusState) => void): (() => void) => {
    const h = (_e: unknown, f: FocusState): void => cb(f)
    ipcRenderer.on(IPC.focusUpdate, h)
    return () => ipcRenderer.removeListener(IPC.focusUpdate, h)
  }
}

contextBridge.exposeInMainWorld('eyeprotector', api)
export type EyeProtectorApi = typeof api
