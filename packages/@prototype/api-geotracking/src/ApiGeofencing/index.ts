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
import { aws_apigateway as apigw, aws_cognito as cognito, aws_events as events, aws_ec2 as ec2, aws_elasticache as elasticache, aws_lambda as lambda } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'
import HTTPMethod from 'http-method-enum'
import { GeofencingServiceLambda } from './GeofencingService'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApiGeofencingProps {
	readonly restApi: RestApi
	readonly apiPrefix?: string
	readonly userPool: cognito.IUserPool
	readonly eventBus: events.EventBus
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly redisCluster: elasticache.CfnCacheCluster
}

export class ApiGeofencing extends Construct {
	public readonly geofencingLambda: lambda.IFunction

	constructor (scope: Construct, id: string, props: ApiGeofencingProps) {
		super(scope, id)

		const {
			restApi,
			apiPrefix = 'api/geotracking',
			userPool,
			eventBus,
			vpc,
			redisCluster,
			lambdaLayers,
			lambdaSecurityGroups,
		} = props

		const cognitoAuthorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'GeofencingApiCognitoAuthorizer', {
			authorizerName: namespaced(this, 'GeofencingApiCognitoAuthorizer'),
			cognitoUserPools: [userPool],
		})

		this.geofencingLambda = new GeofencingServiceLambda(restApi, 'GeofencingService', {
			dependencies: {
				eventBus,
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.esClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
			},
		})

		const geofencingEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/geofencing`)
		restApi.addFunctionToResource(geofencingEndpoint, {
			function: this.geofencingLambda,
			httpMethod: HTTPMethod.POST,
			methodOptions: {
				authorizer: cognitoAuthorizer,
			},
		})

		const geofencingItemEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/geofencing/{geofencingId}`)
		restApi.addFunctionToResource(geofencingItemEndpoint, {
			function: this.geofencingLambda,
			httpMethod: HTTPMethod.DELETE,
			methodOptions: {
				authorizer: cognitoAuthorizer,
			},
		})
	}
}
