/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                               *
 *                                                                                                                   *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of                                  *
 *  this software and associated documentation files (the "Software"), to deal in                                    *
 *  the Software without restriction, including without limitation the rights to                                     *
 *  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of                                 *
 *  the Software, and to permit persons to whom the Software is furnished to do so.                                  *
 *                                                                                                                   *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR                                       *
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS                                 *
 *  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR                                   *
 *  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER                                   *
 *  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN                                          *
 *  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                       *
 *********************************************************************************************************************/
/* eslint-disable no-console */
const commands = require('./src/commands')

const handler = async (event, context) => {
	console.debug('Incoming Event')
	console.debug(JSON.stringify(event, null, 2))
	console.debug(JSON.stringify(context, null, 2))

	if (!commands[event.cmd]) {
		console.error(`Command ${event.cmd} not found`)

		return {
			error: `Command ${event.cmd} not found`,
		}
	}

	try {
		const response = await commands[event.cmd](event.payload)

		console.debug('Returning:')
		console.debug(response)

		return response
	} catch (err) {
		console.error('Error on executing the command: ', event.cmd)
		console.error(err)

		return {
			error: 'Error on executing the command',
		}
	}
}

exports.handler = handler
