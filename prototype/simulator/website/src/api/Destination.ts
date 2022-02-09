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
import { IEntity } from '../components/GenerateEntityComponent'
import { IAdditionalInputResults } from '../components/DestinationAdditionalInputs'
import common, { APIS } from './Common'

const getDestinationsStats = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/destination/stats')
}

const deleteDestinationStats = (statsId: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/destination/stats/${statsId}`)
}

const generateDestinations = (entity: IEntity, area: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPostRequest('/destination', {
		batchSize: entity.batchSize,
		lat: entity.coordinates?.lat,
		long: entity.coordinates?.long,
		radius: entity.radius,
		area,
	})
}

const getDestinationsSimulations = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/destination/simulations')
}

const startSimulator = (data: IAdditionalInputResults): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPutRequest('/destination/simulations', {
		orderRate: data.orders,
		orderInterval: data.orderInterval,
		rejectionRate: data.rejectionRate,
	})
}

const stopSimulator = (simulationId: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/destination/simulations/${simulationId}`)
}

export default {
	getDestinationsStats,
	deleteDestinationStats,
	getDestinationsSimulations,
	generateDestinations,
	startSimulator,
	stopSimulator,
}
