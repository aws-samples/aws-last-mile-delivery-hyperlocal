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
const ddb = require('../lib/dynamoDB')
const config = require('../config')

const execute = async (payload) => {
	const executionId = uuidv4()
	const lastEvaluatedKey = payload.lastEvaluatedKey
	const fileBasedSimulation = payload.fileBasedSimulation
	let count = Number(payload.count)

	// if is a file based simulation we'd need only one destination item to simulate the full flow
	// as it would playback the file as provided by the user
	if (fileBasedSimulation) {
		count = 1
	}

	const items = await ddb.scan(config.destinationTable, lastEvaluatedKey, count)

	console.log(`Items retrieved with following params: lastEvaluatedKey=${lastEvaluatedKey},count=${count},fileBasedSimulation=${fileBasedSimulation}`)
	console.warn(items.Count, items.LastEvaluatedKey, items.ScannedCount, items.ConsumedCapacity)

	console.log('Updating items with executionId')
	const promises = (items.Items || []).map(i => ddb.updateItem(config.destinationTable, i.ID, { executionId }))

	await Promise.all(promises)

	console.log('Returning data')

	return {
		executionId,
		lastEvaluatedKey: items.LastEvaluatedKey ? items.LastEvaluatedKey.ID : '',
		// run only one iteration to get one item in case of fileBasedSimulation
		continue: fileBasedSimulation ? false : !!items.LastEvaluatedKey,
		evaluatedItems: items.Count,
	}
}

module.exports = {
	execute,
}
