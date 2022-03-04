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
import common, { APIS } from './Common'

export type IQuery = {
  lat: number
  long: number
  distance: number
  distanceUnit?: string
  status?: string
	count?: number
	shape?: string
	width?: number
	height?: number
}
export type IPolygonJson = {
	polygon: [{ lat: number, long: number, }]
}

const getDriverById = (id: string): Promise<any> => {
	common.setApiName(APIS.SEARCH)

	return common.commonGetRequest(`/api/geotracking/driver-location/id/${id}`)
}

const queryDrivers = ({ lat, long, distance, distanceUnit = 'm', status, count, shape, width, height }: IQuery): Promise<any> => {
	common.setApiName(APIS.SEARCH)

	const params: any = {
		lat,
		long,
		distance,
		distanceUnit,
		width,
		height,
		shape: shape || 'circle',
		count: count || 25,
	}

	if (status !== undefined) {
		params.status = status
	}

	return common.commonGetRequest('/api/geotracking/driver-location/query/', params)
}

const queryByPolygonId = (polygonId: string, startFrom: number, count: number): Promise<any> => {
	common.setApiName(APIS.SEARCH)

	return common.commonGetRequest(`/api/geotracking/driver-location/polygon/${polygonId}`, {
		startFrom,
		count,
	})
}

const queryByPolygonJson = (polygonJson: IPolygonJson): Promise<any> => {
	common.setApiName(APIS.SEARCH)

	return common.commonPostRequest('/api/geotracking/driver-location/polygon', polygonJson)
}

export default {
	getDriverById,
	queryDrivers,
	queryByPolygonId,
	queryByPolygonJson,
}
