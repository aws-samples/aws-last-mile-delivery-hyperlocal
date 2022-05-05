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
import { Duration, aws_lambda as lambda, aws_dynamodb as ddb, aws_iam as iam } from 'aws-cdk-lib'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { readDDBTablePolicyStatement } from '@prototype/lambda-common'

interface Environment extends DeclaredLambdaEnvironment {
	SAME_DAY_DELIVERY_JOBS_TABLE: string
	SAME_DAY_DELIVERY_HUBS_TABLE: string
	SAME_DAY_SOLVER_JOBS_TABLE: string
	DELIVERY_JOBS_STATUS_INDEX_NAME: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly sameDayDirectPudoDeliveryJobsTable: ddb.ITable
	readonly sameDayDirectPudoHubsTable: ddb.ITable
	readonly sameDayDirectPudoSolverJobsTable: ddb.ITable
	readonly sameDayDirectPudoDeliveryJobsSolverJobIdIndexName: string
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class SameDayDeliveryDispatcherAssignmentQueryLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			sameDayDirectPudoDeliveryJobsTable,
			sameDayDirectPudoSolverJobsTable,
			sameDayDirectPudoHubsTable,
			sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'SameDayDeliveryDispatcherAssignmentManager'),
			description: 'Dispatcher Assignment Query functions for same day delivery',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/same-day-delivery-dispatcher-assignment-query.zip')),
			dependencies: props.dependencies,
			timeout: Duration.minutes(2),
			environment: {
				SAME_DAY_DELIVERY_JOBS_TABLE: sameDayDirectPudoDeliveryJobsTable.tableName,
				SAME_DAY_DELIVERY_HUBS_TABLE: sameDayDirectPudoHubsTable.tableName,
				SAME_DAY_SOLVER_JOBS_TABLE: sameDayDirectPudoSolverJobsTable.tableName,
				DELIVERY_JOBS_STATUS_INDEX_NAME: sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(sameDayDirectPudoDeliveryJobsTable.tableArn),
				readDDBTablePolicyStatement(sameDayDirectPudoSolverJobsTable.tableArn),
				readDDBTablePolicyStatement(sameDayDirectPudoHubsTable.tableArn),
				new iam.PolicyStatement({
					actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PartiQLSelect'],
					effect: iam.Effect.ALLOW,
					resources: [
						`${sameDayDirectPudoDeliveryJobsTable.tableArn}/index/${sameDayDirectPudoDeliveryJobsSolverJobIdIndexName}`,
					],
				}),
			],
		}

		super(scope, id, declaredProps)
	}
}
