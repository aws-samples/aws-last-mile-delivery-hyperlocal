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
import { aws_dynamodb as ddb, custom_resources } from 'aws-cdk-lib'
import * as utils from '@aws-sdk/util-dynamodb'
import { DEMOGRAPHIC_AREA, STATIC_AREAS_POLYGON } from '@prototype/common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatabaseSeederProps {
	readonly demographicAreaProviderEngineSettings: ddb.ITable
	readonly demographicAreaDispatcherEngineSettings: ddb.ITable
	readonly geoPolygonTable: ddb.ITable
}

export class DatabaseSeeder extends Construct {
	constructor (scope: Construct, id: string, props: DatabaseSeederProps) {
		super(scope, id)

		const {
			demographicAreaProviderEngineSettings,
			demographicAreaDispatcherEngineSettings,
			geoPolygonTable,
		} = props

		const commonRules = [
			{
				name: 'PollingProvider',
				conditions: {
					any: [
						{
							fact: 'get-percentage',
							operator: 'lessThanInclusive',
							value: 20,
							priority: 10,
						},
						{
							all: [
								{
									fact: 'get-date',
									operator: 'includes',
									value: '12-25',
									priority: 20,
								},
								{
									fact: 'get-percentage',
									operator: 'lessThanInclusive',
									value: 30,
									priority: 20,
								},
							],
						},
						{
							fact: 'restaurant',
							value: ['bfd5d6fe-0fb2-4b7f-bea8-80ceea92c50e'],
							operator: 'in',
							path: '$.id',
							priority: 100,
						},
					],
				},
				event: {
					type: 'polling-provider-triggered',
					params: {
						provider: 'ExamplePollingProvider',
					},
				},
				priority: 10,
			},
			{
				name: 'WebhookProvider',
				conditions: {
					any: [{
						all: [
							{
								fact: 'get-percentage',
								operator: 'greaterThan',
								value: 20,
								priority: 10,
							},
							{
								fact: 'get-percentage',
								operator: 'lessThanInclusive',
								value: 50,
								priority: 10,
							},
						],
					},
					{
						all: [
							{
								fact: 'get-date',
								operator: 'includes',
								value: '12-25',
								priority: 20,
							},
							{
								fact: 'get-percentage',
								operator: 'greaterThan',
								value: 30,
								priority: 20,
							},
							{
								fact: 'get-percentage',
								operator: 'lessThanInclusive',
								value: 55,
								priority: 20,
							},
						],
					},
					],
				},
				event: {
					type: 'webhook-provider-triggered',
					params: {
						provider: 'ExampleWebhookProvider',
					},
				},
				priority: 20,
			},
			{
				name: 'InternalProvider',
				conditions: {
					any: [
						{
							all: [
								{
									fact: 'get-percentage',
									operator: 'greaterThan',
									value: 50,
									priority: 10,
								},
								{
									fact: 'get-percentage',
									operator: 'lessThanInclusive',
									value: 100,
									priority: 10,
								},
							],
						},
						{
							all: [
								{
									fact: 'get-date',
									operator: 'includes',
									value: '12-25',
									priority: 20,
								},
								{
									fact: 'get-percentage',
									operator: 'greaterThan',
									value: 55,
									priority: 10,
								},
								{
									fact: 'get-percentage',
									operator: 'lessThanInclusive',
									value: 100,
									priority: 20,
								},
							],
						},
					],
				},
				event: {
					type: 'internal-provider-triggered',
					params: {
						provider: 'InternalWebhookProvider',
					},
				},
				priority: 20,
			},
		]

		new custom_resources.AwsCustomResource(this, 'SeedDBDemographicAreaProviderEngineSettings', {
			onCreate: {
				service: 'DynamoDB',
				action: 'batchWriteItem',
				parameters: {
					RequestItems: {
						[demographicAreaProviderEngineSettings.tableName]: [
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.CENTRAL_JAKARTA,
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.NORTH_JAKARTA,
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.SOUTH_JAKARTA,
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.WEST_JAKARTA,
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.EAST_JAKARTA,
										rules: commonRules,
									}),
								},
							},
						],
					},
				},
				physicalResourceId: custom_resources.PhysicalResourceId.of('onDemographicAreaDBSeed'),
			},
			policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
				resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})

		const dispatcherCommonSettings = {
			olderOrdersCannotBeAssignedAfterFresher: true,
			preferCloserDriverToPickupLocation: true,
			preferOccupiedDrivers: true,
		}

		new custom_resources.AwsCustomResource(this, 'SeedDBdemographicAreaDispatcherEngineSettings', {
			onCreate: {
				service: 'DynamoDB',
				action: 'batchWriteItem',
				parameters: {
					RequestItems: {
						[demographicAreaDispatcherEngineSettings.tableName]: [
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.CENTRAL_JAKARTA,
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.NORTH_JAKARTA,
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.SOUTH_JAKARTA,
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.WEST_JAKARTA,
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: DEMOGRAPHIC_AREA.EAST_JAKARTA,
										...dispatcherCommonSettings,
									}),
								},
							},
						],
					},
				},
				physicalResourceId: custom_resources.PhysicalResourceId.of('onDemographicAreaDispatchSettingsDBSeed'),
			},
			policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
				resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})

		new custom_resources.AwsCustomResource(this, 'SeedDBPolygonTableCoords', {
			onCreate: {
				service: 'DynamoDB',
				action: 'batchWriteItem',
				parameters: {
					RequestItems: {
						[geoPolygonTable.tableName]: [
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'daf8ef58-366f-4703-921b-c76ad3027011',
										vertices: STATIC_AREAS_POLYGON.AREA1,
										name: 'Area 1',
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: '7bd50f84-e58b-4c6d-a964-2b09d39743dc',
										vertices: STATIC_AREAS_POLYGON.AREA2,
										name: 'Area 2',
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'fae2971c-08d4-494d-b8b8-14993a0cccd3',
										vertices: STATIC_AREAS_POLYGON.AREA3,
										name: 'Area 3',
									}),
								},
							},
						],
					},
				},
				physicalResourceId: custom_resources.PhysicalResourceId.of('onPolygonTableSeedDBCoords'),
			},
			policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
				resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
