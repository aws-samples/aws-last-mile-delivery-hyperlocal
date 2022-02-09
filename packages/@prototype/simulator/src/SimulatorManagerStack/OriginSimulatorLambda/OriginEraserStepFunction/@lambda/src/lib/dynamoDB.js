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
const aws = require('aws-sdk')

const ddb = new aws.DynamoDB.DocumentClient()

const query = (tableName, index, item, limit, startKey, condition = 'and') => {
	const values = []
	const names = []
	const parts = []

	Object.keys(item).forEach((k) => {
		parts.push(`#${k} = :${k}`)

		values[`:${k}`] = item[k]
		names[`#${k}`] = k
	})

	return ddb.query({
		TableName: tableName,
		IndexName: index,
		KeyConditionExpression: parts.join(` ${condition} `),
		ExpressionAttributeNames: names,
		ExpressionAttributeValues: values,
		...(limit ? { Limit: limit } : {}),
		...(startKey ? { ExclusiveStartKey: { ID: startKey } } : {}),
	}).promise()
}

const deleteItem = (tableName, id, keyName = 'ID') => {
	return ddb.delete({
		TableName: tableName,
		Key: {
			[keyName]: id,
		},
	}).promise()
}

const batchWrite = (tableName, items) => {
	return ddb.batchWrite({
		RequestItems: {
			[tableName]: items,
		},
	}).promise()
}

const get = (tableName, id, keyName = 'ID') => {
	return ddb
	.get({
		TableName: tableName,
		Key: {
			[keyName]: id,
		},
	})
	.promise()
}

module.exports = {
	batchWrite,
	deleteItem,
	query,
	get,
}
