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

const updateItem = (tableName, key, item, keyName = 'ID') => {
	let setString = 'SET '
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

	setString = setString.substring(0, setString.length - 1) // remove the last char (comma from the loop)

	return ddb
	.update({
		TableName: tableName,
		UpdateExpression: setString,
		ExpressionAttributeNames: names,
		ExpressionAttributeValues: values,
		Key: { [keyName]: key },
	})
	.promise()
}

module.exports = {
	updateItem,
	get,
}
