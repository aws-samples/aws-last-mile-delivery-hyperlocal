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
const axios = require('axios')
const ddb = require('./lib/dynamoDB')
const secrets = require('./lib/secretsManager')
const config = require('./config')

let apiKey
const getNextState = (state) => {
	switch (state) {
		case 'NEW':
			return 'TO_ORIGIN'
		case 'TO_ORIGIN':
			return 'DELIVERING'
		case 'DELIVERING':
			return 'DELIVERED'
		default:
			return state
	}
}

const execute = async (order) => {
	const { ID, state, callbackUrl } = order

	try {
		const newState = getNextState(state)

		const res = await axios.post(
			callbackUrl,
			{
				...order,
				state: newState,
			}, {
				headers: {
					'x-api-key': apiKey,
				},
			},
		)

		await ddb.updateItem(config.externalOrderTable, ID, {
			state: newState,
			// boolean index is not availabile, simulate with number
			finalised: newState === 'CANCELLED' || newState === 'DELIVERED' ? 1 : 0,
		})
	} catch (err) {
		console.error('Error handling the callback for external order: ', ID)
		console.error(err)
	}
}

const handler = async (event, context) => {
	console.debug('Incoming Event')
	console.debug(JSON.stringify(event, null, 2))
	console.debug(JSON.stringify(context, null, 2))

	if (!apiKey) {
		apiKey = await secrets.getSecretValue(config.exampleWebhookApiSecretName)
	}

	const res = await ddb.query(config.externalOrderTable, config.externalOrderFinalisedIndex, 0)
	console.debug('Executing webhook for the following orders', res.Items.length, res.Items)

	const executor = res.Items.map(execute)

	await Promise.all(executor)

	console.debug('Webhooks sent')
}

exports.handler = handler
