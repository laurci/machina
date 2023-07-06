export const LIBRARY_CODE = `
interface StoreController<T> {
	(): T;
	(value: T): void;
	(value: (prev: T) => T): void;
	
	set(value: T): void;
  set(value: (prev: T) => T): void;
};

interface Store {
    global<T>(defaultValue: T): StoreController<T>;
    global<T = undefined>(): StoreController<T | undefined>;
    project<T>(defaultValue: T): StoreController<T>;
    project<T>(): StoreController<T | undefined>;
    environment<T>(defaultValue: T): StoreController<T>;
    environment<T>(): StoreController<T | undefined>;
};

declare const transport: Transport & { headers: Record<string, string> };
declare const store: Store;
const client = createClient(transport);
`.trim();

const MARKER = "/** machina: user code **/\n";

export const DEFAULT_CODE = `
${MARKER}
// explore machinery APIs with machina
`;

export function getEditorCode(userCode: string, environmentCode: string) {
	return `
${environmentCode}
${LIBRARY_CODE}
${MARKER}
${userCode}
`;
}

export function extractUserCode(code: string) {
	return code.split(MARKER + "\n")[1] ?? code;
}

export function replaceEnvironmentCode(code: string, environmentCode: string) {
	return `
${environmentCode}
${LIBRARY_CODE}
${MARKER}
${extractUserCode(code)}
`;
}

export function getUserCodeStartLine(code: string) {
	return (code.split(MARKER)[0]?.split("\n")?.length ?? 0) + 1;
}
