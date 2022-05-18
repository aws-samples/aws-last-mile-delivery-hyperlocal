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
import { Duration, aws_dynamodb as ddb, aws_events as events, aws_events_targets as events_targets, aws_lambda as lambda, aws_secretsmanager as secretsmanager, aws_iam as iam } from 'aws-cdk-lib'
import { DeclaredLambdaFunction } from '@aws-play/cdk-lambda'
import { namespaced } from '@aws-play/cdk-core'

interface ExternalWebhookInvokerStackProps {
	readonly exampleWebhookApiSecretName: string
	readonly externalOrderFinalisedIndex: string
	readonly externalOrderTable: ddb.ITable
}

export class ExternalWebhookInvokerStack extends Construct {
	constructor (scope: Construct, id: string, props: ExternalWebhookInvokerStackProps) {
		super(scope, id)

		const {
			externalOrderTable,
			exampleWebhookApiSecretName,
			externalOrderFinalisedIndex,
		} = props

		const exampleWebhookProviderSecret = secretsmanager.Secret.fromSecretNameV2(scope, 'ExternalWebhookSecret', exampleWebhookApiSecretName)

		const webhookInvoker = new lambda.Function(this, 'ExternalWebhookInvoker', {
			functionName: namespaced(this, 'WebhookInvoker'),
			description: 'External Webhook Invoker the internal webhook endpoint to update the system on the order status',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/external-webhook-invoker.zip')),
			handler: 'index.handler',
			runtime: lambda.Runtime.NODEJS_16_X,
			architecture: lambda.Architecture.ARM_64,
			timeout: Duration.minutes(1),
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
			targets: [new events_targets.LambdaFunction(webhookInvoker)],
			schedule: events.Schedule.cron({ minute: '*/1' }),
		})
	}
}
