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
const axios = require('axios')
const config = require('../config')
const logger = require('../../common/utils/logger')

const getRandomRestaurant = async (area, jwt) => {
	try {
		const res = await axios.default.get(`${config.simulatorApiEndpoint}/restaurant/random`, {
			params: {
				area,
			},
			headers: {
				authorization: jwt,
			},
		})

		return res.data.data
	} catch (err) {
		logger.error('Error on retrieving the random origin: ', err.toString())

		if (err.response) {
			logger.error(err.response.data)
			logger.error(err.response.status)
			logger.error(err.response.headers)
		}

		throw err
	}
}

const createOrder = async (restaurant, customer, jwt) => {
	const res = await axios.default.post(`${config.simulatorApiEndpoint}/order`, {
		restaurant,
		customer,
		quantity: 1,
	}, {
		headers: {
			authorization: jwt,
		},
	})

	return res.data
}

module.exports = {
	getRandomRestaurant,
	createOrder,
}
