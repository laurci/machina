import { ipcMain } from "electron";

import * as compiler from "./compiler";
import * as demo from "./demo";
import * as window from "./window";

const services = {
	demo,
	window,
	compiler,
} as const;

export type Services = typeof services;

function registerServices(obj: any, pre: string[] = []) {
	const keys = Object.keys(obj);
	for (const key of keys) {
		if (typeof obj[key] === "object") {
			registerServices(obj[key], [...pre, key]);
		} else if (typeof obj[key] === "function") {
			ipcMain.handle([...pre, key].join("/"), (_ev, ...args) => {
				return obj[key](...args);
			});
		}
	}
}

export function enableIpc() {
	registerServices(services);
}
