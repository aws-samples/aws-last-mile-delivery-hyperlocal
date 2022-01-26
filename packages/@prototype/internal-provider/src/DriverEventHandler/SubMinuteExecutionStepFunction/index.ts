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
import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as step from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import { namespaced } from '@aws-play/cdk-core'

export interface SubMinuteExecutionStepFunctionProps {
  readonly timeoutInSeconds: number
  readonly stepFunctionIntervalInMinutes: number
  readonly targetLambda: lambda.IFunction
}

export class SubMinuteExecutionStepFunction extends cdk.Construct {
	public readonly stepFunction: step.StateMachine

	constructor (scope: cdk.Construct, id: string, props: SubMinuteExecutionStepFunctionProps) {
		super(scope, id)

		const {
			stepFunctionIntervalInMinutes,
			timeoutInSeconds,
			targetLambda,
		} = props

		const lambdaHelper = new lambda.Function(this, 'SubMinuteExecutionHelper', {
			runtime: lambda.Runtime.NODEJS_12_X,
			functionName: namespaced(this, 'SubMinuteExecutionHelper'),
			description: 'Lambda helper invoked by SubMinuteExecution step function to perform some tasks',
			code: lambda.Code.fromAsset(path.join(__dirname, './lambdaCode')),
			handler: 'index.handler',
			timeout: cdk.Duration.seconds(59),
		})

		const configureIterations = new tasks.LambdaInvoke(this, 'configureIterations', {
			lambdaFunction: lambdaHelper,
			resultPath: '$.configureIterations',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'configureIterations',
					payload: {
						timeoutInSeconds,
						stepFunctionIntervalInMinutes,
					},
				},
			},
		})

		const waitForXSeconds = new tasks.LambdaInvoke(this, 'WaitForXSeconds', {
			lambdaFunction: lambdaHelper,
			payloadResponseOnly: true,
			resultPath: '$.waitForXSeconds',
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'waitForXSeconds',
					payload: {
						'timeoutInMs.$': '$.configureIterations.timeoutInMs',
					},
				},
			},
		})

		const incrementCurrentCounter = new tasks.LambdaInvoke(this, 'IncrementCurrentCounter', {
			lambdaFunction: lambdaHelper,
			resultPath: '$.currentCounter',
			payloadResponseOnly: true,
			payload: {
				type: step.InputType.OBJECT,
				value: {
					cmd: 'incrementCurrentCounter',
					payload: {
						'input.$': '$',
					},
				},
			},
		})

		const end = new step.Pass(this, 'End')

		const isCompleted = new step.Choice(this, 'IsMaxIterationReached')
		.when(
			step.Condition.numberEqualsJsonPath('$.configureIterations.maxIterations', '$.currentCounter.iteration'),
			end,
		).otherwise(
			waitForXSeconds,
		)

		const invokeTargetLambda = new tasks.LambdaInvoke(this, 'InvokeTargetLambda', {
			lambdaFunction: targetLambda,
			invocationType: tasks.LambdaInvocationType.EVENT,
			resultPath: '$.targetLambda',
			payload: {
				type: step.InputType.TEXT,
				value: '',
			},
		})

		const definition = configureIterations
		.next(waitForXSeconds)
		.next(invokeTargetLambda)
		.next(incrementCurrentCounter)
		.next(isCompleted)

		this.stepFunction = new step.StateMachine(this, 'SubminuteLambdaExecution', {
			stateMachineName: namespaced(this, 'SubminuteLambdaExecution'),
			definition,
		})
	}
}
