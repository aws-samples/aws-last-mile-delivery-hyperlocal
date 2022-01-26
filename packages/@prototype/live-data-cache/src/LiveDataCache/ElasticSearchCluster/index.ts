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
import { Construct, Arn, Stack } from '@aws-cdk/core'
import { Domain, IDomain, ElasticsearchVersion } from '@aws-cdk/aws-elasticsearch'
import { EbsDeviceVolumeType, ISecurityGroup, IVpc, SubnetType } from '@aws-cdk/aws-ec2'
import { ArnPrincipal, Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { namespaced } from '@aws-play/cdk-core'

export interface ElasticSearchClusterProps {
	readonly esConfig: { [key: string]: string | number, }
	readonly vpc: IVpc
	readonly securityGroups: ISecurityGroup[]

	readonly identityPoolId: string
	readonly userPoolId: string
	readonly authenticatedUserRole: IRole
	readonly adminRole: IRole
}

/**
 * Notes:
 *
 * An ES Service-Linked Role for VPC Access must be created before creating an ES Domain.
 */
export class ElasticSearchCluster extends Construct {
	readonly esDomain: IDomain

	constructor (scope: Construct, id: string, props: ElasticSearchClusterProps) {
		super(scope, id)

		const baseArn = Arn.format({
			resource: 'domain',
			service: 'es',
		}, Stack.of(scope))

		const {
			esConfig,
			securityGroups, vpc,
			identityPoolId, userPoolId, authenticatedUserRole, adminRole,
		} = props

		// https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-cognito-auth.html#es-cognito-auth-role
		const cognitoKibanaRole = new Role(this, 'CognitoKabanaAuthRole', {
			assumedBy: new ServicePrincipal('es.amazonaws.com'),
			managedPolicies: [ManagedPolicy.fromManagedPolicyArn(this, 'AmazonESCognitoAccess', 'arn:aws:iam::aws:policy/AmazonESCognitoAccess')],
		})

		const domainName = namespaced(this, 'live-data-es', { lowerCase: true })

		authenticatedUserRole.addToPrincipalPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				// https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-cognito-auth.html#es-cognito-auth-config-ac
				// https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticsearchservice.html
				actions: [
					'es:ESHttp*',
				],
				resources: [
					`${baseArn}/${domainName}/*`,
				],
			}),
		)

		const elasticSearchClusterDomain = new Domain(this, 'ESCluster', {
			version: ElasticsearchVersion.V7_10,
			domainName,
			enableVersionUpgrade: true,
			nodeToNodeEncryption: true,
			capacity: {
				masterNodes: esConfig.masterNodes as number || 3,
				dataNodes: esConfig.dataNodes as number || 3,
				masterNodeInstanceType: esConfig.masterNodeInstanceType as string || 't3.medium.elasticsearch',
				dataNodeInstanceType: esConfig.dataNodeInstanceType as string || 't3.medium.elasticsearch',
			},
			vpc,
			vpcSubnets: [vpc.selectSubnets({ subnetType: SubnetType.ISOLATED })],
			securityGroups,
			zoneAwareness: {
				availabilityZoneCount: vpc.availabilityZones.length,
				enabled: true,
			},
			encryptionAtRest: {
				enabled: true,
			},
			enforceHttps: true,
			cognitoKibanaAuth: {
				identityPoolId,
				userPoolId,
				role: cognitoKibanaRole,
			},
			ebs: {
				// TODO: verify the right value for prod
				iops: 1600,
				volumeSize: 64,
				volumeType: EbsDeviceVolumeType.IO1,
			},
			accessPolicies: [
				// eslint-disable-next-line max-len
				// https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-cognito-auth.html#es-cognito-auth-config-ac
				new PolicyStatement({
					principals: [
						new ArnPrincipal(authenticatedUserRole.roleArn),
					],
					effect: Effect.ALLOW,
					actions: [
						// TODO: restrict these to non PII scoped data
						'es:ESHttp*',
					],
				}),
				new PolicyStatement({
					principals: [
						new ArnPrincipal(adminRole.roleArn),
					],
					effect: Effect.ALLOW,
					actions: [
						// TODO: restrict these permissions to non destructive tasks
						'es:*',
					],
				}),
			],
		})

		// retainResource(elasticSearchClusterDomain)

		this.esDomain = elasticSearchClusterDomain
	}
}
