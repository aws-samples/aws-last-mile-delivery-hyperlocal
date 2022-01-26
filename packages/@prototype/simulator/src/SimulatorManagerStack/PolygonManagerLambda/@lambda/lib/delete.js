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
	console.log(` :: ${NAME}-manager :: DELETE :: ${NAME}Id = ${entityId}`)

	// no entityId parameter
	if (entityId === undefined) {
		console.error(` :: ${NAME}-manager :: DELETE :: ${NAME}Id not specified`)

		return fail({ error: `no ${NAME}Id set` })
	} else {
		const params = {
			TableName: DDB_TABLE,
			Key: {
				ID: entityId,
			},
		}

		try {
			const data = await ddbClient.delete(params).promise()

			console.log(` :: ${NAME}-manager :: DELETE :: ${NAME} (${entityId}) deleted successfully`)

			return success({ data })
		} catch (err) {
			console.error(`:: ${NAME}-manager :: DELETE :: There was an error while deleting ${NAME} with id ${entityId}: ${JSON.stringify(err)}`)

			return fail({ error: err })
		}
	}
}

exports.handleDELETE = handler
