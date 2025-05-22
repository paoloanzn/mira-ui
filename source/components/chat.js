import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {AgentAPI} from '../agent-api.js';
import {Spinner} from '@inkjs/ui';

export function Chat() {
	//console.clear();
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const agentApi = new AgentAPI();
	const [isToolBeingUsed, setIsToolBeingUsed] = useState(false);
	const [activeToolCall, setActiveToolCall] = useState(null);

	if (!agentApi.checkHealth()) {
		return (
			<Text bold color={'red'}>
				𝘅 Agent is offline.
			</Text>
		);
	}

	const handleSubmit = async () => {
		if (!input.trim()) return;

		setIsLoading(true);
		setMessages([...messages, {role: 'user', content: input}]);
		setInput('');

		try {
			const stream = await agentApi.sendMessage(input);

			let agentResponse = '';
			stream.on('data', chunk => {
				switch (chunk.type) {
					case 'text':
                        if(isToolBeingUsed) {
                            setIsToolBeingUsed(false)
                        }
						agentResponse += chunk.content;
						setMessages(prev => {
							const newMessages = [...prev];
							const lastMessage = newMessages[newMessages.length - 1];
							if (lastMessage && lastMessage.role === 'assistant') {
								lastMessage.content = agentResponse;
								return [...newMessages];
							} else {
								return [
									...newMessages,
									{role: 'assistant', content: agentResponse},
								];
							}
						});
						break;
					case 'tool-call':
                        agentResponse += '\n\n';
						setIsToolBeingUsed(true);
						setActiveToolCall(
							`Using tool: ${chunk.data['toolName']}`,
						);
						break;
                    case 'tool-result':
                        setTimeout(() => setActiveToolCall(null), 6000);
                        break;
				}
			});

			stream.on('end', () => {
				setIsLoading(false);
			});

			stream.on('error', error => {
				console.error('Stream error:', error);
				setIsLoading(false);
				setMessages(prev => [
					...prev,
					{role: 'error', content: 'Error communicating with agent'},
				]);
			});
		} catch (error) {
			console.error('Error:', error);
			setIsLoading(false);
			setMessages(prev => [
				...prev,
				{role: 'error', content: 'Error communicating with agent'},
			]);
		}
	};

	useInput((_input, key) => {
		if (key.name === 'k' && (key.meta || key.ctrl)) {
			setMessages([]);
		}
	});

	return (
		<Box flexDirection="column-reverse" width={'100%'} alignItems="center">
			<Box
				borderColor={'grey'}
				paddingX={1}
				borderStyle={'round'}
				width={'80%'}
			>
				{!isLoading ? (
					<>
						<Text color={'blueBright'} bold>
							You:{' '}
						</Text>
						<TextInput
							value={input}
							placeholder="Write your message here..."
							onChange={setInput}
							onSubmit={handleSubmit}
						/>
					</>
				) : (
					<Spinner label="Agent is thinking" />
				)}
			</Box>
			{activeToolCall && (
				<Box
					borderColor={'yellowBright'}
					paddingX={1}
					borderStyle={'round'}
					width={'80%'}
                    columnGap={3}
				>
					{isToolBeingUsed ? (
						<Spinner />
					) : (
						<Text bold color={'yellow'}>
							✓
						</Text>
					)}
					<Text bold color={'yellow'}>
						{activeToolCall ?? ''}
					</Text>
				</Box>
			)}
			{messages.length > 0 && (
				<Box
					borderColor={'grey'}
					paddingX={1}
					borderStyle={'round'}
					width={'80%'}
					flexDirection="column"
					rowGap={2}
				>
					{messages ? (
						messages.map((message, index) => {
							return (
								<Text
									wrap="wrap"
									key={index}
									color={
										message.role === 'error'
											? 'red'
											: message.role === 'assistant'
											? 'white'
											: 'blueBright'
									}
								>
									{message.role === 'user'
										? 'You:\n\n'
										: message.role === 'assistant'
										? 'Agent:\n\n'
										: ''}
									{message.content}
								</Text>
							);
						})
					) : (
						<></>
					)}
				</Box>
			)}
		</Box>
	);
}
