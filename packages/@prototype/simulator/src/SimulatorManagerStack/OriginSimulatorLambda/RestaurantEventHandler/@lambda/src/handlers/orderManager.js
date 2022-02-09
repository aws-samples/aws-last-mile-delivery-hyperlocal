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
const iot = require('../lib/iot')
const config = require('../config')

const mapper = {
	NOTIFY_ORIGIN: async (detail) => {
		const { restaurantId, orderId, customerId, token } = detail

		logger.info('Reading resturant information')

		const res = await ddb.get(config.restaurantTable, restaurantId)

		if (!res.Item) {
			logger.error('Cannot find resturant with ID: ', restaurantId)

			return
		}

		const { identity } = res.Item

		logger.info('Sending message to AWS IoT to the driver')

		await iot.publishMessage(`${identity}/messages`, {
			type: 'NEW_ORDER',
			payload: {
				restaurantId,
				orderId,
				customerId,
				token,
			},
		})

		return { success: true }
	},
}

const execute = async (detailType, detail) => {
	if (!mapper[detailType]) {
		logger.warn(`Mapper not found for builder '${config.orderManagerService}' and detailType '${detailType}'`)

		return
	}

	logger.info(`Executing build '${config.orderManagerService}' for detailType '${detailType}'`)

	return mapper[detailType](detail)
}

module.exports = {
	execute,
}
