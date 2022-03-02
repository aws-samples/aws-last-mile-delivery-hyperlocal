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
import { NestedStack, NestedStackProps, aws_dynamodb as ddb, aws_s3 as s3 } from 'aws-cdk-lib'
import { namespaced, namespacedBucket } from '@aws-play/cdk-core'
import { hyperlocal_ddb, hyperlocal_s3 } from '@prototype/common'

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

	public readonly simulatorConfigBucket: s3.IBucket

	constructor (scope: Construct, id: string, props: SimulatorDataStackProps) {
		super(scope, id)

		this.simulatorConfigBucket = new hyperlocal_s3.Bucket(this, 'SimulatorConfig', {
			bucketName: namespacedBucket(this, 'simulator-config'),
			versioned: true,
		})

		this.simulatorTable = new hyperlocal_ddb.Table(this, 'SimulatorTable', {
			tableName: namespaced(this, 'simulator'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.eventTable = new hyperlocal_ddb.Table(this, 'EventTable', {
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

		this.originTable = new hyperlocal_ddb.Table(this, 'OriginTable', {
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

		this.originStatsTable = new hyperlocal_ddb.Table(this, 'OriginStatsTable', {
			tableName: namespaced(this, 'origin-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.originSimulationsTable = new hyperlocal_ddb.Table(this, 'OriginSimulationsTable', {
			tableName: namespaced(this, 'origin-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationTable = new hyperlocal_ddb.Table(this, 'DestinationTable', {
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

		this.destinationStatsTable = new hyperlocal_ddb.Table(this, 'DestinationStatsTable', {
			tableName: namespaced(this, 'destination-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.destinationSimulationsTable = new hyperlocal_ddb.Table(this, 'DestinationSimulationsTable', {
			tableName: namespaced(this, 'destination-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
	}
}
