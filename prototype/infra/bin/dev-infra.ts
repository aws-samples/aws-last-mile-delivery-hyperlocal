#!/usr/bin/env node
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
import 'source-map-support/register'
import { App, Aspects, Tags, aws_autoscaling as autoscaling } from 'aws-cdk-lib'
import config from '../config'
import { BackendStack } from '../lib/stack/root/BackendStack'
import { PersistentBackendStack } from '../lib/stack/root/PersistentBackendStack'
import { SimulatorMainStack } from '../lib/stack/root/SimulatorMainStack'
import { SimulatorPersistentStack } from '../lib/stack/root/SimulatorPersistentStack'
import { DebugStack } from '../lib/stack/root/DebugStack'
import { ExternalProviderStack } from '../lib/stack/root/ExternalProviderStack'
import { CloudFrontWebACLStack } from '../lib/stack/root/CloudFrontWebACLStack'

const app = new App()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const externalProvider = new ExternalProviderStack(app, 'ExternalProviderStack-Mock', {
	stackName: 'ExternalProviderStack-Mock',
	description: 'External Provider Mock Stack',
	...config,
	namespace: 'external',
})

const persistentBackendStack = new PersistentBackendStack(app, 'Dev-PersistentBackend', {
	stackName: 'Dev-PersistentBackend',
	description: 'Persistent Stack for RETAIN resources',
	...config,
})

const backendStack = new BackendStack(app, 'Dev-Backend', {
	stackName: 'Dev-Backend',
	description: 'Backend Stack',
	persistent: persistentBackendStack,
	...config,
})

// add explicit dependency: external providers must be created before this
// so the ssm params are already in place for the external api's urls
backendStack.addDependency(externalProvider)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debugStack = new DebugStack(app, 'Dev-DebugStack', {
	stackName: 'Dev-DebugStack',
	description: 'Debug resources',
	persistent: persistentBackendStack,
	...config,
})

// ---------------------------------------------------------------------------------------------------------------------
// SIMULATOR
const simulatorNamespace = 'sim'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cloudfrontWebACLStack = new CloudFrontWebACLStack(app, 'CloudFrontWebACL', {
	stackName: 'CloudFrontWebACL',
	description: 'CloudFront Web ACL stack',
	webAclName: 'SimulatorCFWebACL',
	webAclArnParameterStoreKey: config.parameterStoreKeys.webAclArn as string,
	ssmParamRegion: config.env?.region as string,
	env: {
		...config.env,
		region: 'us-east-1', // CLOUDFRONT WebACL must be created in us-east-1 region
	},
})

const simulatorPersistentStack = new SimulatorPersistentStack(app, 'Simulator-Persistent', {
	stackName: 'Simulator-Persistent',
	persistent: persistentBackendStack,
	backend: backendStack,
	...config,
	namespace: simulatorNamespace,
})

simulatorPersistentStack.addDependency(cloudfrontWebACLStack)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const simulatorMainStack = new SimulatorMainStack(app, 'Simulator-Backend', {
	stackName: 'Simulator-Backend',
	description: 'Simulator Stack',
	persistent: persistentBackendStack,
	backend: backendStack,
	...config,
	simulatorPersistent: simulatorPersistentStack,
	namespace: simulatorNamespace,
})

// make sure that IMDSv2 is required on instances deployed by AutoScalingGroups
const asgImdsv2Required = new autoscaling.AutoScalingGroupRequireImdsv2Aspect()
Aspects.of(app).add(asgImdsv2Required)

// tag all deployed resources
Tags.of(app).add('proto:deployment:id', `${config.namespace}-lastmiledelivery-deployment`)
