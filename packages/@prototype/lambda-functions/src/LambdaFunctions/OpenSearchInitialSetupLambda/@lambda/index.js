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
const { getESClient } = require('/opt/es-client')
const { ES } = require('/opt/lambda-utils')

const esClient = getESClient(`https://${process.env.DOMAIN_ENDPOINT}`)

const esIndexObj = {
	index: ES.DRIVER_LOCATION_INDEX,
}
const esMappingObj = {
	index: ES.DRIVER_LOCATION_INDEX,
	includeTypeName: false,
	body: {
		properties: {
			location: {
				type: 'geo_point',
			},
		},
	},
}

const handler = async (event, context) => {
	console.debug(`Event payload: ${JSON.stringify(event, null, 2)}`)

	const { RequestType } = event

	console.log(`OpenSearchInitialSetup :: RequestType = ${RequestType}`)

	switch (RequestType) {
		case 'Create':
			await handleCreate()
			break
		case 'Update':
			await handleUpdate()
			break
		default:
            // noop
	}
}

const handleCreate = async () => {
	try {
		let result = await esClient.indices.create(esIndexObj)
		console.log(`Successfully created index ${ES.DRIVER_LOCATION_INDEX}. Result: ${JSON.stringify(result)}`)
		result = await esClient.indices.putMapping(esMappingObj)
		console.log(`Successfully updated index ${ES.DRIVER_LOCATION_INDEX}. Result: ${JSON.stringify(result)}`)
	} catch (err) {
		console.log(`Error while creating index ${ES.DRIVER_LOCATION_INDEX}. Updating instead. Error: ${JSON.stringify(err)}`)

		await handleUpdate()
	}
}

const handleUpdate = async () => {
	try {
		const result = await esClient.indices.putMapping(esMappingObj)
		console.log(`Successfully updated index ${ES.DRIVER_LOCATION_INDEX}. Result: ${JSON.stringify(result)}`)
	} catch (err) {
		console.log(`Error while updating index ${ES.DRIVER_LOCATION_INDEX}. Error: ${JSON.stringify(err)}`)
	}
}

exports.handler = handler
