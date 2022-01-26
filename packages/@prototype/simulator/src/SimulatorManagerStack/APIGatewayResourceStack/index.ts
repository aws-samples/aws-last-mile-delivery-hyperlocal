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
import * as cognito from '@aws-cdk/aws-cognito'
import * as lambda from '@aws-cdk/aws-lambda'
import * as api from '@aws-play/cdk-apigateway'
import * as apiG from '@aws-cdk/aws-apigateway'
import { namespaced } from '@aws-play/cdk-core'

export interface APIGatewayResourceStackProps {
	readonly userPool: cognito.UserPool
	readonly simulatorManagerLambda: lambda.Function
	readonly orderSimulatorLambda: lambda.Function
	readonly eventSimulatorLambda: lambda.Function
	readonly polygonManagerLambda: lambda.Function
	readonly restaurantSimulatorLambda: lambda.Function
	readonly customerSimulatorLambda: lambda.Function
	readonly statisticSimulatorLambda: lambda.Function
	readonly dispatcherAssignmentQueryLambda: lambda.Function
	readonly simulatorRestApi: api.RestApi
}

export class APIGatewayResourceStack extends cdk.Construct {
	constructor (scope: cdk.Construct, id: string, props: APIGatewayResourceStackProps) {
		super(scope, id)

		const {
			simulatorRestApi,
			simulatorManagerLambda,
			orderSimulatorLambda,
			eventSimulatorLambda,
			polygonManagerLambda,
			restaurantSimulatorLambda,
			customerSimulatorLambda,
			statisticSimulatorLambda,
			dispatcherAssignmentQueryLambda,
			userPool,
		} = props

		const cognitoAuth = new apiG.CognitoUserPoolsAuthorizer(this, 'SimulatorCognitoAuthorizer', {
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

		/// restaurants route

		const restaurants = simulatorRestApi.addResourceWithAbsolutePath('restaurant')

		simulatorRestApi.addFunctionToResource(restaurants, {
			function: restaurantSimulatorLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const restaurantRandom = simulatorRestApi.addResourceWithAbsolutePath('restaurant/random')

		simulatorRestApi.addFunctionToResource(restaurantRandom, {
			function: restaurantSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const restaurantStats = simulatorRestApi.addResourceWithAbsolutePath('restaurant/stats')
		const restaurantStat = simulatorRestApi.addResourceWithAbsolutePath('restaurant/stats/{restaurantStatsId}')

		simulatorRestApi.addFunctionToResource(restaurantStats, {
			function: restaurantSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(restaurantStat, {
			function: restaurantSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(restaurantStat, {
			function: restaurantSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const restaurantsSimulations = simulatorRestApi.addResourceWithAbsolutePath('restaurant/simulations')
		const restaurantsSimulation = simulatorRestApi.addResourceWithAbsolutePath('restaurant/simulations/{simulationId}')

		simulatorRestApi.addFunctionToResource(restaurantsSimulations, {
			function: restaurantSimulatorLambda,
			httpMethod: 'PUT',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(restaurantsSimulations, {
			function: restaurantSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(restaurantsSimulation, {
			function: restaurantSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(restaurantsSimulation, {
			function: restaurantSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		/// customers route

		const customers = simulatorRestApi.addResourceWithAbsolutePath('customer')

		simulatorRestApi.addFunctionToResource(customers, {
			function: customerSimulatorLambda,
			httpMethod: 'POST',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const customerStats = simulatorRestApi.addResourceWithAbsolutePath('customer/stats')
		const customerStat = simulatorRestApi.addResourceWithAbsolutePath('customer/stats/{customerStatsId}')

		simulatorRestApi.addFunctionToResource(customerStats, {
			function: customerSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(customerStat, {
			function: customerSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(customerStat, {
			function: customerSimulatorLambda,
			httpMethod: 'DELETE',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		const customersSimulations = simulatorRestApi.addResourceWithAbsolutePath('customer/simulations')
		const customersSimulation = simulatorRestApi.addResourceWithAbsolutePath('customer/simulations/{simulationId}')

		simulatorRestApi.addFunctionToResource(customersSimulations, {
			function: customerSimulatorLambda,
			httpMethod: 'PUT',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(customersSimulations, {
			function: customerSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(customersSimulation, {
			function: customerSimulatorLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})

		simulatorRestApi.addFunctionToResource(customersSimulation, {
			function: customerSimulatorLambda,
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

		// queryType = "all" | "orderRoutes" | "byId" (?id=) | "after" (?timestamp=) | "between" (?from=&to=)
		const assignmentsEndpoint = simulatorRestApi.addResourceWithAbsolutePath('assignment/{queryType}')

		simulatorRestApi.addFunctionToResource(assignmentsEndpoint, {
			function: dispatcherAssignmentQueryLambda,
			httpMethod: 'GET',
			methodOptions: {
				authorizer: cognitoAuth,
			},
		})
	}
}
