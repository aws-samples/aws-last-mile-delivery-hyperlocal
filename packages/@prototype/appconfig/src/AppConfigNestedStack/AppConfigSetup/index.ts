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
import { CfnApplication, CfnEnvironment, CfnConfigurationProfile, CfnHostedConfigurationVersion, CfnDeploymentStrategy, CfnDeployment } from '@aws-cdk/aws-appconfig'
import { namespaced } from '@aws-play/cdk-core'

export interface AppConfigSetupProps {
	readonly driverAppConfig: any
}

export class AppConfigSetup extends Construct {
	readonly deploymentStrategy: CfnDeploymentStrategy

	readonly driverApp: CfnApplication

	readonly driverAppEnvironment: CfnEnvironment

	readonly customerApp: CfnApplication

	constructor (scope: Construct, id: string, props: AppConfigSetupProps) {
		super(scope, id)

		const { driverAppConfig } = props

		// 1. create an application
		const driverApp = new CfnApplication(this, 'DriverAppConfig', {
			name: namespaced(this, 'DeliveryApp'),
			description: 'Delivery App configuration environment',
		})

		const customerApp = new CfnApplication(this, 'CustomerAppConfig', {
			name: namespaced(this, 'CustomerApp'),
			description: 'Customer App configuration environment',
		})

		// 2. create an environments
		const driverAppDevEnv = new CfnEnvironment(this, 'DriverAppDevEnv', {
			applicationId: driverApp.ref,
			name: namespaced(this, 'DriverAppDev'),
			description: 'DriverApp Dev Environment',
		})

		const driverAppProdEnv = new CfnEnvironment(this, 'DriverAppProdEnv', {
			applicationId: driverApp.ref,
			name: namespaced(this, 'DriverAppProd'),
			description: 'DriverApp Prod Environment',
		})

		const customerAppDevEnv = new CfnEnvironment(this, 'CustomerAppDevEnv', {
			applicationId: customerApp.ref,
			name: namespaced(this, 'CustomerAppDev'),
			description: 'Customer App Dev Environment',
		})

		// 3. create configuration profile
		const driverAppHostedConfigProfile = new CfnConfigurationProfile(this, 'DriverAppHostedConfigProfile', {
			applicationId: driverApp.ref,
			name: namespaced(this, 'DriverAppHostedConfigProfile'),
			description: 'Driver App Hosted Configuration Profile',
			locationUri: 'hosted',
		})

		const driverAppConfigVersion = new CfnHostedConfigurationVersion(this, 'DriverAppConfigContent', {
			applicationId: driverApp.ref,
			configurationProfileId: driverAppHostedConfigProfile.ref,
			contentType: 'JSON',
			content: JSON.stringify(driverAppConfig),
			description: 'DriverApp Config',
		})

		// 4. create deployment strategy
		const deploymentStrategy = new CfnDeploymentStrategy(this, 'DeliveryAppDeploymentStrategy', {
			deploymentDurationInMinutes: 0,
			growthFactor: 100,
			growthType: 'LINEAR',
			name: namespaced(this, 'DriverAppImmediateDeployment'),
			replicateTo: 'NONE',
			description: 'DriverApp Deployment Strategy',
		})

		// 5. deploy config
		const deployment = 	new CfnDeployment(this, 'DriverAppDeployment', {
			applicationId: driverApp.ref,
			configurationProfileId: driverAppHostedConfigProfile.ref,
			configurationVersion: driverAppConfigVersion.ref,
			deploymentStrategyId: deploymentStrategy.ref,
			environmentId: driverAppDevEnv.ref,
		})

		this.deploymentStrategy = deploymentStrategy
		this.driverApp = driverApp
		this.customerApp = customerApp
		this.driverAppEnvironment = driverAppDevEnv
	}
}
