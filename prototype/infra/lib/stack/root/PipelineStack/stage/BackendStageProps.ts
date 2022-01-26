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
import { StageProps } from '@aws-cdk/core'
import { BackendStackProps } from '../../BackendStack'
import { DebugStackProps } from '../../DebugStack'
import { PersistentBackendStackProps } from '../../PersistentBackendStack'
import { SimulatorMainStackProps } from '../../SimulatorMainStack'
import { SimulatorPersistentStackProps } from '../../SimulatorPersistentStack'
import { ExternalProviderStackProps } from '../../ExternalProviderStack'

export interface BackendStageProps extends StageProps,
Omit<
    PersistentBackendStackProps
    & BackendStackProps
    & DebugStackProps
    & SimulatorMainStackProps
    & SimulatorPersistentStackProps
    & ExternalProviderStackProps
    , 'persistent' | 'backend'
> {}

export default BackendStageProps
