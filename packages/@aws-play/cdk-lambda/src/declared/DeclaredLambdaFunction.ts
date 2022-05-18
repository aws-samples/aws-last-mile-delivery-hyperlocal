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
import * as core from 'aws-cdk-lib'
import { aws_lambda as lambda } from 'aws-cdk-lib'
import * as path from 'path'
import { sync as findup } from 'find-up'

export interface DeclaredLambdaEnvironment {
	[key: string]: string
}

export interface DeclaredLambdaDependencies {
	[key: string]: any
}

/**
 * ExposedDeclaredLambdaProps interface defines the properties that are exposed
 * to final constructor of declared lambda implementation. Only the `dependencies`
 * property should be made available to constructor while everthing else is defined
 * within the implementation.
 */
export interface ExposedDeclaredLambdaProps<TDependencies> {
	readonly dependencies: TDependencies
}

export interface DeclaredLambdaProps<
	TEnvironment extends DeclaredLambdaEnvironment,
	TDependencies extends DeclaredLambdaDependencies,
> extends Omit<
		lambda.FunctionProps,
		'environment' | 'runtime' | 'handler' | 'code'
	> {
	readonly environment: TEnvironment
	readonly dependencies: TDependencies
	code?: lambda.FunctionProps['code']
	handler?: lambda.FunctionProps['handler']
	runtime?: lambda.FunctionProps['runtime']
}

/**
 * Helper method for getting path to lambda output in dist. This will allow
 * referencing lambda definition in both the src and dist; assuming the lambda has
 * been built to the dist prior.
 * @param fromDir The base directory were lambda dist is output to. Both source and dist must
 * live in same root dir.
 * @param lambdaPathInDist The relative path of lambda within the dist output.
 */
export function getLambdaDistPath (
	fromDir: string,
	lambdaPathInDist: string,
): string {
	if (!path.isAbsolute(fromDir)) {
		throw new Error(`Param "fromDir" must be absolute: ${fromDir}`)
	}

	const dist = findup('dist', { cwd: fromDir, type: 'directory' })

	if (dist == null) {
		throw new Error(
			`Failed to find "dist" folder for "${lambdaPathInDist}" from "${fromDir}"`,
		)
	}

	return path.join(dist, lambdaPathInDist)
}

/**
 * `DeclaredLambdaFunction` class is an declarative pattern for implementing Lambda functions
 * in consistent way that encapsulates dependencies and integration of lambda functions.
 *
 * This pattern enforces the use of defining environment and dependencies used by the
 * lambda function and role respectively.
 *
 * @example
 * // Lambda function implementation
 * interface Environment extends LambdaEnvironment {
 *	TABLE_DEVICES: string
 *	TABLE_DEVICE_TYPES: string
 *  ...
 * }
 *
 * interface Dependencies {
 *	readonly settingTable: ddb.ITable
 *	readonly deviceTable: ddb.ITable
 * 	...
 * }
 *
 * type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>
 *
 * export class DevicesServiceLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
 * 	static get codeDirectory (): string {
 * 		// define the relative output path of lambda code zip/dir/file/etc in the dist dir
 *		return DevicesServiceLambda.getLambdaDistPath(__dirname, 'lambda/devices-service.zip')
 * 	}
 *
 * constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
 *		const { settingTable, deviceTable, deviceTypeTable, iotConnectPolicy } = props.dependencies
 *
 *		const declaredProps: TDeclaredProps = {
 *			functionName: namespaced(scope, 'DevicesServices'),
 *			description: 'Sputnik Devices microservice',
 *			// code: lambda.Code.fromAsset(lambdaPath('devices-service')), // Optional instead of `codeDirectory`
 *			environment: {
 *				TABLE_DEVICES: deviceTable.tableName,
 *				TABLE_SETTINGS: settingTable.tableName,
 * 				...
 *			},
 *			dependencies: props.dependencies,
 *			initialPolicy: [
 *				new iam.PolicyStatement({
 *					effect: iam.Effect.ALLOW,
 *					actions: [
 *						DynamoDBActions.GET_ITEM,
 *						DynamoDBActions.PUT_ITEM,
 * 						...
 *					],
 *					resources: [
 *						Stack.of(scope).formatArn({
 *							service: 'dynamodb',
 *							resource: 'table',
 *							resourceName: settingTable.tableName,
 *						}),
 *					],
 *				}),
 *			],
 *		}

 *		super(scope, id, declaredProps)
 *	 }
 * }
 *
 * // Lambda function instantiation
 * const lambdaFunction = new DevicesServiceLambda(this, 'DevicesServiceLambda', {
 *			dependencies: {
 *				settingTable,
 *				deviceTable,
 * 				...
 *			},
 *		})
 */
export class DeclaredLambdaFunction<
		TEnvironment extends DeclaredLambdaEnvironment,
		TDependencies extends DeclaredLambdaDependencies,
	>
	extends lambda.Function
	implements lambda.IFunction {
	readonly dependencies: TDependencies;

	/**
	 * Helper method for getting path to lambda output in dist. This will allow
	 * referencing lambda definition in both the src and dist; assuming the lambda has
	 * been built to the dist prior.
	 * @param fromDir The base directory were lambda dist is output to. Both source and dist must
	 * live in same root dir.
	 * @param lambdaPathInDist The relative path of lambda within the dist output.
	 */
	static getLambdaDistPath (fromDir: string, lambdaPathInDist: string): string {
		return getLambdaDistPath(fromDir, lambdaPathInDist)
	}

	/**
	 * [Override] This method should be overriden by lambda classes to define the path
	 * to the lambda zip/dir/file/etc. If not defined by lambda declaration class, it
	 * must provide `props.code` to the constructor.
	 * @see DeclaredLambdaFunction#getLambdaDistPath - can help assist with defining this path
	 */
	static get codeDirectory (): string {
		throw new Error(`${this.name}.codeDirectory does not exist`)
	}

	/**
	 * Gets reference to lambda code asset use by function.
	 * @throws `XXXDeclaredLambdaFunction.codeDirectory does not exist` if lambda declaration does
	 * not define the `codeDirectory` static method.
	 */
	static get assetCode (): lambda.AssetCode {
		return lambda.Code.fromAsset(this.codeDirectory)
	}

	protected constructor (
		scope: Construct,
		id: string,
		props: DeclaredLambdaProps<TEnvironment, TDependencies>,
	) {
		// Set defaults
		props = Object.assign(
			{
				timeout: core.Duration.seconds(10),
				memorySize: 256,
				handler: 'index.handler',
				runtime: lambda.Runtime.NODEJS_16_X,
				architecture: lambda.Architecture.ARM_64,
			},
			props,
		)

		if (props.code == null) {
			props.code = DeclaredLambdaFunction.assetCode
		}

		super(scope, id, props as unknown as lambda.FunctionProps)

		this.dependencies = props.dependencies
	}
}
