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
import { aws_dynamodb as ddb, aws_s3 as s3 } from 'aws-cdk-lib'
import { namespaced, namespacedBucket } from '@aws-play/cdk-core'
import { hyperlocal_ddb, hyperlocal_s3 } from '@prototype/common'
import { DataStorage, DataStorageProps } from '../util/DataStorageConstruct'
import { DatabaseSeeder as DemographicAreaDispatcherEngineSeeder } from './seeder/demographic-area-dispatcher-engine'

export class InstantDeliveryDataStorage extends DataStorage<DataStorageProps> {
	public readonly dispatchEngineBucket: s3.IBucket

	public readonly dispatcherAssignmentsTable: ddb.ITable

	public readonly demographicAreaDispatchSettings: ddb.ITable

	public readonly instantDeliveryProviderOrders: ddb.ITable

	public readonly instantDeliveryProviderLocks: ddb.ITable

	public readonly instantDeliveryProviderOrdersStatusIndex: string

	public readonly instantDeliveryProviderOrdersJobIdIndex: string

	constructor (scope: Construct, id: string, props: DataStorageProps) {
		super(scope, id, props)

		const { parameterStoreKeys } = props

		this.dispatchEngineBucket = new hyperlocal_s3.Bucket(this, 'DispatchEngineBucket', {
			bucketName: namespacedBucket(this, 'dispatch-engine'),
		})

		const dispatcherAssignmentsTableName = namespaced(this, 'dispatcher-assignments')
		this.dispatcherAssignmentsTable = new hyperlocal_ddb.Table(this, 'DispatcherAssignments', {
			tableName: dispatcherAssignmentsTableName,
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

		this.addToSsmStringParameters(
			'dispatcher-assignments-param',
			parameterStoreKeys.assignmentsTableName,
			dispatcherAssignmentsTableName,
			'DispatcherAssignments tablename parameter for instant delivery dispatcher',
		)

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

		const instantDeliveryProviderOrdersJobIdIndex = 'idx-instant-delivery-provider-orders-jobid'
		instantDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: instantDeliveryProviderOrdersJobIdIndex,
			partitionKey: {
				name: 'jobid',
				type: ddb.AttributeType.STRING,
			},
		})

		this.instantDeliveryProviderOrdersJobIdIndex = instantDeliveryProviderOrdersJobIdIndex
		this.instantDeliveryProviderOrdersStatusIndex = instantDeliveryProviderOrdersStatusIndex
		this.instantDeliveryProviderOrders = instantDeliveryProviderOrders

		this.instantDeliveryProviderLocks = new hyperlocal_ddb.Table(this, 'InstantDeliveryProviderLocks', {
			tableName: namespaced(this, 'instant-delivery-provider-locks'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		const demographicAreaDispatchSettingsTableName = namespaced(this, 'demographic-area-dispatch-settings')
		this.demographicAreaDispatchSettings = new hyperlocal_ddb.Table(this, 'DemographicAreaDispatchSettings', {
			tableName: demographicAreaDispatchSettingsTableName,
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
		this.addToSsmStringParameters('demographic-area-dispatch-settings-param',
			parameterStoreKeys.demAreaDispatcherSettingsTableName,
			demographicAreaDispatchSettingsTableName,
			'DemAreaDispatchSettings tablename parameter for dispatcher',
		)
	}

	runDbSeed (): void {
		new DemographicAreaDispatcherEngineSeeder(this, 'InstantDeliveryDemographicAreaDispatcherEngineSeeder', {
			demographicAreaDispatcherEngineSettings: this.demographicAreaDispatchSettings,
			country: this.country,
		})
	}
}
