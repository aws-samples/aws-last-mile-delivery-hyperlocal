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
import { DatabaseSeeder as DemographicAreaProviderEnginerSeeder } from './seeder/demographic-area-provider-engine'

export class RootDataStorage extends DataStorage<DataStorageProps> {
	public readonly orderTable: ddb.ITable

	public readonly demographicAreaProviderEngineSettings: ddb.ITable

	constructor (scope: Construct, id: string, props: DataStorageProps) {
		super(scope, id, props)

		this.orderTable = new hyperlocal_ddb.Table(this, 'OrderTable', {
			tableName: namespaced(this, 'order'),
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
	}

	runDbSeed (): void {
		new DemographicAreaProviderEnginerSeeder(this, 'RootDataStorageDemographicAreaProviderEnginerSeeder', {
			demographicAreaProviderEngineSettings: this.demographicAreaProviderEngineSettings,
			country: this.country,
		})
	}
}
