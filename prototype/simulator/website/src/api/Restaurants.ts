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
import common, { APIS } from './Common'

const getRestaurantsStats = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/restaurant/stats')
}

const deleteRestaurantStats = (statsId: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/restaurant/stats/${statsId}`)
}

const generateRestaurants = (entity: IEntity, area: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPostRequest('/restaurant', {
		batchSize: entity.batchSize,
		lat: entity.coordinates?.lat,
		long: entity.coordinates?.long,
		radius: entity.radius,
		area,
	})
}

const getRestaurantsSimulations = (): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/restaurant/simulations')
}

const startSimulator = (rejectionRate: number): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPutRequest('/restaurant/simulations', {
		rejectionRate,
	})
}

const stopSimulator = (simulationId: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonDeleteRequest(`/restaurant/simulations/${simulationId}`)
}

export default {
	getRestaurantsStats,
	deleteRestaurantStats,
	getRestaurantsSimulations,
	generateRestaurants,
	startSimulator,
	stopSimulator,
}
