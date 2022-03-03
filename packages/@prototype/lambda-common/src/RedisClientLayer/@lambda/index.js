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
const redis = require('redis')
const awsSdk = require('aws-sdk')

const secrets = new awsSdk.SecretsManager()
const clients = {}

const generateClientId = (options) => {
	// Java's hashCode method converted to js
	const hashCode = (str) => {
		let hash = 0; let i = 0; const len = str.length
		while (i < len) {
			hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0
		}

		return hash
	}

	return hashCode(JSON.stringify(options))
}

exports.getRedisClient = async (options = { clusterMode: true, readonly: false, useReplicas: true }) => {
	const clientId = generateClientId(options)
	const { clusterMode, readonly, useReplicas } = options

	if (!clients[clientId]) {
		const memoryDbAdminPassword = await secrets.getSecretValue({
			SecretId: process.env.MEMORYDB_ADMIN_SECRET,
		}).promise()

		const url = `rediss://${process.env.MEMORYDB_HOST}:${process.env.MEMORYDB_PORT}`
		const redisOptions = {
			socket: {
				tls: true,
			},
			username: process.env.MEMORYDB_ADMIN_USERNAME,
			password: memoryDbAdminPassword.SecretString,
		}

		clients[clientId] = clusterMode
			? redis.createCluster({
				rootNodes: [{
					url,
				}],
				useReplicas,
				defaults: {
					...redisOptions,
				},
			})
			: redis.createClient({
				url,
				readonly,
				...redisOptions,
			})

		await clients[clientId].connect()
	}

	return clients[clientId]
}

exports.redis = redis
