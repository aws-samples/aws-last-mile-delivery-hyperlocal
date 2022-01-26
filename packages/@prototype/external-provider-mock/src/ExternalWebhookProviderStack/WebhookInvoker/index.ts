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
import * as cdk from '@aws-cdk/core'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as events from '@aws-cdk/aws-events'
import * as targets from '@aws-cdk/aws-events-targets'
import * as lambda from '@aws-cdk/aws-lambda'
import * as secrets from '@aws-cdk/aws-secretsmanager'
import * as iam from '@aws-cdk/aws-iam'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

interface ExternalWebhookInvokerStackProps {
  readonly exampleWebhookApiSecretName: string
	readonly externalOrderFinalisedIndex: string
  readonly externalOrderTable: ddb.ITable
}

export class ExternalWebhookInvokerStack extends cdk.Construct {
	constructor (scope: cdk.Construct, id: string, props: ExternalWebhookInvokerStackProps) {
		super(scope, id)

		const {
			externalOrderTable,
			exampleWebhookApiSecretName,
			externalOrderFinalisedIndex,
		} = props

		const exampleWebhookProviderSecret = secrets.Secret.fromSecretNameV2(scope, 'InternalWebhookSecret', exampleWebhookApiSecretName)

		const webhookInvoker = new lambda.Function(this, 'ExternalWebhookInvoker', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(this, 'WebhookInvoker'),
			description: 'External Webhook Invoker the internal webhook endpoint to update the system on the order status',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/external-webhook-invoker.zip')),
			handler: 'index.handler',
			timeout: cdk.Duration.minutes(1),
			environment: {
				EXAMPLE_WEBHOOK_SECRET: exampleWebhookApiSecretName,
				EXTERNAL_ORDER_TABLE: externalOrderTable.tableName,
				EXTERNAL_ORDER_FINALISED_INDEX: externalOrderFinalisedIndex,
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						'secretsmanager:GetSecretValue',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						`${exampleWebhookProviderSecret.secretArn}*`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:Query',
						'dynamodb:GetItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						externalOrderTable.tableArn,
						`${props.externalOrderTable.tableArn}/index/${props.externalOrderFinalisedIndex}`,
					],
				}),
				new iam.PolicyStatement({
					actions: [
						'dynamodb:UpdateItem',
					],
					effect: iam.Effect.ALLOW,
					resources: [
						externalOrderTable.tableArn,
					],
				}),
			],
		})

		new events.Rule(this, 'ExternalWebhookInvokerRule', {
			description: 'Invoke webhook from the external provider to update the status',
			ruleName: namespaced(this, 'ExternalWebhookInvokerRule'),
			targets: [new targets.LambdaFunction(webhookInvoker)],
			schedule: events.Schedule.cron({ minute: '*/1' }),
		})
	}
}
