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
import { Duration, aws_ec2 as ec2, aws_lambda as lambda, aws_memorydb as memorydb, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { LambdaInsightsExecutionPolicyStatements, readDDBTablePolicyStatement } from '@prototype/lambda-common'

interface Environment extends DeclaredLambdaEnvironment {
    readonly DDB_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly demographicAreaDispatchSettings: ddb.ITable
	readonly lambdaLayers: lambda.ILayerVersion[]
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class GetDemAreaSettingsLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			vpc,
			lambdaSecurityGroups,
			demographicAreaDispatchSettings,
			lambdaLayers,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'GetDemAreaSettings'),
			description: 'Get Demographic Area Settings',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/get-dem-area-settings.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				DDB_TABLE: demographicAreaDispatchSettings.tableName,

			},
			layers: lambdaLayers,
			initialPolicy: [
				readDDBTablePolicyStatement(demographicAreaDispatchSettings.tableArn),
				...LambdaInsightsExecutionPolicyStatements(),
			],
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)
	}
}
