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
const amplify = require('aws-amplify')
const config = require('../config')

const { identityPoolId, region, userPoolId, userPoolWebClientId } = config

amplify.Amplify.configure({
	Auth: {
		identityPoolId,
		region,
		userPoolId,
		userPoolWebClientId,
	},
})

const auth = amplify.Auth

const signUp = (username, password) => {
	return auth.signUp({
		username,
		password,
		attributes: {
			email: username,
			phone_number: '+6512345678',
		},
	})
}

const signIn = (username, password) => {
	return auth.signIn({
		password,
		username,
	})
}

const signOut = () => {
	return auth.signOut({ global: true })
}

module.exports.default = amplify
module.exports = {
	signIn,
	signUp,
	signOut,
}
