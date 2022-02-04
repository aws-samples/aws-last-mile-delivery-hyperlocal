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
import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, aws_lambda as lambda, aws_kinesis as kinesis, aws_iam as iam } from 'aws-cdk-lib'
import { IoTStack } from '@prototype/iot-ingestion'

export interface IotIngestionStackProps extends NestedStackProps {
	readonly externalIdentityAuthenticatedRole: iam.IRole
	readonly driverDataIngestStream: kinesis.IStream
	readonly lambdaRefs: { [key: string]: lambda.IFunction, }
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
			driverDataIngestStream: kinesis.Stream.fromStreamArn(this, 'DriverDataIngestStreamIot', driverDataIngestStream.streamArn),
			driverStatusUpdateLambda: lambda.Function.fromFunctionArn(this, 'DriverStatusUpdateLambdaRef', lambdaRefs.driverStatusUpdateLambda.functionArn),
			cognitoAuthenticatedRole: externalIdentityAuthenticatedRole,
		})

		this.iotSetup = iotSetup
	}
}
