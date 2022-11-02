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
import { Arn, Stack, aws_opensearchservice as opensearchservice, aws_ec2 as ec2, aws_iam as iam, ArnFormat } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface OpenSearchClusterProps {
	readonly openSearchConfig: { [key: string]: string | number, }
	readonly vpc: ec2.IVpc
	readonly securityGroups: ec2.ISecurityGroup[]

	readonly identityPoolId: string
	readonly userPoolId: string
	readonly authenticatedUserRole: iam.IRole
	readonly adminRole: iam.IRole
}

/**
 * Notes:
 *
 * ElasticSearch -> OpenSearch service rename summary:
 * https://docs.aws.amazon.com/opensearch-service/latest/developerguide/rename.html
 *
 * Service-Linked Role for VPC Access:
 * https://docs.aws.amazon.com/opensearch-service/latest/developerguide/slr.html
 */
export class OpenSearchCluster extends Construct {
	readonly domain: opensearchservice.IDomain

	constructor (scope: Construct, id: string, props: OpenSearchClusterProps) {
		super(scope, id)

		const {
			openSearchConfig,
			securityGroups, vpc,
			identityPoolId, userPoolId, authenticatedUserRole, adminRole,
		} = props

		// https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cognito-auth.html
		const cognitoDashboardsRole = new iam.Role(this, 'CognitoKibanaAuthRole', {
			assumedBy: new iam.ServicePrincipal('es.amazonaws.com'),
			inlinePolicies: {
				cognitoUserPoolAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								'cognito-idp:DescribeUserPool',
								'cognito-idp:CreateUserPoolClient',
								'cognito-idp:DeleteUserPoolClient',
								'cognito-idp:UpdateUserPoolClient',
								'cognito-idp:DescribeUserPoolClient',
								'cognito-idp:AdminInitiateAuth',
								'cognito-idp:AdminUserGlobalSignOut',
								'cognito-idp:ListUserPoolClients',
							],
							resources: [Arn.format({
								resource: 'userpool',
								service: 'cognito-idp',
								resourceName: userPoolId,
								arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
							}, Stack.of(scope))],
						}),
					],
				}),
				cognitoIdentityPoolAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								'cognito-identity:DescribeIdentityPool',
								'cognito-identity:UpdateIdentityPool',
								'cognito-identity:GetIdentityPoolRoles',
							],
							resources: [Arn.format({
								resource: 'identitypool',
								service: 'cognito-identity',
								resourceName: identityPoolId,
								arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
							}, Stack.of(scope))],
						}),
					],
				}),
				setIdentityPoolRoles: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: ['cognito-identity:SetIdentityPoolRoles'],
							resources: ['*'],
						}),
					],
				}),
				passRolePolicy: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: ['iam:PassRole'],
							resources: [':aws:iam::*:role/*'],
							conditions: {
								StringLike: {
									'iam:PassedToService': [
										'cognito-identity.amazonaws.com',
									],
								},
							},
						}),
					],
				}),
			},
		})

		const domainName = namespaced(this, 'live-data', { lowerCase: true })
		const baseArn = Arn.format({ resource: 'domain', service: 'es' }, Stack.of(scope))

		authenticatedUserRole.addToPrincipalPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				// https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cognito-auth.html#cognito-auth-config-ac
				actions: [
					'es:ESHttp*',
				],
				resources: [
					`${baseArn}/${domainName}/*`,
				],
			}),
		)

		const masterNodeInstanceType = openSearchConfig.masterNodeInstanceType as string || 't3.medium.search'
		const dataNodeInstanceType = openSearchConfig.dataNodeInstanceType as string || 't3.medium.search'

		// if using large instance, use high IOPS
		let ebs: opensearchservice.EbsOptions = {
			// NOTE: verify the right value for prod
			iops: 1600,
			volumeSize: 64,
			volumeType: ec2.EbsDeviceVolumeType.IO1,
		}

		if (masterNodeInstanceType.indexOf('medium') > -1 || masterNodeInstanceType.indexOf('small') > -1 ||
		dataNodeInstanceType.indexOf('medium') > -1 || dataNodeInstanceType.indexOf('small') > -1) {
			ebs = {
				volumeSize: 64,
			}
		}

		const domain = new opensearchservice.Domain(this, 'ESCluster', {
			version: opensearchservice.EngineVersion.OPENSEARCH_1_1, // or remove this to get the latest OPENSEARCH version
			domainName,
			enableVersionUpgrade: true,
			nodeToNodeEncryption: true,
			capacity: {
				masterNodes: openSearchConfig.masterNodes as number || 3,
				dataNodes: openSearchConfig.dataNodes as number || 3,
				masterNodeInstanceType,
				dataNodeInstanceType,
			},
			vpc,
			vpcSubnets: [vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED })],
			securityGroups,
			zoneAwareness: {
				availabilityZoneCount: vpc.availabilityZones.length,
				enabled: true,
			},
			encryptionAtRest: {
				enabled: true,
			},
			enforceHttps: true,
			cognitoDashboardsAuth: {
				identityPoolId,
				userPoolId,
				role: cognitoDashboardsRole,
			},
			ebs,
			accessPolicies: [
				// eslint-disable-next-line max-len
				// https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cognito-auth.html#cognito-auth-config-ac
				new iam.PolicyStatement({
					principals: [
						new iam.ArnPrincipal(authenticatedUserRole.roleArn),
					],
					effect: iam.Effect.ALLOW,
					actions: [
						// TODO: restrict these to non PII scoped data
						'es:ESHttp*',
					],
				}),
				new iam.PolicyStatement({
					principals: [
						new iam.ArnPrincipal(adminRole.roleArn),
					],
					effect: iam.Effect.ALLOW,
					actions: [
						// TODO: restrict these permissions to non destructive tasks
						'es:*',
					],
				}),
			],
		})

		this.domain = domain
	}
}
