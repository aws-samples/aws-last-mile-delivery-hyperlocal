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
const { getOpenSearchClient } = require('/opt/opensearch-client')
const { success, fail, OPENSEARCH } = require('/opt/lambda-utils')

const ddbClient = new aws.DynamoDB.DocumentClient()
const openSearchClient = getOpenSearchClient(`https://${process.env.DOMAIN_ENDPOINT}`)
const DDB_TABLE = process.env.POLYGON_TABLE

const handler = async (event) => {
	switch (event.httpMethod) {
		case 'GET': return handleGET(event)
		case 'POST': return handlePOST(event)
		default: {
			fail({ error: `${event.httpMethod} not supported` })
		}
	}
}

const handleGET = async (event) => {
	const polygonId = event.pathParameters ? event.pathParameters.polygonId : undefined
	const { startFrom, count } = event.queryStringParameters || {}

	console.log(`:: list-driver-for-polygon :: GET :: polygonId = ${polygonId}`)
	const params = {
		TableName: DDB_TABLE,
		Key: {
			ID: polygonId,
		},
	}

	try {
		console.debug(`retreiving polygon :: ${JSON.stringify(params)}`)
		let result = await ddbClient.get(params).promise()
		console.debug(`ddb polygon result :: ${JSON.stringify(result)}`)
		const { vertices } = result.Item
		result = await searchByPolygon(vertices, startFrom, count)

		return success(result)
	} catch (err) {
		console.error(`Error while searching for drivers by polygonId: ${JSON.stringify(err)}`)

		return fail({ message: JSON.stringify(err) })
	}
}

const handlePOST = async (event) => {
	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	const { polygon, startFrom, count } = body
	const result = await searchByPolygon(polygon, startFrom, count)

	return success(result)
}

const searchByPolygon = async (polygon, startFrom, count) => {
	if (polygon.length < 4) {
		throw new Error('polygon must be at least 4 lat/long points')
	}

	const first = polygon[0]
	const last = polygon[polygon.length - 1]

	// last coord must be equal to first one. if not, fix it
	if (first.lat !== last.lat || first.long !== last.long) {
		polygon.push(polygon[0])
	}

	const esPolygon = polygon.map(p => ({ lat: p.lat, lon: p.long }))
	const from = startFrom || 0
	const size = count || 25

	const result = await openSearchClient.search({
		index: OPENSEARCH.DRIVER_LOCATION_INDEX,
		body: {
			from,
			size,
			query: {
				bool: {
					must: {
						match_all: {},
					},
					filter: {
						geo_polygon: {
							location: {
								points: esPolygon,
							},
						},
					},
				},
			},
		},
		filterPath: ['hits.hits._source', '-hits.hits._source.ttl'],
	})

	if (result.body.hits != null && result.body.hits.hits != null) {
		const data = result.body.hits.hits.map(item => {
			const { _source } = item
			const { location, ...rest } = _source

			return {
				latitude: location.lat,
				longitude: location.lon,
				...rest,
			}
		})

		return data
	} else {
		return []
	}
}

exports.handler = handler
