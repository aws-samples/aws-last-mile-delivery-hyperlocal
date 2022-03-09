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
import { DatabaseSeeder } from './DatabaseSeeder'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataStoragePersistentProps extends NestedStackProps {
	readonly country: string
}

export class DataStoragePersistent extends NestedStack {
	public readonly driversTelemetryBucket: s3.IBucket

	public readonly dispatchEngineBucket: s3.IBucket

	public readonly geoPolygonTable: ddb.ITable

	public readonly orderTable: ddb.ITable

	public readonly instantDeliveryProviderOrders: ddb.ITable

	public readonly instantDeliveryProviderOrdersStatusIndex: string

	public readonly dispatcherAssignmentsTable: ddb.ITable

	public readonly demographicAreaDispatchSettings: ddb.ITable

	public readonly demographicAreaProviderEngineSettings: ddb.ITable

	public readonly instantDeliveryProviderLocks: ddb.ITable

	constructor (scope: Construct, id: string, props: DataStoragePersistentProps) {
		super(scope, id, props)

		const { country } = props

		this.dispatchEngineBucket = new hyperlocal_s3.Bucket(this, 'DispatchEngineBucket', {
			bucketName: namespacedBucket(this, 'dispatch-engine'),
		})

		this.driversTelemetryBucket = new hyperlocal_s3.Bucket(this, 'DriversTelemetryBucket', {
			bucketName: namespacedBucket(this, 'drivers-telemetry'),
		})

		this.geoPolygonTable = new hyperlocal_ddb.Table(this, 'GeoPolygonTable', {
			tableName: namespaced(this, 'geoPolygon'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.orderTable = new hyperlocal_ddb.Table(this, 'OrderTable', {
			tableName: namespaced(this, 'order'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		const instantDeliveryProviderOrders = new hyperlocal_ddb.Table(this, 'InstantDeliveryProviderOrders', {
			tableName: namespaced(this, 'instant-delivery-provider-orders'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		const instantDeliveryProviderOrdersStatusIndex = 'idx-instant-delivery-provider-orders-status'
		instantDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: instantDeliveryProviderOrdersStatusIndex,
			partitionKey: {
				name: 'status',
				type: ddb.AttributeType.STRING,
			},
			sortKey: {
				name: 'updatedAt',
				type: ddb.AttributeType.NUMBER,
			},
		})

		this.instantDeliveryProviderOrdersStatusIndex = instantDeliveryProviderOrdersStatusIndex
		this.instantDeliveryProviderOrders = instantDeliveryProviderOrders

		this.demographicAreaDispatchSettings = new hyperlocal_ddb.Table(this, 'DemographicAreaDispatchSettings', {
			tableName: namespaced(this, 'demographic-area-dispatch-settings'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.demographicAreaProviderEngineSettings = new hyperlocal_ddb.Table(this, 'DemographicAreaProviderEngineSettings', {
			tableName: namespaced(this, 'demographic-area-provider-engine-settings'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		this.instantDeliveryProviderLocks = new hyperlocal_ddb.Table(this, 'InstantDeliveryProviderLocks', {
			tableName: namespaced(this, 'instant-delivery-provider-locks'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		new DatabaseSeeder(this, 'DatabaseSeeder', {
			demographicAreaProviderEngineSettings: this.demographicAreaProviderEngineSettings,
			demographicAreaDispatcherEngineSettings: this.demographicAreaDispatchSettings,
			geoPolygonTable: this.geoPolygonTable,
			country,
		})

		this.dispatcherAssignmentsTable = new hyperlocal_ddb.Table(this, 'DispatcherAssignments', {
			tableName: namespaced(this, 'dispatcher-assignments'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			sortKey: {
				name: 'createdAt',
				type: ddb.AttributeType.NUMBER,
			},
		})
	}
}
