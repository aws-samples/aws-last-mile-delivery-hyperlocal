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
import { aws_apigateway as apigw, aws_cognito as cognito, aws_lambda as lambda, aws_ec2 as ec2, aws_elasticache as elasticache, aws_dynamodb as ddb, aws_opensearchservice as opensearchservice } from 'aws-cdk-lib'
import { RestApi } from '@aws-play/cdk-apigateway'
import { namespaced } from '@aws-play/cdk-core'
import HTTPMethod from 'http-method-enum'
import { GetDriverLocationLambda } from './GetDriverLocation'
import { QueryDriversLambda } from './QueryDrivers'
import { ListDriversForPolygonLambda } from './ListDriversForPolygon'
import { GetDemAreaSettingsLambda } from './GetDemAreaSettings'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApiGeoTrackingProps {
	readonly restApi: RestApi
	readonly apiPrefix?: string
	readonly userPool: cognito.IUserPool
	readonly lambdaLayers: { [key: string]: lambda.ILayerVersion, }
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly redisCluster: elasticache.CfnCacheCluster
	readonly geoPolygonTable: ddb.ITable
	readonly demographicAreaDispatchSettings: ddb.ITable
	readonly openSearchDomain: opensearchservice.IDomain
}

export class ApiGeoTracking extends Construct {
	readonly userPoolClient: cognito.IUserPoolClient

	readonly geoTrackingApiKey: apigw.IApiKey

	readonly queryDrivers: lambda.IFunction

	constructor (scope: Construct, id: string, props: ApiGeoTrackingProps) {
		super(scope, id)

		const {
			restApi,
			apiPrefix = 'api/geotracking',
			lambdaLayers,
			userPool,
			vpc, lambdaSecurityGroups, redisCluster,
			geoPolygonTable,
			demographicAreaDispatchSettings,
			openSearchDomain,
		} = props

		const cognitoAuthorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'GeoTrackingApiCognitoAuthorizer', {
			authorizerName: namespaced(this, 'GeoTrackingApiCognitorAuthorizer'),
			cognitoUserPools: [userPool],
		})

		// add UserPool client
		const userPoolClient = userPool.addClient('GeoTrackingApiUserPoolClient', {
			userPoolClientName: namespaced(this, 'GeoTrackingApi-Client'),
			authFlows: {
				userPassword: true,
				userSrp: true,
				adminUserPassword: true,
			},
		})

		this.userPoolClient = userPoolClient

		const geoTrackingApiKey = restApi.addApiKeyWithUsagePlanAndStage(namespaced(restApi, 'ApiKey-GeoTrackingApi'))
		this.geoTrackingApiKey = geoTrackingApiKey

		// GetDriverLocation
		const getDriverLocationEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/driver-location/id/{driverId}`)
		const getDriverLocationLambda = new GetDriverLocationLambda(restApi, 'GetDriverLocationLambda', {
			dependencies: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.openSearchClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
			},
		})
		restApi.addFunctionToResource(getDriverLocationEndpoint, {
			function: getDriverLocationLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				authorizer: cognitoAuthorizer,
			},
		})
		const getDriverLocationEndpointInternal = restApi.addResourceWithAbsolutePath(`${apiPrefix}/internal/driver-location/id/{driverId}`)
		restApi.addFunctionToResource(getDriverLocationEndpointInternal, {
			function: getDriverLocationLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				apiKeyRequired: true,
			},
		})

		// queryDrivers
		const queryDriversEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/driver-location/query/`)
		const queryDriversLambda = new QueryDriversLambda(restApi, 'QueryDriversLambda', {
			dependencies: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.openSearchClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
			},
		})
		const queryDriversRequestValidator = new apigw.RequestValidator(this, 'QueryDriversLambdaReqValidator',
			{
				restApi,
				requestValidatorName: namespaced(this, 'QueryDriversLambdaReqValidator'),
				validateRequestParameters: true,
			},
		)
		const queryDriversRequestParameters = {
			'method.request.querystring.status': false,
			'method.request.querystring.shape': false, // 'circle' | 'box'
			'method.request.querystring.lat': true,
			'method.request.querystring.long': true,
			'method.request.querystring.distance': true,
			'method.request.querystring.distanceUnit': false, // default: 'm'
		}

		restApi.addFunctionToResource(queryDriversEndpoint, {
			function: queryDriversLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				authorizer: cognitoAuthorizer,
				requestParameters: queryDriversRequestParameters,
				requestValidator: queryDriversRequestValidator,
			},
		})
		const queryDriversEndpointInternal = restApi.addResourceWithAbsolutePath(`${apiPrefix}/internal/driver-location/query/`)
		restApi.addFunctionToResource(queryDriversEndpointInternal, {
			function: queryDriversLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				apiKeyRequired: true,
				requestParameters: queryDriversRequestParameters,
				requestValidator: queryDriversRequestValidator,
			},
		})
		restApi.addFunctionToResource(queryDriversEndpointInternal, {
			function: queryDriversLambda,
			httpMethod: HTTPMethod.POST,
			methodOptions: {
				apiKeyRequired: true,
			},
		})

		// listDriversForPolygon
		const listDriversForPolygonWithIdEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/driver-location/polygon/{polygonId}`)
		const listDriversForPolygonEndpoint = restApi.addResourceWithAbsolutePath(`${apiPrefix}/driver-location/polygon/`)
		const listDriversForPolygonLambda = new ListDriversForPolygonLambda(restApi, 'ListDriversForPolygonLambda', {
			dependencies: {
				vpc,
				lambdaSecurityGroups,
				redisCluster,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.redisClientLayer,
					lambdaLayers.openSearchClientLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
				geoPolygonTable,
				openSearchDomain,
			},
		})
		restApi.addFunctionToResource(listDriversForPolygonWithIdEndpoint, {
			function: listDriversForPolygonLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				authorizer: cognitoAuthorizer,
			},
		})
		restApi.addFunctionToResource(listDriversForPolygonEndpoint, {
			function: listDriversForPolygonLambda,
			httpMethod: HTTPMethod.POST,
			methodOptions: {
				authorizer: cognitoAuthorizer,
			},
		})

		const listDriversForPolygonWithIdEndpointInternal = restApi.addResourceWithAbsolutePath(`${apiPrefix}/internal/driver-location/polygon/{polygonId}`)
		const listDriversForPolygonEndpointInternal = restApi.addResourceWithAbsolutePath(`${apiPrefix}/internal/driver-location/polygon/`)
		restApi.addFunctionToResource(listDriversForPolygonWithIdEndpointInternal, {
			function: listDriversForPolygonLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				apiKeyRequired: true,
			},
		})
		restApi.addFunctionToResource(listDriversForPolygonEndpointInternal, {
			function: listDriversForPolygonLambda,
			httpMethod: HTTPMethod.POST,
			methodOptions: {
				apiKeyRequired: true,
			},
		})

		this.queryDrivers = queryDriversLambda

		const getDemAreaSettingsEndpointInternal = restApi.addResourceWithAbsolutePath(`${apiPrefix}/internal/dem-area-settings`)
		const getDemAreaSettingsLambda = new GetDemAreaSettingsLambda(this, 'GetDemAreaSettingsLambda', {
			dependencies: {
				vpc,
				lambdaSecurityGroups,
				lambdaLayers: [
					lambdaLayers.lambdaUtilsLayer,
					lambdaLayers.lambdaInsightsLayer,
				],
				demographicAreaDispatchSettings,
			},
		})
		restApi.addFunctionToResource(getDemAreaSettingsEndpointInternal, {
			function: getDemAreaSettingsLambda,
			httpMethod: HTTPMethod.GET,
			methodOptions: {
				apiKeyRequired: true,
			},
		})
	}
}
