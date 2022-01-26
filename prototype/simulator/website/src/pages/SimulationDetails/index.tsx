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
import { useHistory, useLocation } from 'react-router-dom'
import Inline from 'aws-northstar/layouts/Inline'
import Button from 'aws-northstar/components/Button'
import LoadingIndicator from 'aws-northstar/components/LoadingIndicator'
import SimulationComponent from '../../components/SimulationComponent'
import SimulatorAPI from '../../api/SimulatorAPI'

const SimulationDetails: React.FC = () => {
	const [forceRefresh, setForceRefresh] = useState(1)
	const [data, setData] = useState<any>(null)
	const [loading, setLoading] = useState(false)
	const history = useHistory()
	const location = useLocation()

	const handleBackButton = () => {
		history.push('/drivers')
	}

	useEffect(() => {
		const simulationId = location.pathname.split('/').pop()
		const fetchSimulation = async (id: string) => {
			setLoading(true)
			try {
				const result = await SimulatorAPI.getSimulation(id)

				setData(result.data)
			} catch (err) {
				console.log(err)
			} finally {
				setLoading(false)
			}
		}

		fetchSimulation(simulationId || '')
	}, [location, forceRefresh])

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
			{data && <SimulationComponent
				simulation={data}
				actions={
					<Inline spacing='s'>
						<Button
							icon="ArrowBackIos"
							onClick={handleBackButton}
						>
							Simulation List
						</Button>
						<Button
							variant="primary"
							icon="Stop"
							onClick={() => stopSimulator(data.ID)}
							disabled={data.state === 'STOPPED'}
						>
							Stop Simulation
						</Button>
					</Inline>}
				showDetails={true}
			/>}
		</>
	)
}

export default SimulationDetails
