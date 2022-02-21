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
import { NestedStack, NestedStackProps, aws_dynamodb as ddb } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { HyperlocalTable } from '@prototype/common'

type ExternalWebhookDataStackProps = NestedStackProps

export class ExternalWebhookDataStack extends NestedStack {
	public readonly externalOrderTable: ddb.Table

	public readonly externalOrderFinalisedIndex: string

	constructor (scope: Construct, id: string, props: ExternalWebhookDataStackProps) {
		super(scope, id)

		this.externalOrderTable = new HyperlocalTable(this, 'ExampleWebhookOrders', {
			tableName: namespaced(this, 'example-webhook-orders'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.externalOrderFinalisedIndex = namespaced(this, 'idx-order-finalised')
		this.externalOrderTable.addGlobalSecondaryIndex({
			indexName: this.externalOrderFinalisedIndex,
			partitionKey: {
				name: 'finalised',
				type: ddb.AttributeType.NUMBER,
			},
		})
	}
}
