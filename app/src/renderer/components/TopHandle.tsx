import {
	AddIcon,
	ChevronDownIcon,
	EditIcon,
	ExternalLinkIcon,
	HamburgerIcon,
	RepeatIcon,
	SettingsIcon,
	WarningIcon,
	WarningTwoIcon,
} from "@chakra-ui/icons";
import {
	Box,
	Button as ChakraButton,
	Divider,
	Drawer,
	DrawerBody,
	DrawerCloseButton,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	IconButton,
	Input,
	Menu,
	MenuButton,
	MenuDivider,
	MenuItem,
	MenuList,
	useToast,
} from "@chakra-ui/react";

import { useEffect, useState } from "react";
import { DEFAULT_CODE } from "../lib/code";
import { Environment, Project, ProjectTab, updateData, useData } from "../lib/data";
import { ipc } from "../lib/ipc";
import { randomId } from "../lib/utils";

function Button({
	focus,
	color,
	onClick,
}: {
	focus: boolean;
	color: string;
	onClick?: () => void;
}) {
	const [hover, setHover] = useState(false);
	return (
		<Box
			bg={!focus ? "gray.300" : hover ? `${color}.500` : `${color}.400`}
			height="0.8rem"
			width="0.8rem"
			borderRadius="50%"
			display="flex"
			alignItems="center"
			justifyContent="center"
			borderColor={!focus ? "gray.400" : "transparent"}
			borderWidth="1px"
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		></Box>
	);
}

function Buttons() {
	const [focus, setFocus] = useState(document.hasFocus());

	useEffect(() => {
		function onBlur() {
			setFocus(false);
		}

		function onFocus() {
			setFocus(true);
		}

		window.addEventListener("blur", onBlur);
		window.addEventListener("focus", onFocus);

		return () => {
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("focus", onFocus);
		};
	}, []);

	return (
		<Box className="top-handle-control" display="flex" gap="0.5rem">
			<Button focus={focus} color="red" onClick={() => ipc.window.close()} />
			<Button focus={focus} color="yellow" onClick={() => ipc.window.minimize()} />
			<Button focus={focus} color="green" onClick={() => ipc.window.maximize()} />
		</Box>
	);
}

function ProjectZone() {
	const { projects, selectedProject } = useData();

	const [isOpen, setIsOpen] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");
	const [newEnvironmentUrl, setNewEnvironmentUrl] = useState("http://");

	function createProject(name: string, url: string) {
		updateData((data) => {
			const env: Environment = {
				id: randomId(),
				name: "Default",
				url,
			};

			const tab: ProjectTab = {
				id: randomId(),
				name: "untitled",
				code: DEFAULT_CODE,
			};

			const project: Project = {
				id: randomId(),
				name,
				environments: [env],
				selectedEnvironment: env,
				tabs: [tab],
				selectedTab: tab,
			};

			data.projects.push(project);
			data.selectedProject = project;
		});
	}

	function selectProject(projectId: string) {
		updateData((data) => {
			const proj = data.projects.find((p) => p.id === projectId);
			if (proj) {
				data.selectedProject = proj;
			}
		});
	}

	return (
		<>
			<Drawer
				isOpen={isOpen}
				placement="right"
				size="md"
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<DrawerOverlay />
				<DrawerContent>
					<DrawerCloseButton />
					<DrawerHeader>Create new project</DrawerHeader>

					<DrawerBody>
						<Input
							value={newProjectName}
							onChange={(e) => setNewProjectName(e.target.value)}
							placeholder="Project name..."
						/>

						<Divider marginBlock="1rem" />

						<Input
							value={newEnvironmentUrl}
							onChange={(e) => setNewEnvironmentUrl(e.target.value)}
							placeholder="Environment url..."
						/>
					</DrawerBody>

					<DrawerFooter>
						<ChakraButton variant="outline" mr={3} onClick={() => setIsOpen(false)}>
							Cancel
						</ChakraButton>
						<ChakraButton
							colorScheme="gray"
							onClick={() => createProject(newProjectName, newEnvironmentUrl)}
						>
							Save
						</ChakraButton>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
			<Box className="top-handle-control" display="flex" gap="1rem" minWidth="40%">
				<Menu>
					<MenuButton
						as={IconButton}
						aria-label="Project options"
						size="sm"
						icon={<HamburgerIcon />}
						variant="outline"
					/>
					<MenuList>
						<MenuItem icon={<EditIcon />} command="⌘O">
							Open File...
						</MenuItem>
						<MenuDivider />
						<MenuItem
							icon={<SettingsIcon />}
							onClick={() => ipc.window.toggleDevTools()}
						>
							Toggle DevTools
						</MenuItem>
					</MenuList>
				</Menu>
				<Menu>
					<MenuButton
						as={ChakraButton}
						variant="outline"
						rightIcon={<ChevronDownIcon />}
						size="sm"
						fontWeight="light"
						width="100%"
					>
						{selectedProject.name}
					</MenuButton>
					<MenuList width="100%">
						{projects.map((project) => (
							<MenuItem key={project.id} onClick={() => selectProject(project.id)}>
								{project.name}
							</MenuItem>
						))}
						<MenuDivider />
						<MenuItem icon={<AddIcon />} onClick={() => setIsOpen(true)}>
							Create a new project
						</MenuItem>
					</MenuList>
				</Menu>
			</Box>
		</>
	);
}

function EnvironmentZone() {
	const [isOpen, setIsOpen] = useState(false);
	const [isEdit, setIsEdit] = useState(false);
	const [newEnvironmentName, setNewEnvironmentName] = useState("");
	const [newEnvironmentUrl, setNewEnvironmentUrl] = useState("http://");

	const toast = useToast();

	const {
		selectedProject: { id: projectId, environments, selectedEnvironment },
	} = useData();

	function createEnvironment(name: string, url: string) {
		updateData((data) => {
			const project = data.projects.find((p) => p.id === projectId);
			if (!project) return;

			const env: Environment = {
				id: randomId(),
				name,
				url,
			};

			project.environments.push(env);
			project.selectedEnvironment = env;
		});
	}

	function openEditEnvironment() {
		setIsEdit(true);
		setNewEnvironmentName(selectedEnvironment.name);
		setNewEnvironmentUrl(selectedEnvironment.url ?? "http://");
		setIsOpen(true);
	}

	function editEnvironmentConfirm(name: string, url: string) {
		updateData((data) => {
			const project = data.projects.find((p) => p.id === projectId);
			if (!project) return;

			const env = project.environments.find((e) => e.id === selectedEnvironment.id);
			if (!env) return;

			env.name = name;
			env.url = url;
		});

		setNewEnvironmentName("");
		setNewEnvironmentUrl("http://");

		setIsEdit(false);
		setIsOpen(false);
	}

	function selectEnvironment(environmentId: string) {
		updateData((data) => {
			const project = data.projects.find((p) => p.id === projectId);
			if (!project) return;

			const env = project.environments.find((e) => e.id === environmentId);
			if (!env) return;

			project.selectedEnvironment = env;
		});
	}

	return (
		<>
			<Drawer
				isOpen={isOpen}
				placement="right"
				size="md"
				onClose={() => {
					setIsOpen(false);
					setIsEdit(false);
				}}
			>
				<DrawerOverlay />
				<DrawerContent>
					<DrawerCloseButton />
					<DrawerHeader>
						{isEdit
							? `Edit environment ${selectedEnvironment.name}`
							: "Create a new environment"}
					</DrawerHeader>

					<DrawerBody>
						<Input
							value={newEnvironmentName}
							onChange={(e) => setNewEnvironmentName(e.target.value)}
							placeholder="Environment name..."
						/>

						<Divider marginBlock="1rem" />

						<Input
							value={newEnvironmentUrl}
							onChange={(e) => setNewEnvironmentUrl(e.target.value)}
							placeholder="Environment url..."
						/>
					</DrawerBody>

					<DrawerFooter>
						<ChakraButton
							variant="outline"
							mr={3}
							onClick={() => {
								setIsOpen(false);
								setIsEdit(false);
							}}
						>
							Cancel
						</ChakraButton>
						<ChakraButton
							colorScheme="gray"
							onClick={() => {
								if (isEdit) {
									editEnvironmentConfirm(newEnvironmentName, newEnvironmentUrl);
									return;
								}

								createEnvironment(newEnvironmentName, newEnvironmentUrl);
								setNewEnvironmentName("");
								setNewEnvironmentUrl("http://");
								setIsOpen(false);
							}}
						>
							Save
						</ChakraButton>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
			<Box className="top-handle-control" display="flex" gap="1rem">
				<IconButton
					aria-label="Refetch"
					icon={<RepeatIcon />}
					variant="outline"
					size="sm"
					onClick={async () => {
						const url = `${selectedEnvironment.url}/x`;
						try {
							const response = await fetch(url, {
								method: "POST",
								headers: {
									"x-machinery-service": "machinery_introspection::ts_client",
								},
							}).then((res) => res.json());

							updateData((data) => {
								const project = data.projects.find((p) => p.id === projectId);
								if (!project) return;

								const env = project.environments.find(
									(e) => e.id === selectedEnvironment.id
								);
								if (!env) return;

								env.code = response.result;
							});

							toast({
								title: "Success",
								description: `Successfully fetched '${url}'`,
								status: "success",
								duration: 2000,
								isClosable: true,
							});
						} catch {
							toast({
								title: "Error",
								description: `Something went wrong while fetching '${url}'`,
								status: "error",
								duration: 4000,
								isClosable: true,
							});
						}
					}}
				/>
				<Menu>
					<MenuButton
						as={ChakraButton}
						variant="outline"
						rightIcon={<ChevronDownIcon />}
						leftIcon={
							!selectedEnvironment.code ? (
								<WarningTwoIcon color="orange" />
							) : undefined
						}
						size="sm"
						fontWeight="light"
						width="100%"
					>
						{selectedEnvironment.name}
					</MenuButton>
					<MenuList width="100%">
						{environments.map((environment) => (
							<MenuItem
								key={environment.id}
								onClick={() => selectEnvironment(environment.id)}
							>
								{!environment.code && <WarningTwoIcon color="orange" mr="0.5rem" />}
								{environment.name}
							</MenuItem>
						))}
						<MenuDivider />
						<MenuItem icon={<AddIcon />} onClick={() => setIsOpen(true)}>
							Create a new environment
						</MenuItem>
					</MenuList>
				</Menu>
				<IconButton
					aria-label="Edit environment"
					icon={<EditIcon />}
					variant="outline"
					size="sm"
					onClick={() => openEditEnvironment()}
				/>
			</Box>
		</>
	);
}

export default function TopHandle() {
	return (
		<Box
			className="top-handle"
			height="3rem"
			bg="gray.50"
			borderBottom="1px"
			borderColor="gray.200"
			display="flex"
			alignItems="center"
			justifyContent="space-between"
			paddingLeft="0.8rem"
			paddingRight="0.8rem"
		>
			<Buttons />
			<ProjectZone />
			<EnvironmentZone />
		</Box>
	);
}
