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
const logger = require('../utils/logger')
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const execute = async (payload) => {
	logger.info('Releasing driver lock')
	logger.info(JSON.stringify(payload))
	const { driverId } = payload

	const res = await ddb.get(config.providerLocksTable, driverId)

	if (!res.Item) {
		throw new Error('Cannot find driver with ID ', driverId)
	}

	if (!res.Item.locked) {
		logger.warn('The driver is not locked, nothing to do')

		return { success: false }
	}

	await ddb.updateItem(config.providerLocksTable, driverId, {
		locked: false,
	}, {
		locked: true,
	}, ['orders'])

	return { success: true }
}

module.exports = {
	execute,
}
