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
import common, { APIS } from './Common'

const createOrder = (destination: ILatLong, origin: ILatLong, quantity: number): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonPostRequest('/order', {
		destination,
		origin,
		quantity,
	})
}

const getOrders = (nextToken?: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/order', nextToken
		? {
			startFrom: nextToken,
		}
		: {})
}

const getOrder = (id: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest(`/order/${id}`)
}

const getDispatchAssignmentsAll = (nextToken?: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/assignment/all', nextToken
		? {
			nextToken,
		}
		: {})
}

const getDispatchAssignmentById = (id: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest(`/assignment/byId/?id=${id}`)
}
const getDispatchAssignmentsAfter = (timestamp: number): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest(`/assignment/after/?timestamp=${timestamp}`)
}
const getDispatchAssignmentsBetween = (from: number, to: number): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest(`/assignment/between/?from=${from}&to=${to}`)
}

const getOrderRoutes = (orderIdList: string): Promise<any> => {
	common.setApiName(APIS.SIMULATOR)

	return common.commonGetRequest('/assignment/orderRoutes', {
		orderIdList,
	})
}

export default {
	createOrder,
	getOrder,
	getOrders,
	getDispatchAssignmentsAll,
	getDispatchAssignmentById,
	getDispatchAssignmentsAfter,
	getDispatchAssignmentsBetween,
	getOrderRoutes,
}
