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
const { Command } = require('commander')
const commonConfig = require('./common/config')
const logger = require('./common/utils/logger')
const originConfig = require('./origin/config')
const OriginApp = require('./origin')

const config = {
	...commonConfig,
	...originConfig,
}

const program = new Command()
program
.option('-e, --execution-id <id>', 'Execution id to be used to fetch the origins')
.option('-rr, --rejection-rate <percentage>', 'Order rejection rate (%)')
program.parse(process.argv)
const options = program.opts();

(async () => {
	try {
		logger.info('Starting origin app')
		const origin = new OriginApp(config, options)

		await origin.init()
		await origin.connect()
	} catch (err) {
		logger.error('Error starting the origin app')
		logger.error(err)
	}
})()
