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
import { Duration, aws_lambda as lambda, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'
import { readDDBTablePolicyStatement } from '@prototype/lambda-common'

interface Environment extends DeclaredLambdaEnvironment {
	ASSIGNMENTS_TABLE: string
	ORDER_TABLE: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly dispatcherAssignmentsTable: ddb.ITable
	readonly instantDeliveryProviderOrdersTable: ddb.ITable
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DispatcherAssignmentQueryLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			dispatcherAssignmentsTable,
			instantDeliveryProviderOrdersTable,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DispatcherAssignmentManager'),
			description: 'Dispatcher Assignment Query functions',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/dispatcher-assignment-query.zip')),
			dependencies: props.dependencies,
			timeout: Duration.minutes(2),
			environment: {
				ASSIGNMENTS_TABLE: dispatcherAssignmentsTable.tableName,
				ORDER_TABLE: instantDeliveryProviderOrdersTable.tableName,
			},
			initialPolicy: [
				readDDBTablePolicyStatement(dispatcherAssignmentsTable.tableArn),
				readDDBTablePolicyStatement(instantDeliveryProviderOrdersTable.tableArn),
			],
		}

		super(scope, id, declaredProps)
	}
}
