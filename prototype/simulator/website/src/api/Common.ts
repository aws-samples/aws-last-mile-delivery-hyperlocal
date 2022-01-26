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
import { Auth, API } from 'aws-amplify'

export const APIS = {
	SIMULATOR: 'SimulatorApi',
	SEARCH: 'SearchApi',
}

let apiName = APIS.SIMULATOR

const setApiName = (api: string): void => {
	apiName = api
}

const commonRequest = async (path: string, action: string, rq: any): Promise<any> => {
	const session = await Auth.currentSession()
	const request = {
		...rq,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `${session.getIdToken().getJwtToken()}`,
		},
		// 1 minute timeout
		timeout: 60000,
	}

	return (API as any)[action](apiName, path, request)
}

const commonGetRequest = async (path: string, queryStringParameters?: unknown): Promise<any> => {
	const request = {
		queryStringParameters,
	}

	return commonRequest(path, 'get', request)
}

const commonDeleteRequest = async (path: string, queryStringParameters?: unknown): Promise<any> => {
	const request = {
		queryStringParameters,
	}

	return commonRequest(path, 'del', request)
}

const commonPostRequest = async (
	path: string,
	body: unknown,
	queryStringParameters = undefined,
): Promise<any> => {
	const request = {
		body,
		queryStringParameters: undefined,
	}

	if (queryStringParameters) {
		request.queryStringParameters = queryStringParameters
	}

	return commonRequest(path, 'post', request)
}

const commonPutRequest = async (
	path: string,
	body: unknown,
	queryStringParameters = undefined,
): Promise<any> => {
	const request = {
		body,
		queryStringParameters: undefined,
	}

	if (queryStringParameters) {
		request.queryStringParameters = queryStringParameters
	}

	return commonRequest(path, 'put', request)
}

const commonPatchRequest = async (
	path: string,
	body: unknown,
	queryStringParameters = undefined,
): Promise<any> => {
	const request = {
		body,
		queryStringParameters: undefined,
	}

	if (queryStringParameters) {
		request.queryStringParameters = queryStringParameters
	}

	return commonRequest(path, 'patch', request)
}

export default {
	commonGetRequest,
	commonPostRequest,
	commonPutRequest,
	commonPatchRequest,
	commonDeleteRequest,
	setApiName,
}
