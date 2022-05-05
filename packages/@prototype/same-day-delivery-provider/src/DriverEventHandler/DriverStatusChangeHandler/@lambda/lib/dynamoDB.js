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
		let value = item[k]
		let operator = '='

		if (item[k].type && item[k].type === 'complex') {
			value = item[k].value
			operator = item[k].operator
		}

		parts.push(`#${k} ${operator} :${k}`)

		values[`:${k}`] = value
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

const get = (tableName, id, keyName = 'ID') => {
	return ddb
	.get({
		ConsistentRead: true,
		TableName: tableName,
		Key: {
			[keyName]: id,
		},
	})
	.promise()
}

const updateItem = (tableName, key, item, conditions = {}, removeFields = [], keyName = 'ID') => {
	let setString = 'SET '
	const conditionExpressions = []
	const values = {}
	const names = {}
	const element = {
		...item,
		updatedAt: Date.now(),
	}
	Object.keys(element).forEach((k) => {
		setString += `#${k} = :${k},`

		values[`:${k}`] = element[k]
		names[`#${k}`] = k
	})

	Object.keys(conditions).forEach((k) => {
		conditionExpressions.push(`#${k} = :curr${k}`)
		values[`:curr${k}`] = conditions[k]

		if (!Object.keys(element).includes(k)) {
			names[`#${k}`] = k
		}
	})

	setString = setString.substring(0, setString.length - 1) // remove the last char (comma from the loop)

	if (removeFields.length > 0) {
		setString += ' REMOVE '
		for (const rem of removeFields) {
			setString += `#${rem},`

			if (!Object.keys(element).includes(rem)) {
				names[`#${rem}`] = rem
			}
		}

		setString = setString.substring(0, setString.length - 1) // remove the last char (comma from the loop)
	}

	return ddb
	.update({
		TableName: tableName,
		UpdateExpression: setString,
		ExpressionAttributeNames: names,
		ExpressionAttributeValues: values,
		...(conditionExpressions.length > 0 ? { ConditionExpression: conditionExpressions.join(' AND ') } : {}),
		Key: { [keyName]: key },
	})
	.promise()
}

const putItem = (tableName, item) => {
	return ddb
	.put({
		TableName: tableName,
		Item: { ...item, createdAt: Date.now() },
	})
	.promise()
}

module.exports = {
	updateItem,
	putItem,
	get,
	query,
}
