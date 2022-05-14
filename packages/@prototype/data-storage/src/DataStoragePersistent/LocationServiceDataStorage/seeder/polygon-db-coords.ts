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
import { STATIC_AREAS_POLYGON, SUPPORTED_COUNTRIES, COUNTRIES, AREAS } from '@prototype/common'

export interface DatabaseSeederProps {
	readonly geoPolygonTable: ddb.ITable
    readonly country: string
}

const getPolygonDefinition = (country: string, area: string): string => {
	switch (country) {
		case COUNTRIES.PHILIPPINES:
			return (STATIC_AREAS_POLYGON.PHILIPPINES.MANILA as any)[area]
		case COUNTRIES.INDONESIA:
		default:
			return (STATIC_AREAS_POLYGON.INDONESIA.JAKARTA as any)[area]
	}
}

export class DatabaseSeeder extends Construct {
	constructor (scope: Construct, id: string, props: DatabaseSeederProps) {
		super(scope, id)

		const { geoPolygonTable, country } = props

		const supportedCountry = country.toUpperCase()

		if (!SUPPORTED_COUNTRIES.includes(supportedCountry)) {
			throw new Error(`${country} is not a supported country`)
		}

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
										vertices: getPolygonDefinition(supportedCountry, AREAS.AREA1),
										name: 'Area 1',
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: '7bd50f84-e58b-4c6d-a964-2b09d39743dc',
										vertices: getPolygonDefinition(supportedCountry, AREAS.AREA2),
										name: 'Area 2',
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: 'fae2971c-08d4-494d-b8b8-14993a0cccd3',
										vertices: getPolygonDefinition(supportedCountry, AREAS.AREA3),
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
