import type { Services } from "../../main/ipc";

declare const _ipc: {
	invoke<T = any>(path: string, ...args: any[]): Promise<T>;
};

function createProxy<T = any>(path: string[] = []) {
	return new Proxy(function () {}, {
		get(_, prop: string): T {
			return createProxy([...path, prop]);
		},
		apply(_, __, args) {
			return _ipc.invoke(path.join("/"), ...args);
		},
	}) as unknown as T;
}

export const ipc = createProxy<Services>();
