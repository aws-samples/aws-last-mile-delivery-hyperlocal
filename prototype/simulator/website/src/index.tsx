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
import React from 'react'
import Amplify from 'aws-amplify'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import reportWebVitals from './reportWebVitals'
import './index.css'

declare let appVariables: {
  REGION: string
  USERPOOL_ID: string
  USERPOOL_CLIENT_ID: string
  SIMULATOR_API_URL: string
  SEARCH_API_URL: string
  MAP_BOX_TOKEN: string
}

Amplify.configure({
	// appVariables is included dynamically from public/index.html at build time
	/* eslint-disable no-undef */
	Auth: {
		region: appVariables.REGION,
		userPoolId: appVariables.USERPOOL_ID,
		userPoolWebClientId: appVariables.USERPOOL_CLIENT_ID,
	},
	API: {
		endpoints: [
			{
				name: 'SearchApi',
				endpoint: appVariables.SEARCH_API_URL,
			},
			{
				name: 'SimulatorApi',
				endpoint: appVariables.SIMULATOR_API_URL,
			},
		],
	},
	/* eslint-enable no-undef */
})

render(
	<React.StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>,
	document.getElementById('root'),
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
