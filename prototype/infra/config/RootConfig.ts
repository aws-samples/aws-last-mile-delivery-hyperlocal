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
import { BackendStackProps } from '../lib/stack/root/BackendStack'
import { DebugStackProps } from '../lib/stack/root/DebugStack'
import { PersistentBackendStackProps } from '../lib/stack/root/PersistentBackendStack'
import { SimulatorMainStackProps } from '../lib/stack/root/SimulatorMainStack'
import { SimulatorPersistentStackProps } from '../lib/stack/root/SimulatorPersistentStack'
import { ExternalProviderStackProps } from '../lib/stack/root/ExternalProviderStack'

export type RootConfig =
Omit<
    PersistentBackendStackProps
    & BackendStackProps
    & DebugStackProps
    & SimulatorMainStackProps
    & SimulatorPersistentStackProps
    & ExternalProviderStackProps
    , 'persistent' | 'backend'
>

export default RootConfig
