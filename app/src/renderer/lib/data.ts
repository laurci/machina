import { ApolloClient, InMemoryCache, makeVar, useReactiveVar } from "@apollo/client";
import { DEFAULT_CODE } from "./code";
import { randomId } from "./utils";

export const cache = new InMemoryCache();

export const client = new ApolloClient({
	cache,
});

export interface Root {
	projects: Project[];
	selectedProject: Project;
}

export interface Project {
	id: string;
	name: string;
	environments: Environment[];
	selectedEnvironment: Environment;
	tabs: ProjectTab[];
	selectedTab: ProjectTab;
}

export interface ProjectTab {
	id: string;
	name: string;
	code: string;
}

export interface Environment {
	id: string;
	name: string;
	url: string;
	code?: string;
}

function createDefaultRoot(): Root {
	const defaultEnv: Environment = {
		id: randomId(),
		name: "Default",
		url: "http://localhost:9797",
	};

	const tab: ProjectTab = {
		id: randomId(),
		name: "untitled",
		code: DEFAULT_CODE,
	};

	const defaultProject: Project = {
		id: randomId(),
		name: "Welcome",
		environments: [defaultEnv],
		selectedEnvironment: defaultEnv,
		tabs: [tab],
		selectedTab: tab,
	};

	const root: Root = {
		projects: [defaultProject],
		selectedProject: defaultProject,
	};

	return root;
}

const root$ = makeVar<Root>(createDefaultRoot());

export function useData() {
	return useReactiveVar(root$);
}

export function updateData(updater: (root: Root) => void) {
	const root = structuredClone(root$());
	updater(root);

	root.selectedProject = root.projects.find((p) => p.id === root.selectedProject.id)!;
	root.selectedProject.selectedEnvironment = root.selectedProject.environments.find(
		(e) => e.id == root.selectedProject.selectedEnvironment.id
	)!;
	root.selectedProject.selectedTab = root.selectedProject.tabs.find(
		(t) => t.id == root.selectedProject.selectedTab.id
	)!;

	root$(root);
	localStorage.setItem(DATA_KEY, JSON.stringify(root));
}

export function data() {
	return root$();
}

const DATA_KEY = "data";

export async function initStore() {
	const data = localStorage.getItem(DATA_KEY);
	if (data) {
		root$(JSON.parse(data));
	} else {
		localStorage.setItem(DATA_KEY, JSON.stringify(root$()));
	}
}
