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
	if (event.body === undefined) {
		console.error(` :: ${NAME}-manager :: PUT :: 'body' not found in event object: ${JSON.stringify(event)}`)

		return fail({ error: 'Unrecognized message format' })
	}

	// check body
	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	console.log(`:: ${NAME}-manager :: PUT :: body :: ${JSON.stringify(body)}`)

	const putParams = {
		TableName: DDB_TABLE,
		Item: {
			...body,
		},
	}

	try {
		console.debug(`:: ${NAME}-manager :: Updating ${NAME} record with params :: ${JSON.stringify(putParams)}`)
		await ddbClient.put(putParams).promise()

		const getParams = { TableName: DDB_TABLE, Key: { ID: body.ID } }
		console.debug(`:: ${NAME}-manager :: Retrieving ${NAME} record with params :: ${JSON.stringify(getParams)}`)

		const data = await ddbClient.get(getParams).promise()
		console.log(`:: ${NAME}-manager :: Successfully updated a ${NAME} object :: ${JSON.stringify(data)}`)

		return success({ data })
	} catch (err) {
		console.error(`:: ${NAME}-manager :: There was an error while updating a ${NAME} record: ${JSON.stringify(err)}`)

		return fail({ error: err })
	}
}

exports.handlePUT = handler
