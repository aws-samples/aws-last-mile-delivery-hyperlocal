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
const aws = require('aws-sdk')
const { success, fail } = require('./utils')

const SAME_DAY_SOLVER_JOBS = process.env.SAME_DAY_SOLVER_JOBS_TABLE
const DELIVERY_JOBS = process.env.SAME_DAY_DELIVERY_JOBS_TABLE
const DELIVERY_JOBS_STATUS_INDEX = process.env.DELIVERY_JOBS_STATUS_INDEX_NAME
const DELIVERY_HUBS = process.env.SAME_DAY_DELIVERY_HUBS_TABLE
const NAME = 'solver-job'

const ddb = new aws.DynamoDB()

const getDeliveryJobs = async (id) => {
	const queryStatement = `SELECT * FROM "${DELIVERY_JOBS}"."${DELIVERY_JOBS_STATUS_INDEX}" WHERE solverJobId = '${id}'`
	const deliveryJobsResult = await ddb.executeStatement({ Statement: queryStatement }).promise()

	return deliveryJobsResult.Items.map(record => aws.DynamoDB.Converter.unmarshall(record))
}

const getHubs = async () => {
	const queryStatement = `SELECT * FROM "${DELIVERY_HUBS}"`
	const hubsResult = await ddb.executeStatement({ Statement: queryStatement }).promise()

	return hubsResult.Items.map(record => aws.DynamoDB.Converter.unmarshall(record))
}

const handler = async (event) => {
	const queryType = event.pathParameters ? event.pathParameters.queryType : undefined
	const queryString = event.queryStringParameters
	console.log(`:: ${NAME}-manager :: GET :: queryType = ${queryType}`)

	let nextTokenElement = {}

	if (queryString && queryString.nextToken) {
		nextTokenElement = {
			NextToken: queryString.nextToken,
		}
	}

	try {
		let result
		switch (queryType) {
			case 'all': {
				const statement = `SELECT * FROM "${SAME_DAY_SOLVER_JOBS}"`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'byId': {
				const { id } = event.queryStringParameters
				const statement = `SELECT * FROM "${SAME_DAY_SOLVER_JOBS}" WHERE ID = '${id}'`
				result = await ddb.executeStatement({ Statement: statement }).promise()
				break
			}
			case 'after': {
				const { after } = event.queryStringParameters
				const statement = `SELECT * FROM "${SAME_DAY_SOLVER_JOBS}" WHERE createdAt > ${after}`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'between': {
				const { from, to } = getFromTo(event)

				const statement = `SELECT * FROM "${SAME_DAY_SOLVER_JOBS}" WHERE createdAt BETWEEN ${from} AND ${to}`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'deliveryJobs': {
				const deliveryJobs = await getDeliveryJobs(queryString.solverJobId)

				return success({ data: { deliveryJobs } })
			}
			case 'hubs': {
				const hubs = await getHubs()

				return success({ data: { hubs } })
			}
			default:
				return fail(`${queryType} not supported`, 404)
		}

		const assignments = result.Items.map(record => aws.DynamoDB.Converter.unmarshall(record))
		const nextToken = result.NextToken

		return success({ data: { assignments, nextToken } })
	} catch (err) {
		console.error(`There was an error while retrieving ${NAME}s: `, err)

		return fail({ error: `Error while retrieving ${NAME}s` })
	}
}

const getFromTo = (event) => {
	let { from, to } = event.queryStringParameters
	from = parseInt(from, 10)
	to = parseInt(to, 10)

	if (from > to) {
		const tmp = to
		to = from
		from = tmp
	}

	return { from, to }
}

exports.handler = handler
