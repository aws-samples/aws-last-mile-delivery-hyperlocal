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
const aws = require('../lib/aws-sdk')
const userData = require('../lib/userData')
const amplify = require('../lib/amplify')
const cognito = require('../lib/cognito')
const { loadRemoteFile } = require('../lib/s3')
const logger = require('../utils/logger')
const config = require('../config')

let identity
let user

const initialiseUser = async (baseUsername) => {
	user = userData(baseUsername)

	await amplify.signUp(user.username, user.password)
	await cognito.confirmSignup(user.username)
	await cognito.updateUserAttributes(user.username)

	return amplify.signIn(user.username, user.password)
}

// TODO: change for the drivers to have different approach
const setupIdentity = async (policyName, baseUsername) => {
	const usr = await initialiseUser(baseUsername)
	const jwt = usr.signInUserSession.getIdToken().getJwtToken()
	const cognitoIdentity = await cognito.setupCognitoIdentity(policyName, jwt)

	identity = cognitoIdentity
	logger.debug(`Simulator initialised for user: ${user.username} with identity ${identity}`)

	return [identity, usr]
}

const terminateUser = async () => {
	await amplify.signOut()

	await cognito.deleteUser(user.username)
	await cognito.deleteIdentity(identity)
}

function publishMessage (device, topic, msg) {
	device.publish(topic, msg, { qos: 1 }, function (err) {
		if (err) {
			logger.error('Error on publishing: ')
			logger.error(err)

			return
		}

		logger.log(`Message published :: ${topic} ::`, msg)
	})
}

/// new one used by origin / destination app
const setupLogin = async (email, password) => {
	const usr = await amplify.signIn(email, password)
	const jwt = usr.signInUserSession.getIdToken().getJwtToken()
	const loginKey = 'cognito-idp.' + config.region + '.amazonaws.com/' + config.userPoolId
	const login = {
		[loginKey]: jwt,
	}

	const creds = new aws.CognitoIdentityCredentials({
		IdentityPoolId: config.identityPoolId,
		Logins: login,
	})

	return new Promise((resolve, reject) => creds.refresh((err) => {
		if (err) {
			reject(err)
		}

		resolve({ creds, usr })
	}))
}

const refreshCredentials = (creds) => {
	return new Promise((resolve) => creds.refresh((err) => {
		if (err) {
			logger.error('Error refreshing the token: ')
			logger.error(err)

			return
		}
		logger.info('Refreshed cognito identity')

		resolve(creds)
	}))
}

const refreshUserSession = async (usr) => {
	return new Promise((resolve) => {
		const refreshToken = usr.signInUserSession.getRefreshToken()
		usr.refreshSession(refreshToken, (err, session) => {
			if (err) {
				logger.error('Error refreshing user session: ')
				logger.error(err)

				return
			}
			logger.info('Refreshed user session')

			usr.setSignInUserSession(session)
			resolve(session)
		})
	})
}

const toRadians = (angdeg) => {
	return angdeg / 180.0 * Math.PI
}

/**
 * Generates number of random geolocation points given a center and a radius.
 *
 * Reference URL: http://goo.gl/KWcPE.
 * @param  {number|string} lat Latitute value
 * @param  {number|string} long Longitude value
 * @param  {number|string} radius Radius in meters.
 * @return {Object} The generated random points as JS object with latitude and longitude attributes.
 */
const generateRandomPoint = (lat, long, radius) => {
	var y0 = Number(lat)
	var x0 = Number(long)

	// Convert Radius from meters to degrees.
	var rd = Number(radius) / 111000.0

	var u = Math.random()
	var v = Math.random()

	var w = rd * Math.sqrt(u)
	var t = 2 * Math.PI * v
	var x = w * Math.cos(t)
	var y = w * Math.sin(t)

	var xp = x / Math.cos(toRadians(y0))

	return {
		latitude: y + y0,
		longitude: xp + x0,
		elevation: Number((Math.random() * 10).toFixed(2)),
	}
}

module.exports = {
	refreshUserSession,
	refreshCredentials,
	initialiseUser,
	setupIdentity,
	loadRemoteFile,
	terminateUser,
	publishMessage,
	generateRandomPoint,
	setupLogin,
}
