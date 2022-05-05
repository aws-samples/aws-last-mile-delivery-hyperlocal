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
const { v4: uuidv4 } = require('uuid')
const dayjs = require('dayjs')
const relativeTime = require('dayjs/plugin/relativeTime')
const config = require('./config')
const constants = require('./config/constants')
const helper = require('./helper')
const stepFunctions = require('./lib/stepFunctions')

dayjs.extend(relativeTime)

const isExpired = (now, orderCreationDate) => orderCreationDate + (config.orderTimeoutInMinutes * 60 * 1000) < now
const sortByCreatedAt = (a, b) => a.createdAt - b.createdAt

const handler = async () => {
	const now = Date.now()
	const unassignedOrders = await helper.getAllOrdersByStatus(constants.UNASSIGNED)

	if (!unassignedOrders || unassignedOrders.length === 0) {
		console.warn('There are not unassigned orders at this point. Skipping execution')

		return
	}

	// TODO: verify this logic. It takes only the orders that are not expired AND don't have the jobId field populated
	// the jobId field is populated during the dispatching if is present means that the orded has been broadcasted to
	// the driver and has not yet being assigned
	// will also exclude orders that have been included in another batch
	const validOrders = unassignedOrders.filter(q => !isExpired(now, q.createdAt) && !q.jobId && !q.batchId)
	// TODO: verify if cancellation is required? this portion of the code will cancel orders that
	// are expired and not being executed yet. The jobId field is populated during the dispatching
	// if is populated and still UNASSIGNED means no driver has picked that up yet
	const expiredOrders = unassignedOrders.filter(q => isExpired(now, q.createdAt) && !q.jobId)

	console.log(`Number of orders in this execution: ${unassignedOrders.length} of which, ${validOrders.length} are still valid and ${expiredOrders.length} are expired`)

	if (expiredOrders && expiredOrders.length > 0) {
		console.info(`Cancelling ${expiredOrders.length} expired orders`)

		await Promise.all(expiredOrders.map(helper.cancelOrder))
	}

	if (!validOrders || validOrders.length === 0) {
		console.warn('There are not valid orders at this point. Skipping execution')

		return
	}

	const firstOrderTimestamp = validOrders.sort(sortByCreatedAt)[0].createdAt
	const lastExecutionPlusBatchingWindow = dayjs(firstOrderTimestamp).add(config.orderIngestMaxBatchingWindowMinutes, 'minute')

	if (validOrders.length >= config.orderIngestMaxBatchingSize || lastExecutionPlusBatchingWindow <= dayjs()) {
		const batchId = uuidv4()
		console.log(`Conditions to run the dispatcher are met, starting the execution for batch: ${batchId}.`)

		await helper.updateOrdersWithBatchId(validOrders, batchId)

		const res = await stepFunctions.startDispatchEngineOrchestrator({
			batchId,
		})

		console.log('Dispatch Engine Execution started: ', res.executionArn)

		return { success: true }
	}

	console.log(`Only ${validOrders.length} orders arrived and last order was ${dayjs().to(dayjs(firstOrderTimestamp))}`)
}

exports.handler = handler
