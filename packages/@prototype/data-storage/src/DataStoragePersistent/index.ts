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
import { NestedStack, NestedStackProps, aws_dynamodb as ddb, aws_s3 as s3, aws_ssm as ssm } from 'aws-cdk-lib'
import { namespaced, namespacedBucket } from '@aws-play/cdk-core'
import { hyperlocal_ddb, hyperlocal_s3 } from '@prototype/common'
import { DatabaseSeeder } from './DatabaseSeeder'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataStoragePersistentProps extends NestedStackProps {
	readonly parameterStoreKeys: Record<string, string>
	readonly country: string
}

export class DataStoragePersistent extends NestedStack {
	public readonly driversTelemetryBucket: s3.IBucket

	public readonly dispatchEngineBucket: s3.IBucket

	public readonly geoPolygonTable: ddb.ITable

	public readonly orderTable: ddb.ITable

	public readonly instantDeliveryProviderOrders: ddb.ITable

	public readonly instantDeliveryProviderLocks: ddb.ITable

	public readonly instantDeliveryProviderOrdersStatusIndex: string

	public readonly instantDeliveryProviderOrdersJobIdIndex: string

	public readonly dispatcherAssignmentsTable: ddb.ITable

	public readonly demographicAreaDispatchSettings: ddb.ITable

	public readonly demographicAreaProviderEngineSettings: ddb.ITable

	public readonly sameDayDirectPudoDeliveryJobs: ddb.ITable

	public readonly sameDayDirectPudoSolverJobs: ddb.ITable

	public readonly ssmStringParameters: Record<string, ssm.IStringParameter>

	constructor (scope: Construct, id: string, props: DataStoragePersistentProps) {
		super(scope, id, props)

		const { country, parameterStoreKeys } = props

		this.ssmStringParameters = {}

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

		const demographicAreaDispatchSettingsTableName = namespaced(this, 'demographic-area-dispatch-settings')
		this.demographicAreaDispatchSettings = new hyperlocal_ddb.Table(this, 'DemographicAreaDispatchSettings', {
			tableName: demographicAreaDispatchSettingsTableName,
			removalPolicy: props.removalPolicy,
			partitionKey: {
				name: 'ID',
				type: ddb.AttributeType.STRING,
			},
		})
		const demographicAreaDispatchSettingsTableNameParameter = new ssm.StringParameter(this, 'demographic-area-dispatch-settings-param', {
			parameterName: parameterStoreKeys.demAreaDispatcherSettingsTableName,
			stringValue: demographicAreaDispatchSettingsTableName,
			description: 'DemAreaDispatchSettings tablename parameter for dispatcher',
		})
		this.ssmStringParameters[parameterStoreKeys.demAreaDispatcherSettingsTableName] =
			demographicAreaDispatchSettingsTableNameParameter

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
		const dispatcherAssignmentsTableNameParameter = new ssm.StringParameter(this, 'dispatcher-assignments-param', {
			parameterName: parameterStoreKeys.assignmentsTableName,
			stringValue: dispatcherAssignmentsTableName,
			description: 'DispatcherAssignments tablename parameter for dispatcher',
		})
		this.ssmStringParameters[parameterStoreKeys.assignmentsTableName] = dispatcherAssignmentsTableNameParameter

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
		const sameDayDirectPudoDeliveryJobsSolverJobIdIndexParameter = new ssm.StringParameter(this, 'sameday-directpudo-delivery-jobs-solverjobid-param', {
			parameterName: parameterStoreKeys.sameDayDirectPudoDeliveryJobsSolverJobIdIndex,
			stringValue: sameDayDirectPudoDeliveryJobsSolverJobIdIndexName,
			description: 'sameDayDirectPudo DeliveryJobs solverJobId index parameter for dispatcher',
		})
		this.ssmStringParameters[parameterStoreKeys.sameDayDirectPudoDeliveryJobsSolverJobIdIndex] =
			sameDayDirectPudoDeliveryJobsSolverJobIdIndexParameter

		this.sameDayDirectPudoDeliveryJobs = sameDayDirectPudoDeliveryJobs
		const sameDayDirectPudoDeliveryJobsTableNameParameter = new ssm.StringParameter(this, 'sameday-directpudo-delivery-jobs-param', {
			parameterName: parameterStoreKeys.sameDayDirectPudoDeliveryJobsTableName,
			stringValue: sameDayDirectPudoDeliveryJobsTableName,
			description: 'sameDayDirectPudoDeliveryJobs tablename parameter for dispatcher',
		})
		this.ssmStringParameters[parameterStoreKeys.sameDayDirectPudoDeliveryJobsTableName] =
			sameDayDirectPudoDeliveryJobsTableNameParameter

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
		const sameDayDirectPudoSolverJobsTableNameParameter = new ssm.StringParameter(this, 'sameday-directpudo-solver-jobs-param', {
			parameterName: parameterStoreKeys.sameDayDirectPudoSolverJobsTableName,
			stringValue: sameDayDirectPudoSolverJobsTableName,
			description: 'sameDayDirectPudoSolverJobs tablename parameter for dispatcher',
		})
		this.ssmStringParameters[parameterStoreKeys.sameDayDirectPudoSolverJobsTableName] =
			sameDayDirectPudoSolverJobsTableNameParameter
	}
}
