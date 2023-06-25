import { BrowserWindow } from "electron";

export async function close() {
	BrowserWindow.getFocusedWindow()?.close();
}

export async function minimize() {
	BrowserWindow.getFocusedWindow()?.minimize();
}

export async function maximize() {
	const win = BrowserWindow.getFocusedWindow();
	if (win?.isMaximized()) {
		win.unmaximize();
	} else {
		win?.maximize();
	}
}
