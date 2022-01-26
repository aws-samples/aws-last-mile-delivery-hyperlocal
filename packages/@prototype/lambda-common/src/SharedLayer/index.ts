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
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as ssm from '@aws-cdk/aws-ssm'
import { ILayerVersion } from '@aws-cdk/aws-lambda'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SharedLayerProps extends lambda.LayerVersionProps {
	readonly layerId: string
}
export class SharedLayer extends lambda.LayerVersion {
	private static _instance: SharedLayer

	private static parameterName (layerId: string): string {
		return `/shared-layer-version-proxy/${layerId}/layerVersionArn`
	}

	static of (scope: cdk.Construct, layerId: string): ILayerVersion {
		const layerVersionArn = ssm.StringParameter.valueForStringParameter(scope, this.parameterName(layerId))

		return lambda.LayerVersion.fromLayerVersionArn(
			scope,
			`SharedLayerVersion-${layerId}`,
			layerVersionArn,
		)
	}

	constructor (scope: cdk.Construct, id: string, props: SharedLayerProps) {
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
			cdk.Stack.of(this), SharedLayer.parameterName(layerId))

		console.log(layerVersionArn)

		return (layerVersionArn != null)
	}
}
