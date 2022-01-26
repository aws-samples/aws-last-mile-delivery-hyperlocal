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
import * as cdk from '@aws-cdk/core'
import * as cognito from '@aws-cdk/aws-cognito'
import * as iam from '@aws-cdk/aws-iam'
import { namespaced, globalNamespaced } from '@aws-play/cdk-core'
import { CognitoFederatedRoleMappingKey } from '../CognitoFederatedRoleMappingKey'

const COGNITO_IDENTITY_PRINCIPLE = 'cognito-identity.amazonaws.com'

export interface IdentityStackPersistentProps extends cdk.NestedStackProps {
	readonly administratorEmail: string
	readonly administratorName: string
}

export class IdentityStackPersistent extends cdk.NestedStack {
	public readonly authenticatedRole: iam.IRole

	public readonly userPool: cognito.UserPool

	public readonly identityPool: cognito.CfnIdentityPool

	public readonly webAppClient: cognito.UserPoolClient

	public readonly simulatorAppClient: cognito.UserPoolClient

	public readonly nativeAppClient: cognito.UserPoolClient

	public readonly userPoolDomain: cognito.UserPoolDomain

	get userPoolId (): string {
		return this.userPool.userPoolId
	}

	get identityPoolId (): string {
		return this.identityPool.ref
	}

	get webAppClientId (): string {
		return this.webAppClient.userPoolClientId
	}

	get nativeAppClientId (): string {
		return this.nativeAppClient.userPoolClientId
	}

	constructor (scope: cdk.Construct, id: string, props: IdentityStackPersistentProps) {
		super(scope, id, props)

		const { administratorEmail, administratorName } = props

		const userPool = new cognito.UserPool(this, namespaced(this, 'UserPool'), {
			userPoolName: namespaced(this, 'Users'),
			standardAttributes: {
				givenName: {
					mutable: true,
					required: false,
				},
				familyName: {
					mutable: true,
					required: false,
				},
				email: {
					mutable: true,
					required: true,
				},
				phoneNumber: {
					mutable: true,
					required: true,
				},
			},
			autoVerify: {
				email: true,
				phone: true,
			},
			signInAliases: { email: true },
			selfSignUpEnabled: true,
		})
		// Remember user devices, use the device key for storage reference
		const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool
		// https://github.com/aws-cloudformation/aws-cloudformation-coverage-roadmap/issues/448#issuecomment-673222930
		cfnUserPool.deviceConfiguration = {
			challengeRequiredOnNewDevice: false,
			deviceOnlyRememberedOnUserPrompt: false,
		}

		const userPoolDomain = userPool.addDomain('CognitoDomain', {
			cognitoDomain: {
				domainPrefix: globalNamespaced(this, 'domain'),
			},
		})

		this.userPool = userPool
		this.userPoolDomain = userPoolDomain

		this.webAppClient = userPool.addClient('web-app')

		this.simulatorAppClient = userPool.addClient('simulator')

		this.nativeAppClient = userPool.addClient('native-app', {
			generateSecret: true,
		})

		this.identityPool = new cognito.CfnIdentityPool(this, namespaced(this, 'IdentityPool'), {
			identityPoolName: namespaced(this, 'IdentityPool'),
			cognitoIdentityProviders: [
				{ clientId: this.webAppClient.userPoolClientId, providerName: userPool.userPoolProviderName },
				{ clientId: this.simulatorAppClient.userPoolClientId, providerName: userPool.userPoolProviderName },
				{ clientId: this.nativeAppClient.userPoolClientId, providerName: userPool.userPoolProviderName },
			],
			// TODO: enabled for now, but need to determine production strategy for "guest" users
			allowUnauthenticatedIdentities: true,
		})

		// This is the role that users will assume when authenticated via cognito
		this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
			roleName: namespaced(this, 'authenticated-user'),
			description: 'Role for the identity pool authorized identities.',
			assumedBy: new iam.FederatedPrincipal(COGNITO_IDENTITY_PRINCIPLE, {
				StringEquals: {
					[`${COGNITO_IDENTITY_PRINCIPLE}:aud`]: this.identityPool.ref,
				},
				'ForAnyValue:StringLike': {
					[`${COGNITO_IDENTITY_PRINCIPLE}:amr`]: CognitoFederatedRoleMappingKey.AUTHENTICATED,
				},
			}, 'sts:AssumeRoleWithWebIdentity'),
			inlinePolicies: {
				simulatorPolicyIoT: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								// used by the simulator
								'iot:AttachPolicy',
								'iot:DetachPolicy',
							],
							resources: ['*'],
						}),
					],
				}),
				simulatorPolicyCognito: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								// used by the simulator
								'cognito-identity:DeleteIdentities',
							],
							resources: ['*'],
						}),
					],
				}),
			},
		})

		const unauthenticatedRole = new iam.Role(this, namespaced(this, 'UnauthenticatedRole'), {
			roleName: namespaced(this, 'unauthenticated-user'),
			description: 'Role for the identity pool unauthorized identities.',
			assumedBy: new iam.FederatedPrincipal(COGNITO_IDENTITY_PRINCIPLE, {
				StringEquals: {
					[`${COGNITO_IDENTITY_PRINCIPLE}:aud`]: this.identityPool.ref,
				},
				'ForAnyValue:StringLike': {
					[`${COGNITO_IDENTITY_PRINCIPLE}:amr`]: CognitoFederatedRoleMappingKey.UNAUTHENTICATED,
				},
			}, 'sts:AssumeRoleWithWebIdentity'),
		})

		new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
			identityPoolId: this.identityPool.ref,
			roles: {
				[CognitoFederatedRoleMappingKey.AUTHENTICATED]: this.authenticatedRole.roleArn,
				[CognitoFederatedRoleMappingKey.UNAUTHENTICATED]: unauthenticatedRole.roleArn,
			},
		})

		const adminCognitoGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
			userPoolId: userPool.userPoolId,
			description: 'Administrator group',
			groupName: 'Administrators',
			precedence: 1,
		})
		adminCognitoGroup.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

		const adminCognitoUser = new cognito.CfnUserPoolUser(this, 'AdminUser', {
			userPoolId: userPool.userPoolId,
			desiredDeliveryMediums: ['EMAIL'],
			forceAliasCreation: true,
			userAttributes: [
				// { name: 'givenName', value: administratorName },
				// { name: 'familyName', value: administratorName },
				{ name: 'email', value: administratorEmail },
				{ name: 'email_verified', value: 'true' },
				// { name: 'phoneNumber', value: '555-1234-5678' },
			],
			username: administratorEmail,
		})
		adminCognitoUser.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const adminGroupAssignment = new cognito.CfnUserPoolUserToGroupAttachment(this, 'AdminGroupAssignment', {
			userPoolId: userPool.userPoolId,
			groupName: adminCognitoGroup.ref,
			username: adminCognitoUser.ref,
		})

		new cdk.CfnOutput(this, 'UserPoolIdOutput', {
			exportName: 'UserPoolId',
			value: this.userPoolId,
		})

		new cdk.CfnOutput(this, 'IdentityPoolIdOutput', {
			exportName: 'IdentityPoolId',
			value: this.identityPoolId,
		})

		new cdk.CfnOutput(this, 'WebAppClientIdOutput', {
			exportName: 'WebAppClientId',
			value: this.webAppClientId,
		})

		new cdk.CfnOutput(this, 'NativeAppClientIdOutput', {
			exportName: 'NativeAppClientId',
			value: this.nativeAppClientId,
		})
	}
}
