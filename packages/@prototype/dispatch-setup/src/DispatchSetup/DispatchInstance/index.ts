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
import { aws_ec2 as ec2, aws_iam as iam, aws_dynamodb as ddb, aws_s3 as s3, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib'
import * as cdkconsts from 'cdk-constants'
import { namespaced, regionalNamespaced } from '@aws-play/cdk-core'
import { readDDBTablePolicyStatement, updateDDBTablePolicyStatement } from '@prototype/lambda-common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DispatchInstanceProps {
    readonly vpc: ec2.IVpc
    readonly dmzSecurityGroup: ec2.ISecurityGroup
    readonly driverApiKeySecretName: string
    readonly dispatchEngineBucket: s3.IBucket
	readonly demAreaDispatchEngineSettingsTable: ddb.ITable
	readonly dispatcherAssignmentsTable: ddb.ITable
}

export class DispatchInstance extends Construct {
    readonly instanceRole: iam.IRole

	readonly instance: ec2.IInstance

	constructor (scope: Construct, id: string, props: DispatchInstanceProps) {
		super(scope, id)

		const {
			vpc,
			dmzSecurityGroup,
			driverApiKeySecretName,
			dispatchEngineBucket,
			demAreaDispatchEngineSettingsTable,
			dispatcherAssignmentsTable,
		} = props

		const driverApiKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'DriverApiKeySecret', driverApiKeySecretName)

		// instance IAM role
		const instanceRole = new iam.Role(this, 'DispatchInstanceRole', {
			assumedBy: new iam.ServicePrincipal(cdkconsts.ServicePrincipals.EC2),
			description: 'Instance Role for Dispatcher instance',
			inlinePolicies: {
				apiKeyAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								'secretsmanager:GetSecretValue',
							],
							resources: [`${driverApiKeySecret.secretArn}*`],
						}),
					],
				}),
				bucketAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							effect: iam.Effect.ALLOW,
							actions: [
								's3:GetObject',
								's3:HeadObject',
								's3:ListBucket',
								's3:PutObject',
							],
							resources: [
								dispatchEngineBucket.bucketArn,
								`${dispatchEngineBucket.bucketArn}/*`,
							],
						}),
					],
				}),
				ddbAccess: new iam.PolicyDocument({
					statements: [
						readDDBTablePolicyStatement(demAreaDispatchEngineSettingsTable.tableArn),
						readDDBTablePolicyStatement(dispatcherAssignmentsTable.tableArn),
						updateDDBTablePolicyStatement(dispatcherAssignmentsTable.tableArn),
					],
				}),
			},
			roleName: regionalNamespaced(this, 'Dispatch-Instance'),
		})

		this.instanceRole = instanceRole

		// create instance
		const dispatchInstance = new ec2.Instance(this, 'DispatchInstance', {
			machineImage: ec2.MachineImage.latestAmazonLinux({
				cpuType: ec2.AmazonLinuxCpuType.ARM_64,
				edition: ec2.AmazonLinuxEdition.STANDARD,
				generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
				storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
			}),
			instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6G, ec2.InstanceSize.XLARGE2),
			vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
			securityGroup: dmzSecurityGroup,

			blockDevices: [{
				deviceName: '/dev/xvda',
				volume: ec2.BlockDeviceVolume.ebs(64, {
					encrypted: true,
				}),
			}],
			instanceName: namespaced(this, 'DispatchInstance'),
			role: instanceRole,
		})

		// setup initial installation
		dispatchInstance.userData.addCommands(
			'sudo yum -y update',
			// amazon corretto 16 (java)
			'sudo rpm --import https://yum.corretto.aws/corretto.key',
			'sudo curl -L -o /etc/yum.repos.d/corretto.repo https://yum.corretto.aws/corretto.repo',
			'sudo yum install -y java-11-amazon-corretto-devel maven htop',
			// 'sudo update-alternatives --set java java-11-openjdk.x86_64',
			"JAVA_PATH=$(java -XshowSettings:properties -version 2>&1 > /dev/null | grep 'java.home' | awk '{print $3}')",
			// eslint-disable-next-line
			'echo "export JAVA_HOME=\\"${JAVA_PATH}\\"" >> /home/ec2-user/.bashrc',
			"echo 'PATH=$JAVA_HOME/bin:$PATH' >> /home/ec2-user/.bashrc",
			'mkdir -p /home/ec2-user/proto',
			`aws s3 cp 's3://${dispatchEngineBucket.bucketName}/dispatcher-app' '/home/ec2-user/proto' --recursive`,
			'cd /home/ec2-user/proto',
			'java -jar dispatcher-runner.jar',
		)

		this.instance = dispatchInstance
	}
}
