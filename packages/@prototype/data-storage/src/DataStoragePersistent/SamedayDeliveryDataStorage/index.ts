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
import { aws_dynamodb as ddb } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { hyperlocal_ddb } from '@prototype/common'
import { DataStorage, DataStorageProps } from '../util/DataStorageConstruct'
import { DatabaseSeeder as VehicleCapacitySeeder } from './seeder/vehicle-capacity'

export class SameDayDeliveryDataStorage extends DataStorage<DataStorageProps> {
	public readonly sameDayDeliveryProviderLocks: ddb.ITable

	public readonly sameDayDeliveryProviderOrders: ddb.ITable

	public readonly sameDayDeliveryProviderOrdersStatusIndex: string

	public readonly sameDayDeliveryProviderOrdersStatusPartitionIndex: string

	public readonly sameDayDeliveryProviderOrdersJobIdIndex: string

	public readonly sameDayDeliveryProviderOrdersBatchIdIndex: string

	public readonly sameDayDirectPudoDeliveryJobs: ddb.ITable

	public readonly sameDayDirectPudoDeliveryJobsSolverJobIdIndexName: string

	public readonly sameDayDirectPudoSolverJobs: ddb.ITable

	public readonly sameDayDirectPudoHubs: ddb.ITable

	public readonly sameDayDirectPudoVehicleCapacity: ddb.ITable

	constructor (scope: Construct, id: string, props: DataStorageProps) {
		super(scope, id, props)

		const { parameterStoreKeys } = props

		const sameDayDeliveryProviderOrders = new hyperlocal_ddb.Table(this, 'sameDayDeliveryProviderOrders', {
			tableName: namespaced(this, 'sameday-delivery-provider-orders'),
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		const sameDayDeliveryProviderOrdersStatusIndex = 'idx-sameday-delivery-provider-orders-status'
		sameDayDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: sameDayDeliveryProviderOrdersStatusIndex,
			partitionKey: {
				name: 'status',
				type: ddb.AttributeType.STRING,
			},
			sortKey: {
				name: 'updatedAt',
				type: ddb.AttributeType.NUMBER,
			},
		})

		const sameDayDeliveryProviderOrdersJobIdIndex = 'idx-sameday-delivery-provider-orders-job-id'
		sameDayDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: sameDayDeliveryProviderOrdersJobIdIndex,
			partitionKey: {
				name: 'jobId',
				type: ddb.AttributeType.STRING,
			},
		})

		const sameDayDeliveryProviderOrdersBatchIdIndex = 'idx-sameday-delivery-provider-orders-batch-id'
		sameDayDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: sameDayDeliveryProviderOrdersBatchIdIndex,
			partitionKey: {
				name: 'batchId',
				type: ddb.AttributeType.STRING,
			},
		})

		const sameDayDeliveryProviderOrdersStatusPartitionIndex = 'idx-sameday-delivery-provider-orders-status-partition'
		sameDayDeliveryProviderOrders.addGlobalSecondaryIndex({
			indexName: sameDayDeliveryProviderOrdersStatusPartitionIndex,
			partitionKey: {
				name: 'status',
				type: ddb.AttributeType.STRING,
			},
		})

		this.sameDayDeliveryProviderOrdersJobIdIndex = sameDayDeliveryProviderOrdersJobIdIndex
		this.sameDayDeliveryProviderOrdersStatusIndex = sameDayDeliveryProviderOrdersStatusIndex
		this.sameDayDeliveryProviderOrdersBatchIdIndex = sameDayDeliveryProviderOrdersBatchIdIndex
		this.sameDayDeliveryProviderOrdersStatusPartitionIndex = sameDayDeliveryProviderOrdersStatusPartitionIndex
		this.sameDayDeliveryProviderOrders = sameDayDeliveryProviderOrders

		this.sameDayDeliveryProviderLocks = new hyperlocal_ddb.Table(this, 'SameDayDeliveryProviderLocks', {
			tableName: namespaced(this, 'sameday-delivery-provider-locks'),
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})

		// ---------------- same day delivery related resources -------------------------------------------------------
		// ------------------------------------------------------------------------------------------------------------
		const sameDayDirectPudoDeliveryJobsTableName = namespaced(this, 'sameday-directpudo-delivery-jobs')
		const sameDayDirectPudoDeliveryJobs = new hyperlocal_ddb.Table(this, 'sameDayDirectPudoDeliveryJobs', {
			tableName: sameDayDirectPudoDeliveryJobsTableName,
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
		const sameDayDirectPudoDeliveryJobsSolverJobIdIndexName = namespaced(this, 'idx-sameday-directpudo-delivery-jobs-solverjobid')
		sameDayDirectPudoDeliveryJobs.addGlobalSecondaryIndex({
			indexName: sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
			partitionKey: {
				name: 'solverJobId',
				type: ddb.AttributeType.STRING,
			},
		})

		this.addToSsmStringParameters('sameday-directpudo-delivery-jobs-solverjobid-param',
			parameterStoreKeys.sameDayDirectPudoDeliveryJobsSolverJobIdIndex,
			sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
			'sameDayDirectPudo DeliveryJobs solverJobId index parameter for dispatcher',
		)
		this.sameDayDirectPudoDeliveryJobsSolverJobIdIndexName = sameDayDirectPudoDeliveryJobsSolverJobIdIndexName

		this.sameDayDirectPudoDeliveryJobs = sameDayDirectPudoDeliveryJobs
		this.addToSsmStringParameters('sameday-directpudo-delivery-jobs-param',
			parameterStoreKeys.sameDayDirectPudoDeliveryJobsTableName,
			sameDayDirectPudoDeliveryJobsTableName,
			'sameDayDirectPudoDeliveryJobs tablename parameter for dispatcher',
		)

		const sameDayDirectPudoSolverJobsTableName = namespaced(this, 'sameday-directpudo-solver-jobs')
		const sameDayDirectPudoSolverJobsTable = new hyperlocal_ddb.Table(this, 'SameDayDirectPudoSolverJobs', {
			tableName: sameDayDirectPudoSolverJobsTableName,
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
		this.sameDayDirectPudoSolverJobs = sameDayDirectPudoSolverJobsTable
		this.addToSsmStringParameters('sameday-directpudo-solver-jobs-param',
			parameterStoreKeys.sameDayDirectPudoSolverJobsTableName,
			sameDayDirectPudoSolverJobsTableName,
			'sameDayDirectPudoSolverJobs tablename parameter for dispatcher',
		)

		const sameDayDirectPudoHubsTableName = namespaced(this, 'sameday-directpudo-hubs')
		const sameDayDirectPudoHubsTable = new hyperlocal_ddb.Table(this, 'SameDayDirectPudoHubs', {
			tableName: sameDayDirectPudoHubsTableName,
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
		this.sameDayDirectPudoHubs = sameDayDirectPudoHubsTable
		this.addToSsmStringParameters('sameday-directpudo-hubs-param',
			parameterStoreKeys.sameDayDirectPudoHubsTableName,
			sameDayDirectPudoHubsTableName,
			'sameDayDirectPudoHubsTableName tablename parameter for dispatcher',
		)

		const sameDayDirectPudoVehicleCapacityTableName = namespaced(this, 'sameday-directpudo-vehicle-capacity')
		const sameDayDirectPudoVehicleCapacityTable = new hyperlocal_ddb.Table(this, 'SameDayDirectPudoVehicleCapacity', {
			tableName: sameDayDirectPudoVehicleCapacityTableName,
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
		this.sameDayDirectPudoVehicleCapacity = sameDayDirectPudoVehicleCapacityTable
		this.addToSsmStringParameters('sameday-directpudo-vehicle-capacity-param',
			parameterStoreKeys.sameDayDirectPudoVehicleCapacityTableName,
			sameDayDirectPudoVehicleCapacityTableName,
			'sameDayDirectPudoVehicleCapacityTableName tablename parameter for dispatcher',
		)
	}

	runDbSeed (): void {
		new VehicleCapacitySeeder(this, 'SameDayDirectPudoVehicleCapacitySeeder', {
			sameDayDirectPudoVehicleCapacity: this.sameDayDirectPudoVehicleCapacity,
		})
	}
}
