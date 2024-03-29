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
/* eslint-disable no-console */
const { v4: uuidv4 } = require('uuid')
const { nanoid } = require('nanoid')
const amplify = require('../lib/amplify')
const cognito = require('../lib/cognito')
const ddb = require('../lib/dynamoDB')
const config = require('../config')
const helper = require('../helper')

const initialiseUser = async () => {
	const user = {
		username: `${config.baseUsername}-${nanoid()}@amazon.com`,
		password: config.userPassword,
	}

	await amplify.signUp(user.username, user.password)
	await cognito.confirmSignup(user.username)
	await cognito.updateUserAttributes(user.username)

	return amplify.signIn(user.username, user.password)
}

const setupIdentity = async () => {
	const usr = await initialiseUser()
	const jwt = usr.signInUserSession.getIdToken().getJwtToken()
	const cognitoIdentity = await cognito.setupCognitoIdentity(jwt)

	return [cognitoIdentity, usr]
}

const execute = async (payload) => {
	const { lat, long, radius, area } = payload
	console.debug('Initialising user...')
	const [identity, user] = await setupIdentity()

	console.debug(identity, user.attributes.email)
	console.log(lat, long)
	const originId = uuidv4()

	console.debug('Writing origin configuration...')

	const coords = helper.generateRandomPoint(lat, long, radius)

	await ddb.putItem(config.originTable, {
		ID: originId,
		lat: coords.latitude,
		long: coords.longitude,
		area,
		identity,
		email: user.attributes.email,
		// TODO: extend and make it more relevant to the reality
		// include only one tag for the simulation
		// it can be extended to include multiple tags eg. Jakarta, North Jakarta
		tags: [config.demographicAreas[Math.floor(Math.random() * 100) % config.demographicAreas.length]],
	})

	return {
		originId,
	}
}

module.exports = {
	execute,
}
