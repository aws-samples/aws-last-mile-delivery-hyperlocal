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
import { Construct, Stage } from '@aws-cdk/core'
import { BackendStack } from '../../BackendStack'
import { PersistentBackendStack } from '../../PersistentBackendStack'
import { BackendStageProps } from './BackendStageProps'
import config from '../../../../../config'

/**
 * Backend stage for prototype deployment.
 * @see https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html
 */
export class BackendStage extends Stage {
	constructor (scope: Construct, id: string, props: BackendStageProps) {
		super(scope, id, props)

		const { namespace } = props

		const persistent = new PersistentBackendStack(this, 'PersistentBackend', {
			...props,
			stackName: `${namespace}-PersistentBackend`,
			...config,
		})

		new BackendStack(this, 'Backend', {
			...props,
			stackName: `${namespace}-Backend`,
			persistent,
			...config,
		})
	}
}
