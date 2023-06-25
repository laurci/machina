import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.scss";
import { initStore } from "./lib/data";

const element = document.getElementById("root") as HTMLElement;
const root = createRoot(element);

async function main() {
	await initStore();

	root.render(<App />);
}

main();
