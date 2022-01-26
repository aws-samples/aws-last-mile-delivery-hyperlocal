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
import * as fs from 'fs'
import { parse as parseINI } from 'ini'
import { sync as findUp } from 'find-up'

const ENGAGEMENT_REGISTRY_PATTERN = /(aws-proto-engagement-(\d+))/

/**
 * Reads the artifact repository from the local project .npmrc file.
 */
export function getArtifactRepository (): string | undefined {
	const npmrcPath = findUp('.npmrc', { cwd: __dirname })

	if (npmrcPath) {
		try {
			const npmrc = parseINI(fs.readFileSync(npmrcPath, { encoding: 'utf-8' }))

			const repositoryName = (ENGAGEMENT_REGISTRY_PATTERN.exec(
				npmrc.registry || '',
			) || [])[1]

			if (repositoryName == null) {
				console.info('Could not determine engagement repository', __dirname)
			}

			return repositoryName
		} catch (error) {
			console.warn(
				'Could not determine engagement repository',
				__dirname,
				error,
			)
		}
	}

	return undefined
}
