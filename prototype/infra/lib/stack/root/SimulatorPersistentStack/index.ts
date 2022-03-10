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
import { Construct } from 'constructs'
import { Stack, StackProps, aws_s3 as s3 } from 'aws-cdk-lib'
import { setNamespace } from '@aws-play/cdk-core'
import { WebsiteHosting } from '@aws-play/cdk-web'
import { PersistentBackendStack } from '../PersistentBackendStack'
import { ECSVpcStack, ECSContainerStack, SimulatorDataStack, IoTPolicyStack } from '@prototype/simulator'
import { BackendStack } from '../BackendStack'

export interface Env {
	readonly originUserPassword: string
	readonly destinationUserPassword: string
}

export interface SimulatorPersistentStackProps extends StackProps {
	readonly namespace: string
	readonly persistent: PersistentBackendStack
	readonly backend: BackendStack
	readonly simulatorConfig: { [key: string]: string | number, }
}

/**
 * Prototype backend stack
 */
export class SimulatorPersistentStack extends Stack {
	readonly simulatorWebsiteBucket: s3.IBucket

	readonly ecsVpc: ECSVpcStack

	readonly dataStack: SimulatorDataStack

	readonly ecsContainerStack: ECSContainerStack

	readonly iotPolicies: IoTPolicyStack

	constructor (scope: Construct, id: string, props: SimulatorPersistentStackProps) {
		super(scope, id, props)

		const {
			namespace,
			persistent: {
				identityStackPersistent: {
					userPool,
					webAppClient,
					identityPool,
					authenticatedRole: externalIdentityAuthenticatedRole,
				},
			},
			backend: {
				iotSetup: {
					iotDriverDataIngestRule,
					iotDriverStatusUpdateRule,
					iotDriverPolicy,
				},
				appConfig: {
					configBucket,
					configBucketKey,
				},
			},
			simulatorConfig,
			env,
		} = props

		setNamespace(this, namespace)

		this.ecsVpc = new ECSVpcStack(this, 'SimulatorVPC')

		this.dataStack = new SimulatorDataStack(this, 'SimulatorData', {})

		this.iotPolicies = new IoTPolicyStack(this, 'SimulatorIoTPolicies', {
			cognitoAuthenticatedRole: externalIdentityAuthenticatedRole,
		})

		this.ecsContainerStack = new ECSContainerStack(this, 'SimulatorECSStack', {
			userPool,
			identityPool,
			userPoolClient: webAppClient,
			simulatorConfig,
			iotIngestionRule: iotDriverDataIngestRule,
			iotDriverStatusRule: iotDriverStatusUpdateRule,
			iotDestinationStatusRuleName: this.iotPolicies.destinationStatusUpdateRuleName,
			iotOriginStatusRuleName: this.iotPolicies.originStatusUpdateRuleName,
			iotDriverPolicy,
			ecsVpc: this.ecsVpc.vpc,
			configBucket,
			configBucketKey,
			originTable: this.dataStack.originTable,
			originAreaIndex: this.dataStack.originAreaIndex,
			originExecutionIdIndex: this.dataStack.originExecutionIdIndex,
			originUserPassword: (env as Env).originUserPassword,
			destinationTable: this.dataStack.destinationTable,
			destinationAreaIndex: this.dataStack.destinationAreaIndex,
			destinationExecutionIdIndex: this.dataStack.destinationExecutionIdIndex,
			destinationUserPassword: (env as Env).destinationUserPassword,
			simulatorConfigBucket: this.dataStack.simulatorConfigBucket,
		})

		const websiteHosting = new WebsiteHosting(this, 'SimulatorWebsiteHosting', {
			bucketName: 'simulator-website',

			// react routing helper
			errorConfigurations: [
				{
					errorCode: 404,
					responseCode: 200,
					responsePagePath: '/',
				},
			],
		})
		this.simulatorWebsiteBucket = websiteHosting.hostingBucket
	}
}
