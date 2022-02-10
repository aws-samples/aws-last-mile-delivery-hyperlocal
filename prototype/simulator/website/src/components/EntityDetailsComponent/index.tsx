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
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'
import KeyValuePair from 'aws-northstar/components/KeyValuePair'
import Button from 'aws-northstar/components/Button'
import Alert from 'aws-northstar/components/Alert'
import { ILatLong } from '../LatLongPairComponent'
import utils from '../../utils'
import { Remove, Refresh, PlayArrow } from '@material-ui/icons'

export type IEntityDetails = ILatLong & {
	ID: string
  area: string
	radius: number
  batchSize: number
	state: string
}

export type IEntityDetailsComponent = {
  renderFooter?: boolean
  entityName: string
  entities?: IEntityDetails[]
  onRemove?: (entity: IEntityDetails) => void
  onStart?: () => void
  onRefresh?: () => void
}

export type IEntityDetailsTableComponent = {
  renderActions?: boolean
  renderState?: boolean
  entityName: string
  entities?: IEntityDetails[]
	extraProps?: {
		key: string
		value: string
	}[]
  onRemove?: (entity: IEntityDetails) => void
}

export const EntityDetailsTableComponent: React.FC<IEntityDetailsTableComponent> = ({
	entityName,
	entities,
	onRemove,
	renderActions,
	renderState,
	extraProps = [],
}) => {
	return (
		<>
			<table style={{ width: '100%' }}>
				<thead>
					<tr style={{ textAlign: 'left' }}>
						<th>Area</th>
						<th>Lat</th>
						<th>Long</th>
						<th>Radius</th>
						<th>{entityName} #</th>
						{renderState && <th>State</th>}
						{renderActions && <th>Actions</th>}
					</tr>
				</thead>
				<tbody>
					{entities && entities.map((a, idx) => (
						<tr key={`tr-${idx}`}>
							<td>{a.area}</td>
							<td>{a.lat}</td>
							<td>{a.long}</td>
							<td>{a.radius}</td>
							<td>{a.batchSize}</td>
							{renderState && <td>{a.state}</td>}
							{renderActions &&
							<td>
								<Button
									variant='icon'
									icon={Remove}
									onClick={() => onRemove && onRemove(a)}
								/>
							</td>
							}
						</tr>
					))}
					<tr>
						<td colSpan={4} style={{ textAlign: 'right' }}>
							<strong>Total {entityName}:</strong>
						</td>
						<td>
							<strong>{entities && entities.reduce((acc, curr) => acc + curr.batchSize, 0)}</strong>
						</td>
					</tr>
				</tbody>
			</table>
			{extraProps.length > 0
				? <Inline>
					{extraProps.map((q, idx) => <KeyValuePair key={idx} label={utils.camelCaseToWords(q.key)} value={q.value} />)}
				</Inline>
				: <></>
			}
		</>
	)
}

const EntityDetailsComponent: React.FC<IEntityDetailsComponent> = ({
	entityName,
	entities = [],
	renderFooter = false,
	onRefresh,
	onRemove,
	onStart,
}) => {
	return (
		<Container
			headingVariant='h2'
			title={`${entityName} Stats`}
			style={{ marginTop: '25px', minWidth: '100%' }}
			actionGroup={
				<Button
					variant='icon'
					icon={Refresh}
					onClick={onRefresh}
				/>
			}
			footerContent={renderFooter &&
				<Button
					variant="primary"
					icon={PlayArrow}
					onClick={onStart}
				>
          Start Simulation
				</Button>
			}
		>
			{!!entities.length &&
				<EntityDetailsTableComponent
					entityName={entityName}
					entities={entities}
					renderActions={true}
					renderState={true}
					onRemove={onRemove}
				/>
			}
			{entities.length === 0 && <Alert type='info'>There are not {entityName} available, please proceed by generating them</Alert>}
		</Container>
	)
}

export default EntityDetailsComponent
