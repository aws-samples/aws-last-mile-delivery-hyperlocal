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
const utils = require('/opt/lambda-utils')

const s3 = new aws.S3()

const SIMULATOR_CONFIG_BUCKET = process.env.SIMULATOR_CONFIG_BUCKET
const SIMULATOR_CONFIG_FILE_PREFIX = process.env.SIMULATOR_CONFIG_FILE_PREFIX

const getSignedUrl = (bucket, key, action) =>
	s3.getSignedUrlPromise(action, {
		ContentType: 'application/json',
		Bucket: bucket,
		Key: key,
		Expires: 300, // 5 minutes
	})

const handler = async (event) => {
	if (event.body === undefined) {
		console.error(`Property 'body' not found in event object: ${JSON.stringify(event)}`)

		return utils.fail({ error: 'Unrecognized message format' })
	}

	let { body } = event

	if (typeof body === 'string' || body instanceof String) {
		body = JSON.parse(body)
	}

	let { filename, action } = body

	if (!filename) {
		return utils.fail({ error: 'The body must contain the filename property' }, 400)
	}

	if (!action) {
		action = 'putObject'
	}

	if (!['putObject', 'getObject'].includes(action)) {
		return utils.fail({ message: `The action ${action} is not recognized` }, 400)
	}

	const key = `${SIMULATOR_CONFIG_FILE_PREFIX}/${filename}`
	const signedUrl = await getSignedUrl(SIMULATOR_CONFIG_BUCKET, key, action)

	return utils.success({
		signedUrl,
		key,
	})
}

exports.handler = handler
