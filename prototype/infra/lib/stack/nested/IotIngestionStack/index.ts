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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { Function as LambdaFunction, IFunction } from '@aws-cdk/aws-lambda'
import { Stream, IStream } from '@aws-cdk/aws-kinesis'
import { IRole } from '@aws-cdk/aws-iam'
import { IoTStack } from '@prototype/iot-ingestion'

export interface IotIngestionStackProps extends NestedStackProps {
	readonly externalIdentityAuthenticatedRole: IRole
	readonly driverDataIngestStream: IStream
	readonly lambdaRefs: { [key: string]: IFunction, }
}

/**
 * Prototype ingestion stack
 */
export class IotIngestionStack extends NestedStack {
	public readonly iotSetup: IoTStack

	constructor (scope: Construct, id: string, props: IotIngestionStackProps) {
		super(scope, id, props)

		const {
			externalIdentityAuthenticatedRole,
			driverDataIngestStream,
			lambdaRefs,
		} = props

		const iotSetup = new IoTStack(this, 'IoTSetup', {
			driverDataIngestStream: Stream.fromStreamArn(this, 'DriverDataIngestStreamIot', driverDataIngestStream.streamArn),
			driverStatusUpdateLambda: LambdaFunction.fromFunctionArn(this, 'DriverStatusUpdateLambdaRef', lambdaRefs.driverStatusUpdateLambda.functionArn),
			cognitoAuthenticatedRole: externalIdentityAuthenticatedRole,
		})

		this.iotSetup = iotSetup
	}
}
