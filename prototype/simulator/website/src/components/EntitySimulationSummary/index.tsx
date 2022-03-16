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
import React, { useState } from 'react'
import Container from 'aws-northstar/layouts/Container'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Box from 'aws-northstar/layouts/Box'
import Button from 'aws-northstar/components/Button'
import KeyValuePair from 'aws-northstar/components/KeyValuePair'
import Inline from 'aws-northstar/layouts/Inline'
import Heading from 'aws-northstar/components/Heading'
import Badge from 'aws-northstar/components/Badge'
import Popover from 'aws-northstar/components/Popover'
import MarkdownViewer from 'aws-northstar/components/MarkdownViewer'
import { Stop } from '@material-ui/icons'
import { EntityDetailsTableComponent, IEntityDetails } from '../EntityDetailsComponent'
import utils from '../../utils'
import dayjs from '../../utils/daysjs'

type Map = { [key: string]: unknown, }

export type ISimulation = {
	ID: string
	stats: IEntityDetails[]
	taskArnPrefix: string
	failures: string[]
	updatedAt: number
	tasks: string[]
	createdAt: number
	state: string
	containerBatchSize: number
}

export type EntitySimulationSummaryProps = {
  simulation: ISimulation
	extraProps?: string[]
	entityName: string
  onStop?: (simulation: ISimulation) => void
}

const mapTasksWithArn = (taskArnPrefix: string, tasks: string[]) => {
	return (tasks || []).map(q => `${taskArnPrefix}/${q}`)
}

const EntitySimulationSummary: React.FC<EntitySimulationSummaryProps> = ({
	entityName,
	simulation,
	onStop,
	extraProps = [],
}) => {
	return (
		<Container
			key={simulation.ID}
			headingVariant='h2'
			title={`Simulation #${simulation.ID}`}
			style={{ marginTop: '25px', minWidth: '100%' }}
			actionGroup={
				<Inline spacing='m'>
					<Badge content={simulation.state} color={utils.mapStatusToColor(simulation.state)} />
				</Inline>
			}
			footerContent={
				<Button
					variant="primary"
					icon={Stop}
					onClick={() => onStop && onStop(simulation)}
					disabled={simulation.state !== 'RUNNING'}
				>
          Stop Simulation
				</Button>
			}
		>
			<ColumnLayout>
				<Column>
					<Box style={{ marginBottom: '15px' }}>
						<Heading variant='h3'>Simulation Setup</Heading>
					</Box>
					<EntityDetailsTableComponent
						entityName={entityName}
						entities={simulation.stats}
						renderActions={false}
						renderState={false}
						extraProps={extraProps.map((p) => ({
							key: p,
							value: (simulation as Map)[p] as string,
						}))}
					/>
				</Column>
				<Column>
					<Box style={{ marginBottom: '15px' }}>
						<Heading variant='h3'>Details</Heading>
					</Box>

					<ColumnLayout renderDivider={false}>
						<Column>
							<KeyValuePair label="Created" value={dayjs().to(simulation.createdAt)} />
						</Column>
						<Column key="col3">
							{simulation.state === 'RUNNING' && <KeyValuePair label="Started" value={dayjs(simulation.updatedAt).from(Date.now())} />}
							{simulation.state === 'STOPPED' && <KeyValuePair label="Stopped" value={dayjs(simulation.updatedAt).from(Date.now())} />}
						</Column>
						<Column key="col2">
							{simulation.state === 'RUNNING' && <KeyValuePair label="Duration" value={dayjs(Date.now()).to(simulation.createdAt, true)} />}
							{simulation.state === 'STOPPED' && <KeyValuePair label="Duration" value={dayjs(simulation.updatedAt).to(simulation.createdAt, true)} />}
						</Column>
					</ColumnLayout>
					<Box style={{ marginBottom: '15px' }}>&nbsp;</Box>
					<ColumnLayout renderDivider={false}>
						<Column>
							<KeyValuePair label="Entities per Container" value={simulation.containerBatchSize} />
						</Column>
						<Column>
							<Popover
								position="right"
								size="large"
								triggerType="text"
								content={<MarkdownViewer>{`\`\`\`json\n${JSON.stringify(mapTasksWithArn(simulation.taskArnPrefix, simulation.tasks), null, 2)}\n \`\`\``}</MarkdownViewer>}
							>
								<KeyValuePair label="ECS Tasks" value={(simulation.tasks || []).length} />
							</Popover>
						</Column>
						<Column key="col3">
							<Popover
								position="right"
								size="large"
								triggerType="text"
								content={<MarkdownViewer>{`\`\`\`json\n${JSON.stringify(simulation.failures, null, 2)}\n \`\`\``}</MarkdownViewer>}
							>
								<KeyValuePair label="Start Failures" value={(simulation.failures || []).length} />
							</Popover>
						</Column>
					</ColumnLayout>
				</Column>
			</ColumnLayout>

		</Container>
	)
}

export default EntitySimulationSummary
