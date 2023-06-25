import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("_ipc", {
	invoke: ipcRenderer.invoke,
});
