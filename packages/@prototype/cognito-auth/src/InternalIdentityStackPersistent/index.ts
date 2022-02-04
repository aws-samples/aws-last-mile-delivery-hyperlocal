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
import { NestedStack, NestedStackProps, RemovalPolicy, aws_cognito as cognito, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced, globalNamespaced } from '@aws-play/cdk-core'
import { CognitoFederatedRoleMappingKey } from '../CognitoFederatedRoleMappingKey'

const COGNITO_IDENTITY_PRINCIPLE = 'cognito-identity.amazonaws.com'

export interface InternalIdentityStackPersistentProps extends NestedStackProps {
	readonly administratorEmail: string
	readonly administratorName: string
}

export class InternalIdentityStackPersistent extends NestedStack {
	public readonly authenticatedRole: iam.IRole

	public readonly userPool: cognito.UserPool

	public readonly identityPool: cognito.CfnIdentityPool

	public readonly kibanaClient: cognito.UserPoolClient

	public readonly userPoolDomain: cognito.UserPoolDomain

    readonly adminGroup: cognito.CfnUserPoolGroup

	public readonly adminRole: iam.IRole

	get userPoolId (): string {
		return this.userPool.userPoolId
	}

	get identityPoolId (): string {
		return this.identityPool.ref
	}

	get kibanaClientId (): string {
		return this.kibanaClient.userPoolClientId
	}

	constructor (scope: Construct, id: string, props: InternalIdentityStackPersistentProps) {
		super(scope, id, props)

		const { administratorEmail, administratorName } = props

		const userPool = new cognito.UserPool(this, namespaced(this, 'InternalUserPool'), {
			userPoolName: namespaced(this, 'UsersInternal'),
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
			selfSignUpEnabled: false,
		})

		const userPoolDomain = userPool.addDomain('InteranlCognitoDomain', {
			cognitoDomain: {
				domainPrefix: globalNamespaced(this, 'internal-domain', { lowerCase: true }),
			},
		})

		this.userPool = userPool
		this.userPoolDomain = userPoolDomain

		this.kibanaClient = userPool.addClient('kibana', {
			generateSecret: false,
		})

		this.identityPool = new cognito.CfnIdentityPool(this, namespaced(this, 'InternalIdentityPool'), {
			identityPoolName: namespaced(this, 'IdentityPoolInternal'),
			cognitoIdentityProviders: [
				{ clientId: this.kibanaClient.userPoolClientId, providerName: userPool.userPoolProviderName },
			],
			allowUnauthenticatedIdentities: false,
		})

		const principal = new iam.FederatedPrincipal(COGNITO_IDENTITY_PRINCIPLE, {
			StringEquals: {
				[`${COGNITO_IDENTITY_PRINCIPLE}:aud`]: this.identityPool.ref,
			},
			'ForAnyValue:StringLike': {
				[`${COGNITO_IDENTITY_PRINCIPLE}:amr`]: CognitoFederatedRoleMappingKey.AUTHENTICATED,
			},
		}, 'sts:AssumeRoleWithWebIdentity')

		// This is the role that users will assume when authenticated via cognito
		this.authenticatedRole = new iam.Role(this, 'InternalAuthenticatedRole', {
			roleName: namespaced(this, 'internal-authenticated-user'),
			description: 'Role for the identity pool authorized identities - internal.',
			assumedBy: principal,
		})

		new cognito.CfnIdentityPoolRoleAttachment(this, 'InternalIdentityPoolRoleAttachment', {
			identityPoolId: this.identityPool.ref,
			roles: {
				[CognitoFederatedRoleMappingKey.AUTHENTICATED]: this.authenticatedRole.roleArn,
			},
		})

		this.adminRole = new iam.Role(this, 'AdminRole', {
			assumedBy: principal,
		})

		const adminCognitoGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
			userPoolId: userPool.userPoolId,
			description: 'Administrator group',
			groupName: 'Administrators',
			precedence: 1,
		})
		adminCognitoGroup.applyRemovalPolicy(RemovalPolicy.RETAIN)
		this.adminGroup = adminCognitoGroup

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
		adminCognitoUser.applyRemovalPolicy(RemovalPolicy.RETAIN)
	}
}
