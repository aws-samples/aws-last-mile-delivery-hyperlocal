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
import { Construct } from '@aws-cdk/core'
import { LayerVersion as BaseLayerVersion, LayerVersionProps as BaseLayerVersionProps } from '@aws-cdk/aws-lambda'
import { StringParameter } from '@aws-cdk/aws-ssm'

export class LayerVersion extends BaseLayerVersion {
	private readonly secretParameterName: string

	private secretParameter?: StringParameter

	private createSecretParameter (): void {
		if (this.secretParameter != null) {
			throw new Error('Secret parameter already created')
		}

		// Store the arn in a SSM enable cross-stack usage https://github.com/aws/aws-cdk/issues/1972
		this.secretParameter = new StringParameter(this, 'SecretParameter', {
			parameterName: this.secretParameterName,
			stringValue: this.layerVersionArn,
		})
	}

	/**
	 * @inheritdoc
	 *
	 * @override **WARNING:** Using `LayerVersion.layerVersionArn` getting may cause parameter issues between cross-stacks. Use `getLayerVersionArn(scope)` to resolve.
	 */
	get layerVersionArn (): string {
		this.node.addWarning('Using `LayerVersion.layerVersionArn` getting may cause parameter issues between cross-stacks. Use `getLayerVersionArn(scope)` to resolve.')

		return super.layerVersionArn
	}

	getLayerVersionArn (scope: Construct): string {
		if (this.secretParameter == null) {
			this.createSecretParameter()
		}

		return StringParameter.valueForStringParameter(scope, this.secretParameterName)
	}

	constructor (scope: Construct, id: string, props: BaseLayerVersionProps) {
		super(scope, id, props)

		this.secretParameterName = `${this.node.uniqueId}/layerVersionArn`
	}
}
