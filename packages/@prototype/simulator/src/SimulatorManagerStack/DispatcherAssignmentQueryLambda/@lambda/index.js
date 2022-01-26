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
const { success, fail, trimArray } = require('./utils')

const ASSIGNMENTS_TABLE = process.env.ASSIGNMENTS_TABLE
const ORDER_TABLE = process.env.ORDER_TABLE
const NAME = 'assignment'

const ddb = new aws.DynamoDB()

const getOrderRoutes = async (idList) => {
	const orderIds = idList.split(',').map((id) => `'${id}'`)
	const trimmedIds = trimArray(orderIds, 20)
	const executions = trimmedIds.map(async (oIds) => {
		const queryStatement = `SELECT ID, routing FROM "${ORDER_TABLE}" WHERE ID IN [${oIds.join(',')}]`
		const orderRouteResult = await ddb.executeStatement({ Statement: queryStatement }).promise()

		return orderRouteResult.Items.map(record => aws.DynamoDB.Converter.unmarshall(record))
	})

	const allOrderRouteResult = await Promise.all(executions)

	const orderRoutes = {}
	allOrderRouteResult.flat().forEach(r => {
		orderRoutes[r.ID] = r.routing
	})

	return orderRoutes
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
				const statement = `SELECT * FROM "${ASSIGNMENTS_TABLE}"`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'byId': {
				const { id } = event.queryStringParameters
				const statement = `SELECT * FROM "${ASSIGNMENTS_TABLE}" WHERE "ID" = ${id}`
				result = await ddb.executeStatement({ Statement: statement }).promise()
				break
			}
			case 'after': {
				const { after } = event.queryStringParameters
				const statement = `SELECT * FROM "${ASSIGNMENTS_TABLE}" WHERE "createdAt" > ${after}`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'between': {
				const { from, to } = getFromTo(event)

				const statement = `SELECT * FROM "${ASSIGNMENTS_TABLE}" WHERE "createdAt" BETWEEN ${from} AND ${to}`
				result = await ddb.executeStatement({
					Statement: statement,
					...nextTokenElement,
				}).promise()
				break
			}
			case 'orderRoutes': {
				const orderRoutes = await getOrderRoutes(queryString.orderIdList)

				return success({ data: { orderRoutes } })
			}
			default:
				return fail(`${queryType} not supported`, 404)
		}

		const assignments = result.Items.map(record => aws.DynamoDB.Converter.unmarshall(record))
		const nextToken = result.NextToken

		return success({ data: { assignments, nextToken } })
	} catch (err) {
		console.error(`There was an error while retrieving ${NAME}s: ${JSON.stringify(err)}`)

		return fail({ error: err })
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
