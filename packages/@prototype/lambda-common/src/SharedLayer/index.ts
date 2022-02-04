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
import { Stack, aws_lambda as lambda, aws_ssm as ssm } from 'aws-cdk-lib'

export interface SharedLayerProps extends lambda.LayerVersionProps {
	readonly layerId: string
}
export class SharedLayer extends lambda.LayerVersion {
	private static _instance: SharedLayer

	private static parameterName (layerId: string): string {
		return `/shared-layer-version-proxy/${layerId}/layerVersionArn`
	}

	static of (scope: Construct, layerId: string): lambda.ILayerVersion {
		const layerVersionArn = ssm.StringParameter.valueForStringParameter(scope, this.parameterName(layerId))

		return lambda.LayerVersion.fromLayerVersionArn(
			scope,
			`SharedLayerVersion-${layerId}`,
			layerVersionArn,
		)
	}

	constructor (scope: Construct, id: string, props: SharedLayerProps) {
		super(scope, id, props)

		// if (!this.layerIdExists(props.layerId)) {
		new ssm.StringParameter(this, 'VersionArn', {
			parameterName: SharedLayer.parameterName(props.layerId),
			stringValue: this.layerVersionArn,
		})
		// } else {
		// 	console.trace()
		// 	throw new Error(`LayerId "${props.layerId}" already used. Choose a unique layer ID`)
		// }
	}

	private layerIdExists (layerId: string): boolean {
		const layerVersionArn = ssm.StringParameter.valueForStringParameter(
			Stack.of(this), SharedLayer.parameterName(layerId))

		// eslint-disable-next-line no-console
		console.log(layerVersionArn)

		return (layerVersionArn != null)
	}
}
