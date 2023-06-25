export async function hello(name: string) {
	return `Hello, ${name}!`;
}

export async function print(message: string) {
	console.log("ipc:print", message);
}
