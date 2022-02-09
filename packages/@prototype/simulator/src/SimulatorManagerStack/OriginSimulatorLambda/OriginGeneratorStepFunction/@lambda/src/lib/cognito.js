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
const iot = require('./iot')
const config = require('../config')

const cognito = new aws.CognitoIdentityServiceProvider({ maxRetries: 5, retryDelayOptions: { base: 300 } })
const idn = new aws.CognitoIdentity({ maxRetries: 5, retryDelayOptions: { base: 300 } })

const confirmSignup = (email) => {
	return cognito.adminConfirmSignUp({
		UserPoolId: config.userPoolId,
		Username: email,
	}).promise()
}

const deleteUser = (email) => {
	return cognito.adminDeleteUser({
		UserPoolId: config.userPoolId,
		Username: email,
	}).promise()
}

const deleteIdentity = async (identity) => {
	await idn.deleteIdentities({
		IdentityIdsToDelete: [identity],
	}).promise()

	await iot.detachPolicy(config.iotPolicyName, identity)
}

const updateUserAttributes = (email) => {
	return cognito.adminUpdateUserAttributes({
		UserPoolId: config.userPoolId,
		Username: email,
		UserAttributes: [{
			Name: 'email_verified',
			Value: 'true',
		}, {
			Name: 'phone_number_verified',
			Value: 'true',
		}],
	}).promise()
}

const setupCognitoIdentity = (jwt) => {
	const loginKey = 'cognito-idp.' + aws.config.region + '.amazonaws.com/' + config.userPoolId
	const login = {
		[loginKey]: jwt,
	}

	aws.config.credentials = new aws.CognitoIdentityCredentials({
		IdentityPoolId: config.identityPoolId,
		Logins: login,
	})

	return new Promise((resolve, reject) => {
		aws.config.credentials.refresh(async (err) => {
			if (err) {
				reject(err)

				return
			}
			const principal = aws.config.credentials.identityId

			await iot.attachPolicy(config.iotPolicyName, principal)

			resolve(principal)
		})
	})
}

module.exports = {
	confirmSignup,
	updateUserAttributes,
	setupCognitoIdentity,
	deleteUser,
	deleteIdentity,
}
