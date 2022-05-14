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
import { DISTRICTS, SUPPORTED_COUNTRIES } from 'packages/@prototype/common'
import { getDemographicArea } from '../../util'

export interface DatabaseSeederProps {
	readonly demographicAreaDispatcherEngineSettings: ddb.ITable
	readonly country: string
}

export class DatabaseSeeder extends Construct {
	constructor (scope: Construct, id: string, props: DatabaseSeederProps) {
		super(scope, id)

		const { demographicAreaDispatcherEngineSettings, country } = props
		const supportedCountry = country.toUpperCase()

		if (!SUPPORTED_COUNTRIES.includes(supportedCountry)) {
			throw new Error(`${country} is not a supported country`)
		}

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
										ID: getDemographicArea(supportedCountry, DISTRICTS.CENTRAL),
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.NORTH),
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.SOUTH),
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.WEST),
										...dispatcherCommonSettings,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.EAST),
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
	}
}
