import { Box, FormErrorIcon, IconButton, Spinner, Text } from "@chakra-ui/react";

import {
	ArrowForwardIcon,
	CloseIcon,
	InfoIcon,
	TimeIcon,
	TriangleUpIcon,
	WarningIcon,
	WarningTwoIcon,
} from "@chakra-ui/icons";
import { Editor } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor/esm/vs/editor/editor.api";
import { useEffect, useRef, useState } from "react";
import ReactJson from "react-json-view";
import Lottie from "react-lottie";
import emptyAnimation from "../../animations/empty.json";
import { LIBRARY_CODE, getUserCodeStartLine, replaceEnvironmentCode } from "../lib/code";
import { data, updateData, useData } from "../lib/data";
import { ipc } from "../lib/ipc";
import { randomId } from "../lib/utils";

type Monaco = typeof MonacoNs;

interface ICustomStandaloneCodeEditor extends MonacoNs.editor.IStandaloneCodeEditor {
	setHiddenAreas(range: MonacoNs.IRange[]): void;
}

interface Transport {
	headers: Record<string, string>;
	send(fn: string, args: string): Promise<string>;
	_use(): void;
}

interface RequestData {
	id: string;
	timestamp: number;
	status: "pending" | "success" | "error";
	headers: Record<string, string>;
	method: string;
	args: any[];
	result?: any;
	error?: Error;
	responseTime?: number;
}

interface LogData {
	id: string;
	timestamp: number;
	level: "info" | "warn" | "error";
	message: any[];
}

interface LogItem {
	log?: LogData;
	request?: RequestData;
}

function isLogData(item: LogItem): item is { log: LogData } {
	return item.log !== undefined;
}

function isRequestData(item: LogItem): item is { request: RequestData } {
	return item.request !== undefined;
}

function createTransport(baseUrl: string, pushRequest: (data: RequestData) => void): Transport {
	const url = `${baseUrl}/x`;

	const headers: Record<string, string> = {};

	return {
		headers,
		async send(fn: string, args: string): Promise<string> {
			const requestId = randomId();

			const request: RequestData = {
				id: requestId,
				headers,
				timestamp: Date.now(),
				status: "pending",
				method: fn,
				args: JSON.parse(args.trim().length == 0 ? "[]" : args.trim()),
			};

			pushRequest(request);

			const start = Date.now();
			return fetch(url, {
				method: "POST",
				headers: {
					...headers,
					"x-machinery-service": fn,
				},
				body: args,
			})
				.then(async (res) => {
					const data = await res.text();
					const returnData = JSON.parse(data);
					if (returnData.error) {
						request.status = "error";
						request.error = new Error(returnData.error);
					} else {
						request.status = "success";
						request.result = returnData.result;
					}
					request.responseTime = Date.now() - start;
					pushRequest(request);
					return data;
				})
				.catch((err: any) => {
					request.error = err;
					request.status = "error";
					request.responseTime = Date.now() - start;
					pushRequest(request);
					throw err;
				});
		},
		_use() { },
	};
}

function isPrimitive(value: any) {
	return value !== Object(value);
}

function Monitor({ tabId, logs }: WorkspaceProps & { logs: LogItem[] }) {
	const [selectedRequestId, setSelectedRequestId] = useState<string>();

	const selectedRequest = logs.find(
		(item) => isRequestData(item) && item.request.id === selectedRequestId
	)?.request;

	return (
		<Box
			display="flex"
			width="100%"
			height="calc(40% - 3rem)"
			borderTop="1px solid"
			overflowY="auto"
			borderColor="gray.200"
		>
			<Box flex="1" overflowY="auto">
				{logs.length === 0 && (
					<Box
						width="100%"
						height="100%"
						display="flex"
						alignItems="center"
						justifyContent="center"
					>
						<Lottie
							width="100%"
							height="50%"
							isClickToPauseDisabled
							options={{
								animationData: emptyAnimation,
							}}
						/>
					</Box>
				)}
				{logs.map((item) =>
					isLogData(item) ? (
						<Box
							key={item.log.id}
							display="flex"
							gap="0.5rem"
							alignItems="center"
							borderBottom={item.log.level === "error" ? undefined : "1px solid"}
							borderColor="gray.200"
							paddingInline="0.5rem"
							bg={item.log.level === "error" ? "red.100" : undefined}
						>
							{item.log.level === "error" ? (
								<WarningIcon color="red.500" />
							) : item.log.level === "warn" ? (
								<WarningTwoIcon color="yellow.500" />
							) : (
								<InfoIcon color="blue.500" />
							)}
							{item.log.message.map((m) =>
								isPrimitive(m) ? (
									<Box>{m}</Box>
								) : (
									<ReactJson
										src={m}
										collapsed
										name={null}
										displayDataTypes={false}
										iconStyle="square"
									/>
								)
							)}
						</Box>
					) : (
						<Box
							key={item.request?.id}
							display="flex"
							gap="0.5rem"
							alignItems="center"
							borderBottom={item.request?.error ? undefined : "1px solid"}
							borderColor="gray.200"
							paddingInline="0.5rem"
							bg={
								item.request?.error
									? item.request.id === selectedRequest?.id
										? "red.200"
										: "red.100"
									: item.request?.id === selectedRequest?.id
										? "gray.200"
										: undefined
							}
							onClick={() => setSelectedRequestId(item.request?.id)}
						>
							{item.request?.status === "pending" ? (
								<Spinner size="sm" />
							) : item.request?.status === "error" ? (
								<TriangleUpIcon color="red.500" />
							) : (
								<TriangleUpIcon color="green.500" />
							)}
							<Text>{item.request?.method}</Text>
							{item.request?.responseTime ? (
								<Box
									display="flex"
									gap="0.2rem"
									alignItems="center"
									color="blue.400"
								>
									<TimeIcon boxSize={3} />
									<Text fontSize="sm">{item.request?.responseTime}ms</Text>
								</Box>
							) : null}
						</Box>
					)
				)}
			</Box>
			{selectedRequest && (
				<Box
					width="50%"
					height="100%"
					overflowY="auto"
					paddingInline="0.5rem"
					overflowX="hidden"
				>
					<Box
						width="100%"
						position="sticky"
						bg="white"
						zIndex={999}
						top="0"
						display="flex"
						alignItems="center"
						justifyContent="space-between"
						marginRight="0.5rem"
					>
						<Text fontSize="lg" fontWeight="semibold">
							Request Info
						</Text>
						<IconButton
							aria-label="Close request info"
							variant="ghost"
							icon={<CloseIcon boxSize={3} />}
							onClick={() => setSelectedRequestId(undefined)}
						/>
					</Box>
					<Text fontSize="md" display="flex" alignItems="center">
						<Text color="blue.600">{selectedRequest.method}</Text>
						<Text color="green.600">(</Text>
					</Text>
					<Box ml="0.5rem">
						<ReactJson
							src={selectedRequest.args}
							iconStyle="square"
							name={null}
							displayDataTypes={false}
						/>
					</Box>
					<Text fontSize="md" display="flex" alignItems="center" gap="0.5rem">
						<Text color="green.600">)</Text>
						<ArrowForwardIcon />
						{selectedRequest.error ? (
							<Text color="red.500">{selectedRequest.error.message}</Text>
						) : (
							<Text color="green.600">{"{"}</Text>
						)}
					</Text>
					{typeof selectedRequest.result !== "undefined" && (
						<>
							{isPrimitive(selectedRequest.result) ? (
								<Text marginLeft="0.5rem">{String(selectedRequest.result)}</Text>
							) : (
								<ReactJson
									src={selectedRequest.result}
									iconStyle="square"
									name={null}
									displayDataTypes={false}
								/>
							)}
							<Text color="green.600">{"}"}</Text>
						</>
					)}
					{Object.keys(selectedRequest.headers).length > 0 && (
						<>
							<Text fontSize="md" fontWeight="semibold">
								Headers
							</Text>
							<ReactJson
								src={selectedRequest.headers}
								iconStyle="square"
								name={null}
								displayDataTypes={false}
							/>
						</>
					)}
				</Box>
			)}
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

	const [requests, setRequests] = useState<RequestData[]>([]);
	const [logs, setLogs] = useState<LogData[]>([]);
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
		console.log(monaco.languages.typescript.typescriptVersion);
		const cmd = editor.addCommand(0, async (_, label: string, line: number) => {
			const text = editor.getValue();
			try {
				const compiled = await ipc.compiler.compile(text);

				setRequests([]);
				setLogs([]);
				const transport = createTransport(
					data().selectedProject.selectedEnvironment.url,
					(req) => {
						setRequests((reqs) => {
							// if req.id exists, replace it
							const idx = reqs.findIndex((r) => r.id === req.id);
							if (idx !== -1) {
								reqs[idx] = req;
								return [...reqs];
							}

							return [...reqs, req];
						});
					}
				);
				transport._use();

				const pushLog = (level: "info" | "warn" | "error", ...args: any[]) => {
					const id = randomId();
					const log: LogData = {
						id,
						level,
						message: args,
						timestamp: Date.now(),
					};

					setLogs((logs) => [...logs, log]);
				};

				const console = {
					log: (...args: any[]) => pushLog("info", ...args),
					info: (...args: any[]) => pushLog("info", ...args),
					warn: (...args: any[]) => pushLog("warn", ...args),
					error: (...args: any[]) => pushLog("error", ...args),
				};

				const exports = {} as any;
				eval(compiled);

				// console.log(compiled);

				const funcName = `exec_${label}_${line}`;
				try {
					await exports[funcName]();
				} catch (ex: any) {
					if (typeof ex.message === "string") {
						console.error(ex.message);
					}
				}
			} catch (ex: any) {
				console.error(ex);
			}
		});

		let model = editor.getModel() as any;
		model.__machina_executeLabel_cmd = cmd;

		const monacoAny = window as any;
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
					// console.log("provideCodeLenses");
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
								arguments: [label, i],
							},
						});
					}

					return {
						lenses,
						dispose() { },
					};
				},
				resolveCodeLens: async (_model, codeLens, _token) => {
					// console.log("resolveCodeLens", codeLens);
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

				updateData((data) => {
					data.selectedProject.tabs.find((t) => t.id === tabId)!.code = editor.getValue();
				});
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
			<Monitor
				tabId={tabId}
				logs={[
					...logs.map((x) => ({ log: x })),
					...requests.map((x) => ({ request: x })),
				].sort((a, b) => {
					const timeA = isLogData(a) ? a.log.timestamp : a.request.timestamp;
					const timeB = isLogData(b) ? b.log.timestamp : b.request.timestamp;

					return timeA - timeB;
				})}
			/>
		</Box>
	);
}
