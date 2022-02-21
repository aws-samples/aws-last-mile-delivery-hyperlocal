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

type SimulatorDataStackProps = NestedStackProps

export class SimulatorDataStack extends NestedStack {
	public readonly simulatorTable: ddb.Table

	public readonly originTable: ddb.Table

	public readonly originAreaIndex: string

	public readonly originExecutionIdIndex: string

	public readonly originStatsTable: ddb.Table

	public readonly originSimulationsTable: ddb.Table

	public readonly eventTable: ddb.Table

	public readonly eventCreatedAtIndex: string

	public readonly destinationTable: ddb.Table

	public readonly destinationAreaIndex: string

	public readonly destinationExecutionIdIndex: string

	public readonly destinationStatsTable: ddb.Table

	public readonly destinationSimulationsTable: ddb.Table

	constructor (scope: Construct, id: string, props: SimulatorDataStackProps) {
		super(scope, id)

		this.simulatorTable = new HyperlocalTable(this, 'SimulatorTable', {
			tableName: namespaced(this, 'simulator'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.eventTable = new HyperlocalTable(this, 'EventTable', {
			tableName: namespaced(this, 'event'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'id',
				type: ddb.AttributeType.STRING,
			},
			timeToLiveAttribute: 'ttl',
		})

		this.eventCreatedAtIndex = namespaced(this, 'idx-event-createdAt')
		this.eventTable.addGlobalSecondaryIndex({
			indexName: this.eventCreatedAtIndex,
			partitionKey: {
				name: 'region',
				type: ddb.AttributeType.STRING,
			},
			sortKey: {
				name: 'createdAt',
				type: ddb.AttributeType.NUMBER,
			},
		})

		this.originTable = new HyperlocalTable(this, 'OriginTable', {
			tableName: namespaced(this, 'origin'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.originAreaIndex = namespaced(this, 'idx-origin-area')
		this.originTable.addGlobalSecondaryIndex({
			indexName: this.originAreaIndex,
			partitionKey: {
				name: 'area',
				type: ddb.AttributeType.STRING,
			},
		})

		this.originExecutionIdIndex = namespaced(this, 'idx-origin-executionId')
		this.originTable.addGlobalSecondaryIndex({
			indexName: this.originExecutionIdIndex,
			partitionKey: {
				name: 'executionId',
				type: ddb.AttributeType.STRING,
			},
		})

		this.originStatsTable = new HyperlocalTable(this, 'OriginStatsTable', {
			tableName: namespaced(this, 'origin-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.originSimulationsTable = new HyperlocalTable(this, 'OriginSimulationsTable', {
			tableName: namespaced(this, 'origin-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationTable = new HyperlocalTable(this, 'DestinationTable', {
			tableName: namespaced(this, 'destination'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationAreaIndex = namespaced(this, 'idx-destination-area')
		this.destinationTable.addGlobalSecondaryIndex({
			indexName: this.destinationAreaIndex,
			partitionKey: {
				name: 'area',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationExecutionIdIndex = namespaced(this, 'idx-destination-executionId')
		this.destinationTable.addGlobalSecondaryIndex({
			indexName: this.destinationExecutionIdIndex,
			partitionKey: {
				name: 'executionId',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationStatsTable = new HyperlocalTable(this, 'DestinationStatsTable', {
			tableName: namespaced(this, 'destination-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationSimulationsTable = new HyperlocalTable(this, 'DestinationSimulationsTable', {
			tableName: namespaced(this, 'destination-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
	}
}
