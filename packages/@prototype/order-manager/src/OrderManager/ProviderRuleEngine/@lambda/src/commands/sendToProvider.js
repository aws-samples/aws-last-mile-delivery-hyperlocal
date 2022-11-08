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
const axios = require('axios').default
const config = require('../config')
const secrets = require('../lib/secretsManager')

const execute = async (payload) => {
	const {
		providerName,
		orderData,
	} = payload

	if (!config[providerName]) {
		console.error('Unable to find provider configuration for', providerName)

		return {
			error: `Provider with name ${providerName} not found`,
		}
	}

	const { secretName, url } = config[providerName]

	try {
		const apiKey = await secrets.getSecretValue(secretName)
		const res = await axios.post(
			`${url}/request-order-fulfillment`,
			{
				...orderData,
			}, {
				headers: {
					'x-api-key': apiKey,
				},
			},
		)

		// if provider return 200 then we assume status is ack
		return {
			result: res.data,
		}
	} catch (err) {
		console.error(`Error sending the order to the provider: ${providerName}`)
		console.error(err)

		// handled by the step function
		throw new Error(`Error sending the order to the provider: ${providerName}`)
	}
}

module.exports = {
	execute,
}
