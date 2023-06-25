import { Box } from "@chakra-ui/react";

import { Editor } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor/esm/vs/editor/editor.api";
import { useEffect, useRef, useState } from "react";
import { getUserCodeStartLine, replaceEnvironmentCode } from "../lib/code";
import { updateData, useData } from "../lib/data";

type Monaco = typeof MonacoNs;

interface ICustomStandaloneCodeEditor extends MonacoNs.editor.IStandaloneCodeEditor {
	setHiddenAreas(range: MonacoNs.IRange[]): void;
}

function RequestMonitor({ tabId }: WorkspaceProps) {
	return (
		<Box width="100%" height="100%" bg="green">
			{tabId}
		</Box>
	);
}

export interface WorkspaceProps {
	tabId: string;
}

export default function Workspace({ tabId }: WorkspaceProps) {
	const [{ monaco, editor }, setMonaco] = useState<{
		monaco?: Monaco;
		editor?: ICustomStandaloneCodeEditor;
	}>({});

	const {
		selectedProject: { tabs, selectedEnvironment },
	} = useData();

	const tab = tabs.find((t) => t.id === tabId)!;

	const code = tab.code;
	const userCodeStart = getUserCodeStartLine(code);

	const userCodeStartRef = useRef(userCodeStart);

	useEffect(() => {
		if (!selectedEnvironment.code) return;
		if (!editor || !monaco) return;
		const code = replaceEnvironmentCode(tab.code, selectedEnvironment.code);

		updateData((data) => {
			data.selectedProject.tabs.find((t) => t.id === tabId)!.code = code;

			const userCodeStart = getUserCodeStartLine(code);
			userCodeStartRef.current = userCodeStart;

			editor.setValue(code);
			editor.setHiddenAreas([new monaco.Range(0, 0, userCodeStartRef.current - 1, 1)]);
		});
	}, [selectedEnvironment.code]);

	function onMount(editor: ICustomStandaloneCodeEditor, monaco: Monaco) {
		// TODO: init editor
		const cmd = editor.addCommand(0, (editor, ...args) => {
			console.log("machina.executeLabel", editor, args);
		});

		let model = editor.getModel() as any;
		model.__machina_executeLabel_cmd = cmd;

		const monacoAny = monaco as any;
		if (!monacoAny.__configured_mahcina) {
			monacoAny.__configured_mahcina = true;
			monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
				target: monaco.languages.typescript.ScriptTarget.ES2017,
				module: monaco.languages.typescript.ModuleKind.ESNext,
				allowNonTsExtensions: true,
			});

			monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
				diagnosticCodesToIgnore: [7028],
			});

			monaco.languages.registerCodeLensProvider("typescript", {
				provideCodeLenses: async (model, _token) => {
					console.log("provideCodeLenses");
					const modelAny = model as any;
					const cmd = modelAny.__machina_executeLabel_cmd as string;

					const lenses: MonacoNs.languages.CodeLens[] = [];

					const reg = /^([a-zA-Z0-9]+)\:/;

					const lines = model.getLinesContent();
					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						const match = reg.exec(line);
						if (!match) continue;

						const label = match[1] as string;

						lenses.push({
							range: new monaco.Range(i + 1, 0, i + 1, 0),
							command: {
								id: cmd,
								title: `Execute '${label}'`,
								arguments: [label],
							},
						});
					}

					return {
						lenses,
						dispose() {},
					};
				},
				resolveCodeLens: async (_model, codeLens, _token) => {
					console.log("resolveCodeLens", codeLens);
					return codeLens;
				},
			});

			editor.onDidChangeCursorPosition((e) => {
				if (e.position.lineNumber <= userCodeStartRef.current) {
					editor.setPosition({ lineNumber: userCodeStartRef.current, column: 0 });
				}
			});

			editor.onDidChangeModelContent((e) => {
				for (const change of e.changes) {
					if (change.range.startLineNumber <= userCodeStartRef.current) {
						editor.trigger("undo", "undo", null);
						return;
					}
				}
			});

			editor.setValue(code);
			editor.setHiddenAreas([new monaco.Range(0, 0, userCodeStartRef.current - 1, 1)]);
		}

		setMonaco({ editor, monaco });
	}

	return (
		<Box width="100%" height="100%">
			<Box width="100%" height="60%">
				<Editor
					onMount={(editor, monaco) => {
						onMount(editor as ICustomStandaloneCodeEditor, monaco);
					}}
					width="100%"
					height="100%"
					defaultLanguage="typescript"
					defaultValue={""}
					options={{
						lineNumbers: "off",
						minimap: {
							enabled: false,
						},
					}}
				/>
			</Box>
			<RequestMonitor tabId={tabId} />
		</Box>
	);
}
