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
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { namespaced, namespacedBucket } from '@aws-play/cdk-core'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as s3 from '@aws-cdk/aws-s3'
import { DatabaseSeeder } from './DatabaseSeeder'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataStoragePersistentProps extends NestedStackProps {
	//
}

export class DataStoragePersistent extends NestedStack {
	public readonly driversTelemetryBucket: s3.IBucket

	public readonly dispatchEngineBucket: s3.IBucket

	public readonly geoPolygonTable: ddb.ITable

	public readonly orderTable: ddb.ITable

	public readonly internalProviderOrders: ddb.ITable

	public readonly internalProviderOrdersStatusIndex: string

	public readonly dispatcherAssignmentsTable: ddb.ITable

	public readonly demographicAreaDispatchSettings: ddb.ITable

	public readonly demographicAreaProviderEngineSettings: ddb.ITable

	public readonly internalProviderLocks: ddb.ITable

	constructor (scope: Construct, id: string, props: DataStoragePersistentProps) {
		super(scope, id, props)

		this.dispatchEngineBucket = new s3.Bucket(this, 'DispatchEngineBucket', {
			bucketName: namespacedBucket(this, 'dispatch-engine'),
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true,
			},
		})

		this.driversTelemetryBucket = new s3.Bucket(this, 'DriversTelemetryBucket', {
			bucketName: namespacedBucket(this, 'drivers-telemetry'),
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: {
				blockPublicAcls: true,
				blockPublicPolicy: true,
				ignorePublicAcls: true,
				restrictPublicBuckets: true,
			},
		})

		this.geoPolygonTable = new ddb.Table(this, 'GeoPolygonTable', {
			tableName: namespaced(this, 'geoPolygon'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			readCapacity: 5,
			writeCapacity: 5,
			serverSideEncryption: true,
		})

		this.orderTable = new ddb.Table(this, 'OrderTable', {
			tableName: namespaced(this, 'order'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		const internalProviderOrders = new ddb.Table(this, 'InternalProviderOrders', {
			tableName: namespaced(this, 'internal-provider-orders'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		const internalProviderOrdersStatusIndex = 'idx-internal-provider-orders-status'
		internalProviderOrders.addGlobalSecondaryIndex({
			indexName: internalProviderOrdersStatusIndex,
			partitionKey: {
				name: 'status',
				type: ddb.AttributeType.STRING,
			},
			sortKey: {
				name: 'updatedAt',
				type: ddb.AttributeType.NUMBER,
			},
		})

		this.internalProviderOrdersStatusIndex = internalProviderOrdersStatusIndex
		this.internalProviderOrders = internalProviderOrders

		this.demographicAreaDispatchSettings = new ddb.Table(this, 'DemographicAreaDispatchSettings', {
			tableName: namespaced(this, 'demographic-area-dispatch-settings'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.demographicAreaProviderEngineSettings = new ddb.Table(this, 'DemographicAreaProviderEngineSettings', {
			tableName: namespaced(this, 'demographic-area-provider-engine-settings'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		this.internalProviderLocks = new ddb.Table(this, 'InternalProviderLocks', {
			tableName: namespaced(this, 'internal-provider-locks'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})

		new DatabaseSeeder(this, 'DatabaseSeeder', {
			demographicAreaProviderEngineSettings: this.demographicAreaProviderEngineSettings,
			demographicAreaDispatcherEngineSettings: this.demographicAreaDispatchSettings,
			geoPolygonTable: this.geoPolygonTable,
		})

		this.dispatcherAssignmentsTable = new ddb.Table(this, 'DispatcherAssignments', {
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
			billingMode: ddb.BillingMode.PAY_PER_REQUEST,
			serverSideEncryption: true,
		})
	}
}
