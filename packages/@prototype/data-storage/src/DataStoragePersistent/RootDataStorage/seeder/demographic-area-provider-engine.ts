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
import { SUPPORTED_COUNTRIES, DISTRICTS } from '@prototype/common'
import { getDemographicArea } from '../../util'

export interface DatabaseSeederProps {
	readonly demographicAreaProviderEngineSettings: ddb.ITable
	readonly country: string
}

export class DatabaseSeeder extends Construct {
	constructor (scope: Construct, id: string, props: DatabaseSeederProps) {
		super(scope, id)

		const {	demographicAreaProviderEngineSettings, country } = props
		const supportedCountry = country.toUpperCase()

		if (!SUPPORTED_COUNTRIES.includes(supportedCountry)) {
			throw new Error(`${country} is not a supported country`)
		}

		const commonRules = [
			{
				name: 'PollingProvider',
				conditions: {
					any: [
						{
							fact: 'get-percentage',
							operator: 'lessThanInclusive',
							value: 10,
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
									value: 15,
									priority: 20,
								},
							],
						},
						{
							fact: 'origin',
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
								value: 10,
								priority: 10,
							},
							{
								fact: 'get-percentage',
								operator: 'lessThanInclusive',
								value: 30,
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
								value: 15,
								priority: 20,
							},
							{
								fact: 'get-percentage',
								operator: 'lessThanInclusive',
								value: 35,
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
				priority: 10,
			},
			{
				name: 'InstantDeliveryProvider',
				conditions: {
					any: [
						{
							all: [
								{
									fact: 'get-percentage',
									operator: 'greaterThan',
									value: 30,
									priority: 10,
								},
								{
									fact: 'get-percentage',
									operator: 'lessThanInclusive',
									value: 65,
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
									value: 35,
									priority: 20,
								},
								{
									fact: 'get-percentage',
									operator: 'lessThanInclusive',
									value: 65,
									priority: 20,
								},
							],
						},
					],
				},
				event: {
					type: 'instant-delivery-provider-triggered',
					params: {
						provider: 'InstantDeliveryProvider',
					},
				},
				priority: 20,
			},
			{
				name: 'SameDayDeliveryProvider',
				conditions: {
					any: [
						{
							all: [
								{
									fact: 'get-percentage',
									operator: 'greaterThanInclusive',
									value: 65,
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
									value: 65,
									priority: 20,
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
					type: 'same-day-delivery-provider-triggered',
					params: {
						provider: 'SameDayDeliveryProvider',
					},
				},
				priority: 20,
			},
		]

		new custom_resources.AwsCustomResource(this, 'RootDataStorageDemographicAreaProviderEngineSettings', {
			onCreate: {
				service: 'DynamoDB',
				action: 'batchWriteItem',
				parameters: {
					RequestItems: {
						[demographicAreaProviderEngineSettings.tableName]: [
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.CENTRAL),
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.NORTH),
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.SOUTH),
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.WEST),
										rules: commonRules,
									}),
								},
							},
							{
								PutRequest: {
									Item: utils.marshall({
										ID: getDemographicArea(supportedCountry, DISTRICTS.EAST),
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
	}
}
