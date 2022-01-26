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
import utils from '../../utils'
import Container from 'aws-northstar/layouts/Container'
import Box from 'aws-northstar/layouts/Box'
import Inline from 'aws-northstar/layouts/Inline'
import Badge from 'aws-northstar/components/Badge'
import Alert from 'aws-northstar/components/Alert'
import Heading from 'aws-northstar/components/Heading'
import AreaComponent from '../AreaComponent'
import SimulationDetail from '../SimulationDetail'
import { IArea } from '../../pages/NewSimulation'
import { Stack } from 'aws-northstar'

export type ISimulation = {
  createdAt: number
  updatedAt: number
  areas: IArea[]
  state: string
  name: string
  ID: string
  taskArnPrefix: string
  tasks: string[]
  failures: string[]
  procNum: number
}

export type ISimulationAction = {
	simulation: ISimulation
	actions: React.ReactElement
	showDetails: boolean
}

export type ISimulationCotainer = ISimulation & ISimulationAction

const SimulationContainer: React.FC<ISimulationAction> = ({
	simulation: s,
	actions,
	showDetails,
}): React.ReactElement => (
	<Container
		headingVariant='h2'
		title={s.name}
		style={{ marginTop: '25px' }}
		actionGroup={
			<Inline spacing='m'>
				<Badge content={s.state} color={utils.mapStatusToColor(s.state)} />
			</Inline>}
		footerContent={actions}
	>
		<Box marginBottom="25px">
			<Heading variant='h4'>Details</Heading>
		</Box>
		<SimulationDetail simulation={s} />

		<hr className="MuiDivider-root makeStyles-divider-49" />
		{showDetails && (
			<>
				<Box marginBottom="25px">
					<Heading variant='h4'>Tasks Arn</Heading>
				</Box>
				{s.tasks && s.tasks.length > 100 && (
					<Alert>There are {s.tasks.length} tasks, the UI shows the top 100</Alert>
				)}
				{s.tasks && s.tasks.slice(0, 100).map((taskId: string, idx: number) => (
					<p key={idx}>{s.taskArnPrefix}/{taskId}</p>
				))}

				<Box marginBottom="25px">
					<Heading variant='h4'>Errors</Heading>
				</Box>
				{s.failures && s.failures.length > 100 && (
					<Alert>There are {s.failures.length} failures, the UI shows the top 10</Alert>
				)}
				{ s.failures && s.failures.slice(0, 100).map((err: string, idx: number) => (
					<p key={idx}>{typeof err === 'string' ? err : JSON.stringify(err)}</p>
				))}
			</>
		)}

		<Box marginBottom="25px">
			<Heading variant='h4'>Areas</Heading>
		</Box>
		{utils.groupAreas(s.areas, showDetails ? 0 : 2).map((g, idx) => (
			<>
				<Stack key={idx}>
					{g.map((e: any, elx: number) => (
						<AreaComponent key={`el-${elx}`} area={e} />
					))}
				</Stack>
				{idx !== utils.groupAreas(s.areas, showDetails ? 0 : 2).length - 1 && <hr className="MuiDivider-root makeStyles-divider-49" />}
			</>))}
	</Container>
)

export default SimulationContainer
