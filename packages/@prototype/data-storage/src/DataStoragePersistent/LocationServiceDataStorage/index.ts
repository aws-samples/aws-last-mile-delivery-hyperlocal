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
import { DatabaseSeeder as PolygonDbCoordsSeeder } from './seeder/polygon-db-coords'

export class LocationServiceDataStorage extends DataStorage<DataStorageProps> {
	public readonly driversTelemetryBucket: s3.IBucket

	public readonly geoPolygonTable: ddb.ITable

	constructor (scope: Construct, id: string, props: DataStorageProps) {
		super(scope, id, props)

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
	}

	runDbSeed (): void {
		new PolygonDbCoordsSeeder(this, 'LocationServicePolygonDbCoordsSeeder', {
			geoPolygonTable: this.geoPolygonTable,
			country: this.country,
		})
	}
}
