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
import { Construct } from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import * as cr from '@aws-cdk/custom-resources'
import { namespaced, namespacedBucket } from '@aws-play/cdk-core'
import * as fs from 'fs'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MonitoringProps {
    readonly esEndpoint: string
    readonly redisEndpoint: string
    readonly cognitoEndpoint: string
    readonly vpc: ec2.IVpc
    readonly securityGroup: ec2.ISecurityGroup
}

export class Monitoring extends Construct {
	constructor (scope: Construct, id: string, props: MonitoringProps) {
		super(scope, id)

		const {
			vpc,
			securityGroup,
		} = props

		const debugInstanceBucket = new s3.Bucket(this, 'DebugInstanceBucket', {
			bucketName: namespacedBucket(this, 'debug-instance-config'),
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true,
			},
		})

		this.setupCustomResources(debugInstanceBucket, props)

		const debugInstanceRole = new iam.Role(this, 'DebugInstanceRole', {
			roleName: namespaced(this, 'debug-instance'),
			assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
			inlinePolicies: {
				S3Access: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement(
							{
								actions: [
									's3:GetObject',
									's3:ListBucket',
								],
								effect: iam.Effect.ALLOW,
								resources: [
									debugInstanceBucket.bucketArn,
									`${debugInstanceBucket.bucketArn}/*`,
								],
							},
						),
					],
				}),
			},
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
			],
		})

		const volume = ec2.BlockDeviceVolume.ebs(10, {
			encrypted: true,
		})

		const debugInstance = new ec2.Instance(this, 'DebugInstance', {
			blockDevices: [
				{
					deviceName: '/dev/xvda',
					volume,
				},
			],
			instanceName: namespaced(this, 'DebugInstance'),
			instanceType: new ec2.InstanceType('t3.small'),
			machineImage: ec2.MachineImage.latestAmazonLinux(),
			securityGroup,
			vpc,
			vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
			role: debugInstanceRole,
		})

		debugInstance.userData.addCommands(
			// nginx + cert
			'sudo yum install nginx -y',
			'sudo openssl req -new -newkey rsa:4096 -days 365 -x509 -nodes -keyout /etc/nginx/cert.key -out /etc/nginx/cert.crt -subj "/C=SG/ST=SG/L=SG/O=proto/CN=debug-inst"',

			// nodejs + pm2
			'sudo yum install -y gcc-c++ make',
			'curl -sL https://rpm.nodesource.com/setup_14.x | sudo -E bash -',
			'sudo yum install -y nodejs',
			'npm install pm2@latest -g',
			'mkdir -p /home/ec2-user/rediscommander',
			'cd /home/ec2-user/rediscommander && npm install redis-commander',
		)
		debugInstance.userData.addS3DownloadCommand({
			bucket: debugInstanceBucket,
			bucketKey: 'config/nginx.default.conf',
			localFile: '/tmp/nginx.conf',
		})
		debugInstance.userData.addS3DownloadCommand({
			bucket: debugInstanceBucket,
			bucketKey: 'config/rediscommander.pm2.json',
			localFile: '/home/ec2-user/rediscommander/app.json',
		})
		debugInstance.userData.addCommands(
			'sudo mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf',
			'sudo service nginx restart',
			'pm2 start /home/ec2-user/rediscommander/app.json',
		)
	}

	setupCustomResources (debugInstanceBucket: s3.IBucket, props: MonitoringProps): void {
		const customResourcePolicy = cr.AwsCustomResourcePolicy.fromSdkCalls({
			resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
		})

		customResourcePolicy.statements.push(
			new iam.PolicyStatement({
				actions: [
					's3:putObject*',
				],
				effect: iam.Effect.ALLOW,
				resources: [
					debugInstanceBucket.bucketArn,
					`${debugInstanceBucket.bucketArn}/*`,
				],
			}),
		)

		let { esEndpoint, cognitoEndpoint, redisEndpoint } = props
		esEndpoint = esEndpoint.replace('https://', '')
		cognitoEndpoint = cognitoEndpoint.replace('https://', '')
		redisEndpoint = redisEndpoint.replace('https://', '')

		let nginxConfString = fs.readFileSync(path.join(__dirname, './assets/nginx.conf'), { encoding: 'utf-8' })
		nginxConfString = nginxConfString.replace('__ES_ENDPOINT__', esEndpoint)
		nginxConfString = nginxConfString.replace('__INTERNAL_COGNITO_ENDPOINT__', cognitoEndpoint)

		let redisCommanderPm2Config = fs.readFileSync(path.join(__dirname, './assets/pm2.json'), { encoding: 'utf-8' })
		redisCommanderPm2Config = redisCommanderPm2Config.replace('__REDIS_HOST__', redisEndpoint)

		const resourceConfigs = [
			{
				key: 'config/nginx.default.conf',
				body: nginxConfString,
				phId: 'onPLAYDeploymentNginxConf',
			},
			{
				key: 'config/rediscommander.pm2.json',
				body: redisCommanderPm2Config,
				phId: 'onPLAYDeploymentPm2Conf',
			},
		]

		for (const resourceConfig of resourceConfigs) {
			const resourceParams = {
				service: 'S3',
				action: 'putObject',
				parameters: {
					Bucket: debugInstanceBucket.bucketName,
					Key: resourceConfig.key,
					Body: resourceConfig.body,
				},
				physicalResourceId: cr.PhysicalResourceId.of(resourceConfig.phId),
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const cResource = new cr.AwsCustomResource(this, `AwsCustomResource-${resourceConfig.phId}`, {
				onCreate: resourceParams,
				onUpdate: resourceParams,
				policy: customResourcePolicy,
			})
		}
	}
}
