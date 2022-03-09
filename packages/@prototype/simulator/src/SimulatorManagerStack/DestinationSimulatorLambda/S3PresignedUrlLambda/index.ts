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
import { Duration, aws_lambda as lambda, aws_s3 as s3, aws_iam as iam } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'

interface Environment extends DeclaredLambdaEnvironment {
	readonly SIMULATOR_CONFIG_BUCKET: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly simulatorConfigBucket: s3.IBucket
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class S3PresignedUrlLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			simulatorConfigBucket,
			lambdaLayers,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'S3PresignedUrl'),
			description: 'Lambda used to generate pre-signed url for the file event upload',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/s3-presigned-url.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				SIMULATOR_CONFIG_BUCKET: simulatorConfigBucket.bucketName,
				SIMULATOR_CONFIG_FILE_PREFIX: 'uploads',
			},
			initialPolicy: [
				new iam.PolicyStatement({
					actions: [
						's3:PutObject',
						's3:GetObject',
					],
					effect: iam.Effect.ALLOW,
					resources: [`${simulatorConfigBucket.bucketArn}/*`],
				}),
			],
			layers: lambdaLayers,
		}

		super(scope, id, declaredProps)
	}
}
