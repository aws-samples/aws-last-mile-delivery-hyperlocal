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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Construct } from 'constructs'
import { Stack, StackProps } from 'aws-cdk-lib'
import { setNamespace } from '@aws-play/cdk-core'
import { PersistentBackendStack } from '../PersistentBackendStack'
import { MonitoringNestedStack } from '../../nested/MonitoringNestedStack'

export interface DebugStackProps extends StackProps {
	readonly namespace: string
	readonly persistent: PersistentBackendStack
}

/**
 * Prototype backend stack
 */
export class DebugStack extends Stack {
	constructor (scope: Construct, id: string, props: DebugStackProps) {
		super(scope, id, props)

		const {
			namespace,
			persistent: {
				vpcPersistent: {
					vpc,
				},
				internalIdentityStack: {
					userPoolDomain: internalUserPoolDomain,
				},
				backendBaseNestedStack: {
					vpcNetworking,
					liveDataCache,
				},
			},
		} = props

		setNamespace(this, namespace)

		const monitoringNestedStack = new MonitoringNestedStack(this, 'MonitoringNestedStack', {
			vpc,
			vpcNetworking,
			openSearchDomain: liveDataCache.openSearchDomain,
			memoryDBCluster: liveDataCache.memoryDBCluster,
			internalUserPoolDomain,
		})
	}
}
