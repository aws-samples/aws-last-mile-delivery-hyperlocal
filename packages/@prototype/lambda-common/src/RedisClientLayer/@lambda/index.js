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
let client = null

exports.getRedisClient = async () => {
	if (client == null) {
		const adminPassword = await secrets.getSecretValue({
			SecretId: process.env.MEMORYDB_ADMIN_SECRET,
		}).promise()

		client = redis.createCluster({
			rootNodes: [{
				url: `redis://${process.env.MEMORYDB_HOST}:${process.env.MEMORYDB_PORT}`,
			}],
			useReplicas: true,
			defaults: {
				socket: {
					tls: true,
				},
				username: process.env.MEMORYDB_ADMIN_USERNAME,
				password: adminPassword.SecretString,
			},
		})

		await client.connect()
	}

	return client
}

exports.redis = redis
