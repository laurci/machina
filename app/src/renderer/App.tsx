import { ApolloProvider } from "@apollo/client";
import { ChakraProvider } from "@chakra-ui/react";
import ProjectTabs from "./components/ProjectTabs";
import TopHandle from "./components/TopHandle";
import { client } from "./lib/data";

export default function App() {
	return (
		<ChakraProvider>
			<ApolloProvider client={client}>
				<TopHandle />
				<ProjectTabs />
			</ApolloProvider>
		</ChakraProvider>
	);
}
