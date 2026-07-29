"use strict";
const electron = require("electron");
const IPC = {
  getSettings: "settings:get",
  setSettings: "settings:set",
  breakStart: "break:start",
  breakAction: "break:action",
  breakExtend: "break:extend",
  takeBreakNow: "break:take-now",
  getBreak: "break:get",
  blinkDone: "blink:done",
  takeBlinkNow: "blink:take-now",
  status: "status:update",
  getStats: "stats:get",
  resetStats: "stats:reset",
  statsUpdate: "stats:update",
  reminderShow: "reminder:show",
  reminderAction: "reminder:action",
  takeReminderNow: "reminder:take-now",
  getReminder: "reminder:get",
  checkUpdate: "update:check",
  getUpdate: "update:get",
  updateAvailable: "update:changed",
  openUpdatePage: "update:open",
  startFocus: "focus:start",
  endFocus: "focus:end",
  getFocus: "focus:get",
  focusUpdate: "focus:changed",
  getAppInfo: "app:get-info",
  quitApp: "app:quit"
};
const api = {
  getSettings: () => electron.ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch) => electron.ipcRenderer.invoke(IPC.setSettings, patch),
  onBreakStart: (cb) => {
    const h = (_e, p) => cb(p);
    electron.ipcRenderer.on(IPC.breakStart, h);
    return () => electron.ipcRenderer.removeListener(IPC.breakStart, h);
  },
  breakAction: (action) => electron.ipcRenderer.send(IPC.breakAction, action),
  onBreakExtend: (cb) => {
    const h = (_e, ms) => cb(ms);
    electron.ipcRenderer.on(IPC.breakExtend, h);
    return () => electron.ipcRenderer.removeListener(IPC.breakExtend, h);
  },
  takeBreakNow: (type) => electron.ipcRenderer.send(IPC.takeBreakNow, type),
  getBreak: () => electron.ipcRenderer.invoke(IPC.getBreak),
  takeBlinkNow: () => electron.ipcRenderer.send(IPC.takeBlinkNow),
  blinkDone: () => electron.ipcRenderer.send(IPC.blinkDone),
  getAppInfo: () => electron.ipcRenderer.invoke(IPC.getAppInfo),
  quitApp: () => electron.ipcRenderer.send(IPC.quitApp),
  onStatus: (cb) => {
    const h = (_e, s) => cb(s);
    electron.ipcRenderer.on(IPC.status, h);
    return () => electron.ipcRenderer.removeListener(IPC.status, h);
  },
  getStats: () => electron.ipcRenderer.invoke(IPC.getStats),
  resetStats: () => electron.ipcRenderer.invoke(IPC.resetStats),
  onStatsUpdate: (cb) => {
    const h = (_e, s) => cb(s);
    electron.ipcRenderer.on(IPC.statsUpdate, h);
    return () => electron.ipcRenderer.removeListener(IPC.statsUpdate, h);
  },
  onReminderShow: (cb) => {
    const h = (_e, p) => cb(p);
    electron.ipcRenderer.on(IPC.reminderShow, h);
    return () => electron.ipcRenderer.removeListener(IPC.reminderShow, h);
  },
  getReminder: () => electron.ipcRenderer.invoke(IPC.getReminder),
  reminderAction: (action) => electron.ipcRenderer.send(IPC.reminderAction, action),
  takeReminderNow: (id) => electron.ipcRenderer.send(IPC.takeReminderNow, id),
  checkUpdate: () => electron.ipcRenderer.invoke(IPC.checkUpdate),
  getUpdate: () => electron.ipcRenderer.invoke(IPC.getUpdate),
  openUpdatePage: (url) => electron.ipcRenderer.send(IPC.openUpdatePage, url),
  onUpdateChange: (cb) => {
    const h = (_e, info) => cb(info);
    electron.ipcRenderer.on(IPC.updateAvailable, h);
    return () => electron.ipcRenderer.removeListener(IPC.updateAvailable, h);
  },
  startFocus: (ms) => electron.ipcRenderer.send(IPC.startFocus, ms),
  endFocus: () => electron.ipcRenderer.send(IPC.endFocus),
  getFocus: () => electron.ipcRenderer.invoke(IPC.getFocus),
  onFocusChange: (cb) => {
    const h = (_e, f) => cb(f);
    electron.ipcRenderer.on(IPC.focusUpdate, h);
    return () => electron.ipcRenderer.removeListener(IPC.focusUpdate, h);
  }
};
electron.contextBridge.exposeInMainWorld("eyeprotector", api);
