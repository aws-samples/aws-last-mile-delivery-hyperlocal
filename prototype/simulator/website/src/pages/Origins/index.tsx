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
import React, { useEffect, useState } from 'react'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Box from 'aws-northstar/layouts/Box'
import Alert, { AlertType } from 'aws-northstar/components/Alert'
import Button from 'aws-northstar/components/Button'
import LoadingIndicator from 'aws-northstar/components/LoadingIndicator'
import GenerateEntityComponent, { IEntity } from '../../components/GenerateEntityComponent'
import EntityDetailsComponent, { IEntityDetails } from '../../components/EntityDetailsComponent'
import EntitySimulationSummary, { ISimulation } from '../../components/EntitySimulationSummary'
import OriginAdditionalInputs, { IAdditionalInputResults } from '../../components/OriginAdditionalInputs'
import utils from '../../utils'
import OriginsAPI from '../../api/Origins'

const Origins: React.FC = () => {
	const [alert, setAlert] = useState<any>()
	const [modalVisible, setModalVisible] = useState(false)
	const [loading, setLoading] = useState(false)
	const [refreshStats, setRefreshStats] = useState(1)
	const [refreshSimulations, setRefreshSimulations] = useState(1)
	const [stats, setStats] = useState<any>([])
	const [simulations, setSimulations] = useState<any>([])

	useEffect(() => {
		const getStats = async () => {
			setLoading(true)
			const res = await OriginsAPI.getOriginsStats()

			setStats(res.data)
			setLoading(false)
		}

		getStats()
	}, [refreshStats])

	useEffect(() => {
		const getSimulations = async () => {
			setLoading(true)
			const res = await OriginsAPI.getOriginsSimulations()

			setSimulations(res.data)
			setLoading(false)
		}

		getSimulations()
	}, [refreshSimulations])

	useEffect(() => {
		setRefreshStats((old) => old + 1)
		setRefreshSimulations((old) => old + 1)
	}, [])

	const generateOrigins = async (attrs: IEntity) => {
		const area = utils.getAreaCodeFromCoords(attrs.coordinates?.lat as number, attrs.coordinates?.long as number)
		await OriginsAPI.generateOrigins(attrs, area as string)

		setRefreshStats((old) => old + 1)
	}

	const startSimulator = async (data: IAdditionalInputResults) => {
		try {
			await OriginsAPI.startSimulator(data.rejectionRate)

			setModalVisible(false)
			setRefreshSimulations((old) => old + 1)
		} catch (err: any) {
			setAlert({
				type: 'error',
				message: err.response.data.error,
			})
		}
	}

	const stopSimulation = async (simulation: ISimulation) => {
		try {
			await OriginsAPI.stopSimulator(simulation.ID)

			setRefreshSimulations((old) => old + 1)
		} catch (err) {
			setAlert({
				type: 'error',
				message: 'Error stopping the simulation',
			})
		}
	}

	const deleteOrigins = async (item: IEntityDetails) => {
		try {
			await OriginsAPI.deleteOriginStats(item.ID)
			setRefreshStats((old) => old + 1)
		} catch (err: any) {
			setAlert({
				type: 'error',
				message: err.response && err.response.data ? err.response.data.message : 'Error deleting the Origins',
			})
		}
	}

	return (
		<>
			<ColumnLayout>
				<Column key="c1">
					{alert &&
					<ColumnLayout>
						<Column>
							<Alert type={alert.type as AlertType} dismissible onDismiss={() => setAlert(undefined)}>{alert.message}</Alert>
						</Column>
					</ColumnLayout>
					}
					<EntityDetailsComponent
						entities={stats}
						entityName='Origins'
						renderFooter={true}
						onRefresh={() => setRefreshStats((old) => old + 1)}
						onStart={() => setModalVisible(true)}
						onRemove={deleteOrigins}
					/>
				</Column>
				<Column key="c2">
					<GenerateEntityComponent entityName="Origins" onGenerate={generateOrigins} />
				</Column>
			</ColumnLayout>
			<Box textAlign='right'><Button disabled={loading} icon='refresh' onClick={() => setRefreshSimulations((old) => old + 1)}>Refresh</Button></Box>
			{loading && <LoadingIndicator size='large' />}
			{simulations && utils.sortByCreationDateDesc(simulations).map((sim: any, idx) => (<>
				<EntitySimulationSummary
					key={`sim-${idx}`}
					simulation={sim}
					onStop={stopSimulation}
					extraProps={['rejectionRate']}
				/>
			</>))}
			<OriginAdditionalInputs
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onAccept={startSimulator}
			/>
		</>
	)
}

export default Origins
