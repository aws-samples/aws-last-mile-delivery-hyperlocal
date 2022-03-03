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
const aws = require('aws-sdk')

const APIKEY_SECRETNAME_JSON = process.env.APIKEY_SECRETNAME_JSON

const apigw = new aws.APIGateway()
const secretsManager = new aws.SecretsManager()

const onEvent = async (event, context) => {
	const apiKeySecretNameList = JSON.parse(APIKEY_SECRETNAME_JSON)

	console.debug(`ApiKey-SecretName: ${APIKEY_SECRETNAME_JSON}`)
	console.debug(`Event payload: ${JSON.stringify(event, null, 2)}`)

	const { RequestType } = event

	console.log(`ProviderInitialSetup :: RequestType = ${RequestType}`)

	await handleRequest(apiKeySecretNameList)

	// switch (RequestType) {
	// 	case 'Create':
	// 		await handleCreate(apiKeySecretNameList)
	// 		break
	// 	case 'Update':
	// 		await handleUpdate(apiKeySecretNameList)
	// 		break
	// 	default:
	//         // noop
	// }
}

const handleRequest = async (apiKeySecretNameList) => {
	for (const apiKeySecretName of apiKeySecretNameList) {
		let apiKey, smValue

		try {
			apiKey = await apigw.getApiKey({
				apiKey: apiKeySecretName.keyId,
				includeValue: true,
			}).promise()
		} catch (err) {
			console.error(`Error while retreiveing apiKey with ID ${apiKeySecretName.keyId}: `, err)
			console.error(`Skipping ${JSON.stringify(apiKeySecretName)}`)
			continue
		}

		try {
			smValue = await secretsManager.getSecretValue({
				SecretId: apiKeySecretName.secret,
			}).promise()
		} catch (err) {
			console.warn(`Error while retrieving secret ${apiKeySecretName.secret} from secretsManager: `, err)
		}

		// secret doesn't exist, create it
		if (smValue == null) {
			try {
				const smResult = await secretsManager.createSecret({
					Name: apiKeySecretName.secret,
					SecretString: apiKey.value,
				}).promise()
			} catch (err) {
				console.error(`Error while creating secret ${apiKeySecretName.secret} in secretsManager:`, err)
			}
		// secret exists, update it
		} else {
			try {
				const smResult = await secretsManager.putSecretValue({
					SecretId: apiKeySecretName.secret,
					SecretString: apiKey.value,
				}).promise()
			} catch (err) {
				console.error(`Error while updating secret ${apiKeySecretName.secret} in secretsManager: `, err)
			}
		}
	}
}

const handleCreate = async (apiKeySecretNameList) => {
	for (const apiKeySecretName of apiKeySecretNameList) {
		try {
			const apiKey = await apigw.getApiKey({
				apiKey: apiKeySecretName.keyId,
				includeValue: true,
			}).promise()

			const smResult = await secretsManager.createSecret({
				Name: apiKeySecretName.secret,
				SecretString: apiKey.value,
			}).promise()

			console.log(`Successfully created secret (${apiKeySecretName.secret}) for apiKey value of ${apiKeySecretName.keyId}`)
		} catch (err) {
			console.error(`Error while syncing apikey value ${apiKeySecretName.keyId} to secretsManager, skipping`)

			console.error(err)

			await handleUpdate([apiKeySecretName])
		}
	}
}

const handleUpdate = async (apiKeySecretNameList) => {
	for (const apiKeyArnSecretName of apiKeySecretNameList) {
		try {
			const apiKey = await apigw.getApiKey({
				apiKey: apiKeyArnSecretName.keyId,
				includeValue: true,
			}).promise()

			const smResult = await secretsManager.putSecretValue({
				SecretId: apiKeyArnSecretName.secret,
				SecretString: apiKey.value,
			}).promise()

			console.log(`Successfully updated apiKey value of ${apiKeyArnSecretName.keyId} to secret ${apiKeyArnSecretName.secret}`)
		} catch (err) {
			console.error(`Error while syncing apikey value ${apiKeyArnSecretName.keyId} to secretsManager, skipping`)
			console.error(err)
		}
	}
}

exports.onEvent = onEvent
