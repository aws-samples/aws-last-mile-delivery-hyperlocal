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
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { CfnServiceLinkedRole } from '@aws-cdk/aws-iam'
import { ICluster } from '@aws-cdk/aws-ecs'
import { setNamespace } from '@aws-play/cdk-core'
import { VpcPersistent } from '@prototype/networking'
import { IdentityStackPersistent, InternalIdentityStackPersistent } from '@prototype/cognito-auth'
import { BackendEcsCluster, DataStoragePersistent } from '@prototype/data-storage'
import { BackendBaseNestedStack } from '../../nested/BackendBaseNestedStack'

export interface PersistentBackendStackProps extends StackProps {
	readonly namespace: string
	readonly administratorEmail: string
	readonly administratorName: string

	readonly vpcNetworkConfig: { [key: string]: [{ cidr: string, port: number, }], }
	readonly esConfig: { [key: string]: string | number, }
	readonly redisConfig: { [key: string]: string | number, }
}

/**
 * Prototype backend stack
 */
export class PersistentBackendStack extends Stack {
	readonly vpcPersistent: VpcPersistent

	readonly identityStackPersistent: IdentityStackPersistent

	readonly internalIdentityStack: InternalIdentityStackPersistent

	readonly dataStoragePersistent: DataStoragePersistent

	readonly backendEcsCluster: ICluster

	readonly backendBaseNestedStack: BackendBaseNestedStack

	constructor (scope: Construct, id: string, props: PersistentBackendStackProps) {
		super(scope, id, props)

		const {
			namespace, administratorEmail, administratorName,
			vpcNetworkConfig, esConfig, redisConfig,
		} = props

		setNamespace(this, namespace)

		const vpcPersistent = new VpcPersistent(this, 'VpcPersistent', {
			vpcName: 'Vpc',
			vpcCidr: '10.0.0.0/16',
		})

		// apparently this service role needs to be created,
		// it needs to be created once, and for some reason it takes time to propagate
		// and for ES to be able to detect. So moving it here.
		const esServiceLinkedRole = new CfnServiceLinkedRole(this, 'EsServiceLinkedRole', {
			awsServiceName: 'es.amazonaws.com',
			description: 'ES Service-Linked Role for VPC Access',
		})
		esServiceLinkedRole.node.addDependency(vpcPersistent)

		const identityStack = new IdentityStackPersistent(this, 'IdentityStackPersistent', {
			administratorEmail,
			administratorName,
		})

		const internalIdentityStack = new InternalIdentityStackPersistent(this, 'InternalIdentityStackPersistent', {
			administratorEmail,
			administratorName,
		})

		const dataStorage = new DataStoragePersistent(this, 'DataStoragePersistent', {})

		const backendEcsCluster = new BackendEcsCluster(this, 'BackendEcsCluster', {
			vpc: vpcPersistent.vpc,
		})

		const backendBaseNestedStack = new BackendBaseNestedStack(this, 'BackendBaseNestedStack', {
			vpc: vpcPersistent.vpc,
			identityPoolId: internalIdentityStack.identityPoolId,
			userPoolId: internalIdentityStack.userPoolId,
			internalIdentityAuthenticatedRole: internalIdentityStack.authenticatedRole,
			adminRole: internalIdentityStack.adminRole,
			vpcNetworkConfig,
			esConfig,
			redisConfig,
		})

		this.vpcPersistent = vpcPersistent
		this.identityStackPersistent = identityStack
		this.internalIdentityStack = internalIdentityStack
		this.dataStoragePersistent = dataStorage
		this.backendBaseNestedStack = backendBaseNestedStack
		this.backendEcsCluster = backendEcsCluster.cluster
	}
}
