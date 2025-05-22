import {PassThrough} from 'stream';

export class AgentAPI {
	constructor(baseUrl = 'http://localhost:8080') {
		this.baseUrl = baseUrl;
	}

	async checkHealth() {
		try {
			const response = await fetch(`${this.baseUrl}/health`);
			return response.ok;
		} catch (error) {
			return false;
		}
	}

	async sendMessage(content) {
		const response = await fetch(`${this.baseUrl}/message`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({content}),
		});

		if (!response.ok) {
			throw new Error(`Failed to send message: ${response.statusText}`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		const stream = new PassThrough({objectMode: true});

		// Process the stream as it arrives
		const processStream = async () => {
			try {
				while (true) {
					const {done, value} = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);

					const lines = chunk.split('\n');

					for (const line of lines) {
						if (!line) continue;

						const [type, ...dataParts] = line.split(':');
						if (!type || !dataParts.length) continue;

						const data = dataParts.join(':'); // Rejoin any remaining parts in case the data contains colons

						try {
							switch (type) {
								case '0': // Text delta
									// Preserve newlines and spaces in the text content
									// const content = data.replace(/^"|"$/g, '');
									stream.write({type: 'text', content: JSON.parse(data)});
									break;
								case '9': // Tool call
								case 'a': // Tool result
								case 'b': // Tool call streaming start
									stream.write({
										type:
											type === '9'
												? 'tool-call'
												: type === 'a'
												? 'tool-result'
												: 'tool-call-start',
										data: JSON.parse(data),
									});
									break;
							}
						} catch (error) {
							console.error('Error parsing stream data:', error);
							console.error('Problematic line:', line);
						}
					}
				}
			} catch (error) {
				stream.emit('error', error);
			} finally {
				stream.end();
			}
		};

		// Start processing the stream
		processStream();

		return stream;
	}
}
