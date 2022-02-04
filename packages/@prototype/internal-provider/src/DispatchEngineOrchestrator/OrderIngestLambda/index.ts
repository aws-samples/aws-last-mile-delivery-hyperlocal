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
import { Duration, aws_kinesis as kinesis, aws_lambda as lambda, aws_iam as iam, aws_stepfunctions as stepfunctions } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { Kinesis } from 'cdk-iam-actions/lib/actions'
import { LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
	readonly GEO_CLUSTERING_MANAGER_ARN: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly orderDataStream: kinesis.IStream
	readonly geoClusteringManager: stepfunctions.StateMachine
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class OrderIngestLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			orderDataStream,
			geoClusteringManager,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'InternalProviderOrderIngestion'),
			description: 'Lambda used by the internal provider to ingest incoming orders.',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/internal-provider-order-ingest.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				GEO_CLUSTERING_MANAGER_ARN: geoClusteringManager.stateMachineArn,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
					actions: [
						Kinesis.DESCRIBE_STREAM,
						'kinesis:DescribeStreamSummary',
						Kinesis.GET_RECORDS,
						Kinesis.GET_SHARD_ITERATOR,
						'kinesis:ListShards',
						Kinesis.LIST_STREAMS,
						'kinesis:SubscribeToShard',
					],
					resources: [orderDataStream.streamArn],
				}),
				new iam.PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [
						geoClusteringManager.stateMachineArn,
					],
					effect: iam.Effect.ALLOW,
				}),
			],
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
