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
import { ILatLong } from '../components/LatLongPairComponent'
import { IArea } from '../pages/NewSimulation'
import common, { APIS } from './Common'
import { v4 } from 'uuid'

const createSimulation = (name: string, areas: IArea[], procNum: number): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPostRequest('/simulator', {
		name,
		areas,
		procNum,
	})
}

const getSimulations = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/simulator')
}

const getSimulation = (id: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest(`/simulator/${id}`)
}

const deleteSimulation = (id: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/simulator/${id}`)
}

const createPolygon = (name: string, vertices: ILatLong[]): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPostRequest('/polygon', {
		ID: v4(),
		name,
		vertices,
	})
}

const getPolygons = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/polygon')
}

const deletePolygon = (id: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/polygon/${id}`)
}

const getStats = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/stats')
}

export default {
	getSimulations,
	createSimulation,
	getSimulation,
	deleteSimulation,
	createPolygon,
	getPolygons,
	deletePolygon,
	getStats,
}
