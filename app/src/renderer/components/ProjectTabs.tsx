import { AddIcon, SmallCloseIcon } from "@chakra-ui/icons";
import { Box, IconButton, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { DEFAULT_CODE } from "../lib/code";
import { ProjectTab, updateData, useData } from "../lib/data";
import { randomId } from "../lib/utils";
import Workspace from "./Workspace";

export default function ProjectTabs() {
	const {
		selectedProject: { tabs, selectedTab },
	} = useData();

	const selectedIndex = tabs.findIndex((tab) => tab.id === selectedTab.id);

	function selectTab(index: number) {
		updateData((data) => {
			data.selectedProject.selectedTab = tabs[index]!;
		});
	}

	function createTab() {
		updateData((data) => {
			const tab: ProjectTab = {
				id: randomId(),
				name: "untitled",
				code: DEFAULT_CODE,
			};
			data.selectedProject.tabs.push(tab);
			data.selectedProject.selectedTab = tab;
		});
	}

	function closeTab(id: string) {
		updateData((data) => {
			if (data.selectedProject.tabs.length === 1) {
				return;
			}

			const index = data.selectedProject.tabs.findIndex((t) => t.id === id);
			if (index !== -1) {
				data.selectedProject.tabs.splice(index, 1);
				if (data.selectedProject.selectedTab.id === id) {
					data.selectedProject.selectedTab =
						data.selectedProject.tabs[Math.max(0, index - 1)]!;
				}
			}
		});
	}

	// <Tabs
	//   isFitted
	//   variant="enclosed-colored"
	//   colorScheme="gray"
	//   height="100%"
	//   index={selectedIndex}
	//   onChange={(index) => selectTab(index)}
	// >
	//   <TabList>
	//     {tabs.map((tab) => (
	//       <Tab key={tab.id}>
	//         <Box
	//           width="100%"
	//           display="flex"
	//           alignItems="center"
	//           justifyContent="space-between"
	//         >
	//           <Box />
	//           <Box>{tab.name}</Box>
	//           <SmallCloseIcon onClick={() => closeTab(tab.id)} />
	//         </Box>
	//       </Tab>
	//     ))}
	//     <IconButton
	//       aria-label="New tab"
	//       icon={<AddIcon />}
	//       variant="unstyled"
	//       marginInline="0.5rem"
	//       onClick={createTab}
	//     />
	//   </TabList>
	//   <TabPanels bg="white" height="100%">
	//     {tabs.map((tab) => (
	//       <TabPanel key={tab.id} width="100%" padding="0" height="100%">
	//         <Workspace tabId={tab.id} />
	//       </TabPanel>
	//     ))}
	//   </TabPanels>
	// </Tabs>
	return (
		<Box width="100%" height="100%" bg="gray.50">
			<Workspace tabId={selectedTab.id} />
		</Box>
	);
}
