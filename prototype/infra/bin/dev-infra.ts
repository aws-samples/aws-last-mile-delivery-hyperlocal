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
import { App, Tags } from 'aws-cdk-lib'
import config from '../config'
import { BackendStack } from '../lib/stack/root/BackendStack'
import { PersistentBackendStack } from '../lib/stack/root/PersistentBackendStack'
import { SimulatorMainStack } from '../lib/stack/root/SimulatorMainStack'
import { SimulatorPersistentStack } from '../lib/stack/root/SimulatorPersistentStack'
import { DebugStack } from '../lib/stack/root/DebugStack'
import { ExternalProviderStack } from '../lib/stack/root/ExternalProviderStack'

const app = new App()

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

const debugStack = new DebugStack(app, 'Dev-DebugStack', {
	stackName: 'Dev-DebugStack',
	description: 'Debug resources',
	persistent: persistentBackendStack,
	...config,
})

const simulatorPersistentStack = new SimulatorPersistentStack(app, 'Simulator-Persistent', {
	stackName: 'Simulator-Persistent',
	persistent: persistentBackendStack,
	backend: backendStack,
	...config,
	namespace: 'sim',
})

const simulatorMainStack = new SimulatorMainStack(app, 'Simulator-Backend', {
	stackName: 'Simulator-Backend',
	description: 'Simulator Stack',
	persistent: persistentBackendStack,
	backend: backendStack,
	...config,
	simulatorPersistent: simulatorPersistentStack,
	namespace: 'sim',
})

const externalProver = new ExternalProviderStack(app, 'ExternalProviderStack-Mock', {
	stackName: 'ExternalProviderStack-Mock',
	description: 'External Provider Mock Stack',
	...config,
	namespace: 'external',
})

Tags.of(app).add('proto:deployment:id', `${config.namespace}-lastmiledelivery-deployment`)
