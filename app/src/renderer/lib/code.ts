const LIBRARY_CODE = `
declare const transport: Transport;
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
