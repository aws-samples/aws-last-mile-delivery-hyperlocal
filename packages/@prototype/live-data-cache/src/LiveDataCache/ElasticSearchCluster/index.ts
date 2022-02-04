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
import { Arn, Stack, aws_elasticsearch as elasticsearch, aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface ElasticSearchClusterProps {
	readonly esConfig: { [key: string]: string | number, }
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
 * An ES Service-Linked Role for VPC Access must be created before creating an ES Domain.
 */
export class ElasticSearchCluster extends Construct {
	readonly esDomain: elasticsearch.IDomain

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
		const cognitoKibanaRole = new iam.Role(this, 'CognitoKabanaAuthRole', {
			assumedBy: new iam.ServicePrincipal('es.amazonaws.com'),
			managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonESCognitoAccess', 'arn:aws:iam::aws:policy/AmazonESCognitoAccess')],
		})

		const domainName = namespaced(this, 'live-data-es', { lowerCase: true })

		authenticatedUserRole.addToPrincipalPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
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

		const elasticSearchClusterDomain = new elasticsearch.Domain(this, 'ESCluster', {
			version: elasticsearch.ElasticsearchVersion.V7_10,
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
			vpcSubnets: [vpc.selectSubnets({ subnetType: ec2.SubnetType.ISOLATED })],
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
				volumeType: ec2.EbsDeviceVolumeType.IO1,
			},
			accessPolicies: [
				// eslint-disable-next-line max-len
				// https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-cognito-auth.html#es-cognito-auth-config-ac
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

		// retainResource(elasticSearchClusterDomain)

		this.esDomain = elasticSearchClusterDomain
	}
}
