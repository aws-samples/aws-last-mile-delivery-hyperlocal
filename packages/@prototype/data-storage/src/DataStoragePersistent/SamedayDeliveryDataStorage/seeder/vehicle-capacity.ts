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

export interface DatabaseSeederProps {
	readonly sameDayDirectPudoVehicleCapacity: ddb.ITable
}

export class DatabaseSeeder extends Construct {
	constructor (scope: Construct, id: string, props: DatabaseSeederProps) {
		super(scope, id)

		const {
			sameDayDirectPudoVehicleCapacity,
		} = props

		new custom_resources.AwsCustomResource(this, 'SeedDBSameDayDirectPudoVehicleCapacity', {
			onCreate: {
				service: 'DynamoDB',
				action: 'batchWriteItem',
				parameters: {
					RequestItems: {
						[sameDayDirectPudoVehicleCapacity.tableName]: [
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'Motorcycle-150cc',
										length: { unit: 'cm', value: 50.0 },
										height: { unit: 'cm', value: 60.0 },
										width: { unit: 'cm', value: 50.0 },
										weight: { unit: 'kg', value: 10.0 },
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'Motorcycle-400cc',
										length: { unit: 'cm', value: 50.0 },
										height: { unit: 'cm', value: 60.0 },
										width: { unit: 'cm', value: 50.0 },
										weight: { unit: 'kg', value: 14.0 },
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'Car-Medium',
										length: { unit: 'cm', value: 120.0 },
										height: { unit: 'cm', value: 60.0 },
										width: { unit: 'cm', value: 100.0 },
										weight: { unit: 'kg', value: 50.0 },
									}),
								},
							},
						],
					},
				},
				physicalResourceId: custom_resources.PhysicalResourceId.of('onSameDayDirectPudoVehicleCapacityTableSeed'),
			},
			policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
				resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
			}),
		})
	}
}
