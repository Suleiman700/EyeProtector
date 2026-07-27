"use strict";
const electron = require("electron");
const IPC = {
  getSettings: "settings:get",
  setSettings: "settings:set",
  breakStart: "break:start",
  breakAction: "break:action",
  takeBreakNow: "break:take-now",
  getBreak: "break:get",
  blinkDone: "blink:done",
  takeBlinkNow: "blink:take-now",
  status: "status:update"
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
  takeBreakNow: () => electron.ipcRenderer.send(IPC.takeBreakNow),
  getBreak: () => electron.ipcRenderer.invoke(IPC.getBreak),
  takeBlinkNow: () => electron.ipcRenderer.send(IPC.takeBlinkNow),
  blinkDone: () => electron.ipcRenderer.send(IPC.blinkDone),
  onStatus: (cb) => {
    const h = (_e, s) => cb(s);
    electron.ipcRenderer.on(IPC.status, h);
    return () => electron.ipcRenderer.removeListener(IPC.status, h);
  }
};
electron.contextBridge.exposeInMainWorld("eyeprotector", api);
