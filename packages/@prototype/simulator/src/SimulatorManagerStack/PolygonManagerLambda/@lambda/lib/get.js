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
const { success, fail } = require('../utils')

const DDB_TABLE = process.env.DDB_TABLE
const NAME = 'polygon'

const ddbClient = new aws.DynamoDB.DocumentClient()

const handler = async (event) => {
	const entityId = event.pathParameters ? event.pathParameters[`${NAME}Id`] : undefined
	console.log(`:: ${NAME}-manager :: GET :: ${NAME}Id = ${entityId}`)

	try {
		const params = {
			TableName: DDB_TABLE,
		}
		let result

		// list all
		if (entityId === undefined) {
			console.debug(`:: ${NAME}-manager :: GET :: retrieving all ${NAME}s :: ${JSON.stringify(params)}`)
			result = await ddbClient.scan(params).promise()
		} else {
			params.Key = {
				ID: entityId,
			}

			console.debug(`:: ${NAME}-manager :: retrieving ${NAME} :: ${JSON.stringify(params)}`)
			result = await ddbClient.get(params).promise()
		}

		console.debug(`:: ${NAME}-manager :: result :: ${JSON.stringify(result)}`)

		return success({ data: result })
	} catch (err) {
		console.error(`There was an error while retrieving ${NAME}s: ${JSON.stringify(err)}`)

		return fail({ error: err })
	}
}

exports.handleGET = handler
