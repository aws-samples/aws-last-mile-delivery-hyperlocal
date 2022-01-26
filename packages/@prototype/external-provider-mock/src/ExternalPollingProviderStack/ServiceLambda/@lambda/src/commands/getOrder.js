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
const utils = require('../utils')
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const getNextState = (state) => {
	switch (state) {
		case 'NEW':
			return 'TO_RESTAURANT'
		case 'TO_RESTAURANT':
			return 'DELIVERING'
		case 'DELIVERING':
			return 'DELIVERED'
		default:
			return state
	}
}

const execute = async (orderId) => {
	console.info('Getting order')

	const order = await ddb.get(config.externalOrderTable, orderId)

	if (!order.Item) {
		console.error(`Cannot retrieve the order with ID: ${orderId}`)

		return utils.fail({
			error: `Cannot retrieve the order with ID: ${orderId}`,
		})
	}

	let newState = order.Item.state

	if (order.Item.state !== 'DELIVERED' && order.Item.state !== 'CANCELLED') {
		const rnd = Math.floor(Math.random() * 100)
		// simulate that the order is moving state

		if (rnd < 75) {
			// "simulate" processing by sending a new state only
			// 75% of the time the getOrder is invoked
			newState = getNextState(newState)
		}

		await ddb.updateItem(config.externalOrderTable, orderId, {
			state: newState,
		})
	}

	console.debug('Sending response with status: ', newState)

	return utils.success({
		order: {
			...order.Item,
			state: newState,
		},
	})
}

module.exports = {
	execute,
}
