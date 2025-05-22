#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
		Usage
		  $ mira-ui

		Description
		  Interactive CLI interface for the Mira agent

		Examples
		  $ mira-ui
	`,
	{
		importMeta: import.meta,
	},
);

console.clear();
const {clear} = render(<App />, {patchConsole: true});
if (process.env.NODE_ENV != 'development') {
	clear();
}
