import React from 'react';
import {Box} from 'ink';
import {Chat} from './components/chat.js';

export default function App() {
	return (
		<Box flexDirection="column">
			<Chat />
		</Box>
	);
}
