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
/* eslint-disable no-undef */
import { check } from 'k6'
import http from 'k6/http'

export const options = {
	stages: [
		{ duration: '1m', target: 10 },
		{ duration: '2m', target: 20 },
		{ duration: '5m', target: 50 },
		{ duration: '2m', target: 20 },
		{ duration: '1m', target: 10 },
	],
	noConnectionReuse: true,
}

export default function () {
	const params = {
		headers: {
			authorization: __ENV.K6_AUTH_TOKEN,
		},
	}

	const res = http.get(`https://${__ENV.API_PREFIX}/api/geotracking/driver-location/query/?lat=-6.183084&long=106.80352&distance=2&distanceUnit=km&shape=circle&count=50`, params)

	check(res, {
		'response code was 200': (res) => res.status === 200,
	})
}
