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
import { Duration, aws_ec2 as ec2, aws_lambda as lambda, aws_memorydb as memorydb, aws_opensearchservice as opensearchservice } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'
import { DeclaredLambdaFunction, ExposedDeclaredLambdaProps, DeclaredLambdaProps, DeclaredLambdaEnvironment, DeclaredLambdaDependencies } from '@aws-play/cdk-lambda'
import { AllowOpenSearchDelete, AllowOpenSearchWrite, LambdaInsightsExecutionPolicy } from '@prototype/lambda-common'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Environment extends DeclaredLambdaEnvironment {
    readonly MEMORYDB_HOST: string
    readonly MEMORYDB_PORT: string
	readonly DRIVER_LOCATION_UPDATE_TTL_MS: string
	readonly DOMAIN_ENDPOINT: string
}

interface Dependencies extends DeclaredLambdaDependencies {
	readonly vpc: ec2.IVpc
	readonly lambdaSecurityGroups: ec2.ISecurityGroup[]
	readonly memoryDBCluster: memorydb.CfnCluster
	readonly lambdaLayers: lambda.ILayerVersion[]
	readonly driverLocationUpdateTTLInMs: number
	readonly openSearchDomain: opensearchservice.IDomain
}

type TDeclaredProps = DeclaredLambdaProps<Environment, Dependencies>

export class DriverLocationCleanupLambda extends DeclaredLambdaFunction<Environment, Dependencies> {
	constructor (scope: Construct, id: string, props: ExposedDeclaredLambdaProps<Dependencies>) {
		const {
			vpc,
			lambdaSecurityGroups,
			memoryDBCluster,
			lambdaLayers,
			driverLocationUpdateTTLInMs,
			openSearchDomain,
		} = props.dependencies

		const declaredProps: TDeclaredProps = {
			functionName: namespaced(scope, 'DriverLocationCleanup'),
			description: 'Driver Location Cleanup function',
			code: lambda.Code.fromAsset(DeclaredLambdaFunction.getLambdaDistPath(__dirname, '@lambda/driver-location-cleanup.zip')),
			dependencies: props.dependencies,
			timeout: Duration.seconds(30),
			environment: {
				MEMORYDB_HOST: memoryDBCluster.attrClusterEndpointAddress,
				MEMORYDB_PORT: `${memoryDBCluster.attrClusterEndpointPort}`,
				DRIVER_LOCATION_UPDATE_TTL_MS: `${driverLocationUpdateTTLInMs}`,
				DOMAIN_ENDPOINT: openSearchDomain.domainEndpoint,

			},
			layers: lambdaLayers,
			initialPolicy: [
				AllowOpenSearchWrite(openSearchDomain.domainArn),
				AllowOpenSearchDelete(openSearchDomain.domainArn),
			],
			vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
			},
			securityGroups: lambdaSecurityGroups,
		}

		super(scope, id, declaredProps)

		if (this.role) {
			this.role.addManagedPolicy(LambdaInsightsExecutionPolicy())
		}
	}
}
