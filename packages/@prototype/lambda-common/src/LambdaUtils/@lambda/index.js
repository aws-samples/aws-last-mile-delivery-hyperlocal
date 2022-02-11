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

const success = body => {
	return {
		statusCode: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
		body: JSON.stringify(body),
	}
}

const fail = (err, statusCode) => {
	return {
		statusCode: statusCode || 500,
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
		body: JSON.stringify(err),
	}
}

exports.success = success
exports.fail = fail

exports.REDIS_HASH = {
	DRIVER_LOCATION: 'driver:loc:location',
	DRIVER_LOCATION_TTLS: 'driver:loc:ttls',
	DRIVER_LOCATION_RAW: 'driver:loc:raw',
	DRIVER_STATUS: 'driver:stat:status',
	DRIVER_STATUS_UPDATED_AT: 'driver:stat:updated',
	DRIVER_STATUS_RAW: 'driver:stat:raw',
	GEOFENCE_LOCATION: 'geofence:location',
	GEOFENCE_LOCATION_STATUS: 'geofence:location:status',
	GEOFENCE_DRIVER: 'geofence:location:drivers',
	ORIGIN_STATUS: 'origin:status',
	ORIGIN_BY_AREA: 'origin:area',
	DESTINATION_STATUS: 'destination:status',
	DESTINATION_BY_AREA: 'destination:area',
	ORDER_STATUS: 'order:status',
	ORDER_TO_PROVIDER: 'order:provider',
	DRIVER_STATUS_STATISTICS: 'driver:status',
	ORDER_MANAGER: 'order:manager',
	PROVIDER_ERRORS: 'provider:erros',
	PROVIDER_DISTRIBUTION: 'provider:distribution',
	PROVIDER_TIME: 'provider:time',
	DISPATCH_ENGINE_STATS: 'dispatch:stats',
}

exports.DRIVERAPP_MESSAGE_TYPE = {
	LOCATION_UPDATE: 'LOCATION_UPDATE',
	LOCATION_UPDATE_BATCH: 'LOCATION_UPDATE_BATCH',
	STATUS_CHANGE: 'STATUS_CHANGE',
	// add more here if needed
}

exports.OPENSEARCH = {
	DRIVER_LOCATION_INDEX: 'driver-location',
}

const hashCode = (s) => {
	for (var h = 0, i = 0; i < s.length; h &= h) {
		h = 31 * h + s.charCodeAt(i++)
	}

	return h.toString(36)
}

exports.hashCode = hashCode
