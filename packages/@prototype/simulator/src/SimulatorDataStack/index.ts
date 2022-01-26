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
import { namespaced } from '@aws-play/cdk-core'

type SimulatorDataStackProps = cdk.NestedStackProps

export class SimulatorDataStack extends cdk.NestedStack {
	public readonly simulatorTable: ddb.Table

	public readonly restaurantTable: ddb.Table

	public readonly restaurantAreaIndex: string

	public readonly restaurantExecutionIdIndex: string

	public readonly restaurantStatsTable: ddb.Table

	public readonly restaurantSimulationsTable: ddb.Table

	public readonly eventTable: ddb.Table

	public readonly eventCreatedAtIndex: string

	public readonly customerTable: ddb.Table

	public readonly customerAreaIndex: string

	public readonly customerExecutionIdIndex: string

	public readonly customerStatsTable: ddb.Table

	public readonly customerSimulationsTable: ddb.Table

	constructor (scope: cdk.Construct, id: string, props: SimulatorDataStackProps) {
		super(scope, id)

		this.simulatorTable = new ddb.Table(this, 'SimulatorTable', {
			tableName: namespaced(this, 'simulator'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.eventTable = new ddb.Table(this, 'EventTable', {
			tableName: namespaced(this, 'event'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'id',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
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

		this.restaurantTable = new ddb.Table(this, 'RestaurantTable', {
			tableName: namespaced(this, 'restaurant'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.restaurantAreaIndex = namespaced(this, 'idx-restaurant-area')
		this.restaurantTable.addGlobalSecondaryIndex({
			indexName: this.restaurantAreaIndex,
			partitionKey: {
				name: 'area',
				type: ddb.AttributeType.STRING,
			},
		})

		this.restaurantExecutionIdIndex = namespaced(this, 'idx-restaurant-executionId')
		this.restaurantTable.addGlobalSecondaryIndex({
			indexName: this.restaurantExecutionIdIndex,
			partitionKey: {
				name: 'executionId',
				type: ddb.AttributeType.STRING,
			},
		})

		this.restaurantStatsTable = new ddb.Table(this, 'RestaurantStatsTable', {
			tableName: namespaced(this, 'restaurant-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.restaurantSimulationsTable = new ddb.Table(this, 'RestaurantSimulationsTable', {
			tableName: namespaced(this, 'restaurant-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.customerTable = new ddb.Table(this, 'CustomerTable', {
			tableName: namespaced(this, 'customer'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.customerAreaIndex = namespaced(this, 'idx-customer-area')
		this.customerTable.addGlobalSecondaryIndex({
			indexName: this.customerAreaIndex,
			partitionKey: {
				name: 'area',
				type: ddb.AttributeType.STRING,
			},
		})

		this.customerExecutionIdIndex = namespaced(this, 'idx-customer-executionId')
		this.customerTable.addGlobalSecondaryIndex({
			indexName: this.customerExecutionIdIndex,
			partitionKey: {
				name: 'executionId',
				type: ddb.AttributeType.STRING,
			},
		})

		this.customerStatsTable = new ddb.Table(this, 'CustomerStatsTable', {
			tableName: namespaced(this, 'customer-stats'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.customerSimulationsTable = new ddb.Table(this, 'CustomerSimulationsTable', {
			tableName: namespaced(this, 'customer-simulations'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})
	}
}
