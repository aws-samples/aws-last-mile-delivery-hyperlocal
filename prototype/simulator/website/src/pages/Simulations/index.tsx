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
import { useHistory } from 'react-router-dom'
import Box from 'aws-northstar/layouts/Box'
import Inline from 'aws-northstar/layouts/Inline'
import Button from 'aws-northstar/components/Button'
import LoadingIndicator from 'aws-northstar/components/LoadingIndicator'
import { Add, Details, Stop } from '@material-ui/icons'
import SimulatorAPI from '../../api/SimulatorAPI'
import SimulationComponent from '../../components/SimulationComponent'
import utils from '../../utils'

const Simulations: React.FC = () => {
	const [simulations, setSimulations] = useState<any>([])
	const [forceRefresh, setForceRefresh] = useState(1)
	const [loading, setLoading] = useState(false)
	const history = useHistory()

	const handleNewSimulation = () => {
		history.push('/drivers/new')
	}
	const handleSimulationDetail = (id: string) => {
		history.push(`/drivers/${id}`)
	}

	useEffect(() => {
		const loadData = async () => {
			setLoading(true)
			try {
				const sim = await SimulatorAPI.getSimulations()

				setSimulations(sim.data)
			} catch (err) {
				console.log(err)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [forceRefresh])

	const stopSimulator = async (id: string) => {
		try {
			await SimulatorAPI.deleteSimulation(id)

			setForceRefresh((old) => old + 1)
		} catch (err) {
			console.log(err)
		}
	}

	return (
		<>
			{loading && <LoadingIndicator size="large" />}
			{!loading && <Box display="flex" alignItems='flex-end' flexDirection='column'>
				<Button icon={Add} variant="primary" onClick={handleNewSimulation}>Add Simulation</Button>
			</Box>}

			{utils.sortByCreationDateDesc(simulations).map((s: any, idx: number) => (
				<SimulationComponent
					key={idx}
					simulation={s}
					actions={
						<Inline spacing='s'>
							<Button
								icon={Details}
								onClick={() => handleSimulationDetail(s.ID)}
							>
							Details
							</Button>
							<Button
								variant="primary"
								icon={Stop}
								onClick={() => stopSimulator(s.ID)}
								disabled={s.state === 'STOPPED'}
							>
							Stop Simulation
							</Button>
						</Inline>}
					showDetails={false}
				/>))}
		</>
	)
}

export default Simulations
