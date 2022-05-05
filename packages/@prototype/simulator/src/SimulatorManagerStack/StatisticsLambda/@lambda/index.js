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
const logger = require('./src/utils/logger')
const commands = require('./src/commands')
const utils = require('./src/utils')
const http = require('./src/http')

const handler = (event, context) => {
	logger.debug('Incoming Event')
	logger.debug(JSON.stringify(event, null, 2))
	logger.debug(JSON.stringify(context, null, 2))

	try {
		if (event.httpMethod) {
		/// HTTP call from API Gateway to retrieve events
			const method = event.httpMethod.toLowerCase()

			if (!http[method]) {
				return utils.fail({ error: `${event.httpMethod} not supported` })
			}

			return http[method](event)
		}

		if (event.source) {
			// event from EventBus, to be handled by specific command that will write in redis
			return commands.buildStats(event)
		}
	} catch (err) {
		logger.error('Error on handling the request')
		logger.error(err)
	}
}

exports.handler = handler
