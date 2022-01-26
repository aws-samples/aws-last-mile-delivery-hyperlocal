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
import React from 'react'
import KeyValuePair from 'aws-northstar/components/KeyValuePair'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Box from 'aws-northstar/layouts/Box'
import dayjs from '../../utils/daysjs'
import { IArea } from '../../pages/NewSimulation'

export type ISimulation = {
  createdAt: number
  updatedAt: number
  areas: IArea[]
  state: string
  procNum: number
}

const SimulationDetail: React.FC<{simulation: ISimulation, }> = ({ simulation: s }): React.ReactElement => (
	<Box marginBottom="25px">
		<ColumnLayout renderDivider={false}>
			<Column key="col1">
				<KeyValuePair label="Created" value={dayjs().to(s.createdAt)} />
			</Column>
			<Column key="col3">
				{s.state === 'RUNNING' && <KeyValuePair label="Started" value={dayjs(s.updatedAt).from(Date.now())} />}
				{s.state === 'STOPPED' && <KeyValuePair label="Stopped" value={dayjs(s.updatedAt).from(Date.now())} />}
			</Column>
			<Column key="col2">
				{s.state === 'RUNNING' && <KeyValuePair label="Duration" value={dayjs(Date.now()).to(s.createdAt, true)} />}
				{s.state === 'STOPPED' && <KeyValuePair label="Duration" value={dayjs(s.updatedAt).to(s.createdAt, true)} />}
			</Column>
			<Column key="col4">
				<KeyValuePair label="Total Drivers" value={s.areas.reduce((a: number, b: any) => a + b.drivers, 0) * (s.procNum || 1)} />
			</Column>
			<Column key="col5">
				<KeyValuePair label="Process/container" value={s.procNum} />
			</Column>
		</ColumnLayout>
	</Box>)

export default SimulationDetail
