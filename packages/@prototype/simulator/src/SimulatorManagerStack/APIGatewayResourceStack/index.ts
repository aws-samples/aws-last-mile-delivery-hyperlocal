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
import { aws_cognito as cognito, aws_lambda as lambda, aws_apigateway as apigw } from 'aws-cdk-lib'
import * as api from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'

export interface APIGatewayResourceStackProps {
	readonly userPool: cognito.UserPool
	readonly simulatorManagerLambda: lambda.Function
	readonly orderSimulatorLambda: lambda.Function
	readonly eventSimulatorLambda: lambda.Function
	readonly polygonManagerLambda: lambda.Function
	readonly originSimulatorLambda: lambda.Function
	readonly destinationSimulatorLambda: lambda.Function
	readonly statisticSimulatorLambda: lambda.Function
	readonly instantDeliveryDispatcherAssignmentQueryLambda: lambda.Function
	readonly sameDayDeliveryDispatcherAssignmentQueryLambda: lambda.Function
	readonly s3PresignedUrlLambda: lambda.Function
	readonly simulatorRestApi: api.RestApi
}

export class APIGatewayResourceStack extends Construct {
	constructor (scope: Construct, id: string, props: APIGatewayResourceStackProps) {
		super(scope, id)

		const {
			simulatorRestApi,
			simulatorManagerLambda,
			orderSimulatorLambda,
			eventSimulatorLambda,
			polygonManagerLambda,
			originSimulatorLambda,
			destinationSimulatorLambda,
			statisticSimulatorLambda,
			instantDeliveryDispatcherAssignmentQueryLambda,
			sameDayDeliveryDispatcherAssignmentQueryLambda,
			s3PresignedUrlLambda,
			userPool,
		} = props

		const cognitoAuth = new apigw.CognitoUserPoolsAuthorizer(this, 'SimulatorCognitoAuthorizer', {
			authorizerName: namespaced(this, 'CognitoAuthorizer'),
			identitySource: 'method.request.header.Authorization',
			cognitoUserPools: [userPool],
		})

		const simulator = simulatorRestApi.addResourceWithAbsolutePath('simulator')
		const simulation = simulatorRestApi.addResourceWithAbsolutePath('simulator/{simulationId}')

		simulatorRestApi.addFunctionToResource(simulator, {
			function: simulatorManagerLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(simulator, {
			function: simulatorManagerLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(simulation, {
			function: simulatorManagerLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(simulation, {
			function: simulatorManagerLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const orders = simulatorRestApi.addResourceWithAbsolutePath('order')
		const order = simulatorRestApi.addResourceWithAbsolutePath('order/{orderId}')

		simulatorRestApi.addFunctionToResource(orders, {
			function: orderSimulatorLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(orders, {
			function: orderSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(order, {
			function: orderSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const events = simulatorRestApi.addResourceWithAbsolutePath('event')
		const event = simulatorRestApi.addResourceWithAbsolutePath('event/{eventId}')

		simulatorRestApi.addFunctionToResource(events, {
			function: eventSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(event, {
			function: eventSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const polygons = simulatorRestApi.addResourceWithAbsolutePath('polygon')
		const polygon = simulatorRestApi.addResourceWithAbsolutePath('polygon/{polygonId}')

		simulatorRestApi.addFunctionToResource(polygons, {
			function: polygonManagerLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
		simulatorRestApi.addFunctionToResource(polygon, {
			function: polygonManagerLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
		simulatorRestApi.addFunctionToResource(polygons, {
			function: polygonManagerLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
		simulatorRestApi.addFunctionToResource(polygons, {
			function: polygonManagerLambda,
			httpMethod: 'PUT',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
		simulatorRestApi.addFunctionToResource(polygon, {
			function: polygonManagerLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		/// origins route

		const origins = simulatorRestApi.addResourceWithAbsolutePath('origin')

		simulatorRestApi.addFunctionToResource(origins, {
			function: originSimulatorLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const originRandom = simulatorRestApi.addResourceWithAbsolutePath('origin/random')

		simulatorRestApi.addFunctionToResource(originRandom, {
			function: originSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const originStats = simulatorRestApi.addResourceWithAbsolutePath('origin/stats')
		const originStat = simulatorRestApi.addResourceWithAbsolutePath('origin/stats/{originStatsId}')

		simulatorRestApi.addFunctionToResource(originStats, {
			function: originSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(originStat, {
			function: originSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(originStat, {
			function: originSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const originsSimulations = simulatorRestApi.addResourceWithAbsolutePath('origin/simulations')
		const originsSimulation = simulatorRestApi.addResourceWithAbsolutePath('origin/simulations/{simulationId}')

		simulatorRestApi.addFunctionToResource(originsSimulations, {
			function: originSimulatorLambda,
			httpMethod: 'PUT',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(originsSimulations, {
			function: originSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(originsSimulation, {
			function: originSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(originsSimulation, {
			function: originSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		/// destinations route

		const destinations = simulatorRestApi.addResourceWithAbsolutePath('destination')

		simulatorRestApi.addFunctionToResource(destinations, {
			function: destinationSimulatorLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const destinationsSignedUrl = simulatorRestApi.addResourceWithAbsolutePath('destination/signed-url')

		simulatorRestApi.addFunctionToResource(destinationsSignedUrl, {
			function: s3PresignedUrlLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const destinationStats = simulatorRestApi.addResourceWithAbsolutePath('destination/stats')
		const destinationStat = simulatorRestApi.addResourceWithAbsolutePath('destination/stats/{destinationStatsId}')

		simulatorRestApi.addFunctionToResource(destinationStats, {
			function: destinationSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(destinationStat, {
			function: destinationSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(destinationStat, {
			function: destinationSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const destinationsSimulations = simulatorRestApi.addResourceWithAbsolutePath('destination/simulations')
		const destinationsSimulation = simulatorRestApi.addResourceWithAbsolutePath('destination/simulations/{simulationId}')

		simulatorRestApi.addFunctionToResource(destinationsSimulations, {
			function: destinationSimulatorLambda,
			httpMethod: 'PUT',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(destinationsSimulations, {
			function: destinationSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(destinationsSimulation, {
			function: destinationSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(destinationsSimulation, {
			function: destinationSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const stats = simulatorRestApi.addResourceWithAbsolutePath('stats')

		simulatorRestApi.addFunctionToResource(stats, {
			function: statisticSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(stats, {
			function: statisticSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		// queryType = "all" | "orderRoutes" | "byId" (?id=) | "after" (?timestamp=) | "between" (?from=&to=)
		const instantDeliveryAssignmentsEndpoint = simulatorRestApi.addResourceWithAbsolutePath('/instant-delivery/assignment/{queryType}')

		simulatorRestApi.addFunctionToResource(instantDeliveryAssignmentsEndpoint, {
			function: instantDeliveryDispatcherAssignmentQueryLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		// queryType = "all" | "orderRoutes" | "byId" (?id=) | "after" (?timestamp=) | "between" (?from=&to=)
		const sameDayDeliveryAssignmentsEndpoint = simulatorRestApi.addResourceWithAbsolutePath('/same-day-delivery/assignment/{queryType}')

		simulatorRestApi.addFunctionToResource(sameDayDeliveryAssignmentsEndpoint, {
			function: sameDayDeliveryDispatcherAssignmentQueryLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
	}
}
