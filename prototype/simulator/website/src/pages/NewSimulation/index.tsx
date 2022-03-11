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
import { useHistory } from 'react-router-dom'
import Container from 'aws-northstar/layouts/Container'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Flashbar, { FlashbarMessage } from 'aws-northstar/components/Flashbar'
import Inline from 'aws-northstar/layouts/Inline'
import Box from 'aws-northstar/layouts/Box'
import Button from 'aws-northstar/components/Button'
import FormField from 'aws-northstar/components/FormField'
import Input from 'aws-northstar/components/Input'
import Heading from 'aws-northstar/components/Heading'
import { ArrowBackIos, Add, Remove, PlayArrow } from '@material-ui/icons'
import SimulatorAPI from '../../api/SimulatorAPI'
import utils from '../../utils'

export type IArea = {
	lat?: number
	long?: number
	range?: number
	drivers?: number
}

export type AreaKey = keyof IArea

const NewSimulation: React.FC = () => {
	const [notifications, setNotifications] = useState<FlashbarMessage[]>([])
	const [areas, setAreas] = useState<IArea[]>([{}])
	const [procNum, setProcNum] = useState<number>(1)
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const history = useHistory()

	const setAreaField = (idx: number, field: AreaKey, value: number) => {
		const a = [...areas]
		a[idx][field] = value

		setAreas(a)
	}

	const handleBackButton = () => {
		history.push('/drivers')
	}

	const addNewArea = () => {
		setAreas((old) => [...old, {}])
	}

	const removeIdx = (idx: number) => {
		const a = [...areas]
		a.splice(idx, 1)

		setAreas(a)
	}

	const setArea = (idx: number) => {
		setAreaField(areas.length - 1, 'lat', utils.DEFAULT_AREAS[idx].lat)
		setAreaField(areas.length - 1, 'long', utils.DEFAULT_AREAS[idx].long)
	}

	const createNewSimulation = async () => {
		let missing = false
		areas.forEach(element => {
			if (!element.drivers || !element.lat || !element.long || !element.range) {
				missing = true
			}
		})

		if (missing || !name) {
			setNotifications((old): FlashbarMessage[] => [...old, {
				type: 'warning',
				header: 'Missing fields',
				content: 'All items are required',
				dismissible: true,
			}])

			return
		}

		try {
			setLoading(true)
			await SimulatorAPI.createSimulation(name, areas, procNum)

			handleBackButton()
		} catch (err) {
			console.error(err)

			setNotifications((old): FlashbarMessage[] => [...old, {
				type: 'error',
				header: 'Error',
				content: 'Error starting the simulation, please try again',
				dismissible: true,
			}])
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Flashbar items={notifications} />
			<Container
				headingVariant='h2'
				title='Create new Simulation'
				style={{ marginTop: '25px' }}
				footerContent={
					<Inline spacing='s'>
						<Button
							icon={ArrowBackIos}
							onClick={handleBackButton}
						>
							Simulation List
						</Button>
						<Button
							variant="primary"
							icon={PlayArrow}
							onClick={createNewSimulation}
							loading={loading}
						>
							Start Simulation
						</Button>
					</Inline>
				}
			>
				<ColumnLayout>
					<Column key='name'>
						<FormField label="Simulation name" controlId="name">
							<Input type="text" controlId="name" placeholder="Name of the simulation" value={name} onChange={(v) => setName(v)} />
						</FormField>
					</Column>
					<Column key='procNum'>
						<FormField label="Process per container" controlId="procNum">
							<Input type="number" controlId="procNum" placeholder="Process per container" value={procNum} onChange={(v) => setProcNum(parseInt(v, 10))} />
						</FormField>
					</Column>
				</ColumnLayout>
				<Box marginTop="15px">
					<Heading variant='h4'>Areas</Heading>
				</Box>
				{areas.map((a, idx) => (
					<Box marginTop="10px" key={idx}>
						<ColumnLayout renderDivider={false}>
							<Column key="column1">
								<FormField label="Latitude" controlId="lat">
									<Input
										type="number"
										controlId="lat"
										placeholder='eg. 123.45677'
										value={a.lat}
										onChange={(v) => setAreaField(idx, 'lat', Number(v))}
									/>
								</FormField>
							</Column>
							<Column key="column2">
								<FormField label="Longitude" controlId="long">
									<Input
										type="number"
										controlId="long"
										placeholder='eg. 123.45677'
										value={a.long}
										onChange={(v) => setAreaField(idx, 'long', Number(v))}
									/>
								</FormField>
							</Column>
							<Column key="column3">
								<FormField label="Range (m)" controlId="rng">
									<Input
										type="number"
										controlId="rng"
										placeholder='Range in meters'
										value={a.range}
										onChange={(v) => setAreaField(idx, 'range', Number(v))}
									/>
								</FormField>
							</Column>
							<Column key="column4">
								<FormField label="Drivers" controlId="name">
									<Input
										type="number"
										controlId="rng"
										placeholder='Drivers number'
										value={a.drivers}
										onChange={(v) => setAreaField(idx, 'drivers', Number(v))}
									/>
								</FormField>
							</Column>
						</ColumnLayout>
						{idx === areas.length - 1 && (
							<>
								<Box marginTop="10px">
									<Button variant='link' onClick={() => setArea(0)}>Area 1</Button>
									<Button variant='link' onClick={() => setArea(1)}>Area 2</Button>
									<Button variant='link' onClick={() => setArea(2)}>Area 3</Button>
								</Box>
								<Box marginTop="10px">
									<Inline>
										<Button icon={Add} variant="normal" onClick={addNewArea}>Add new item</Button>
										<Button icon={Remove} variant="normal" onClick={() => removeIdx(idx)} disabled={areas.length === 1}>Remove last item</Button>
									</Inline>
								</Box>
							</>
						)}
					</Box>
				))}
			</Container>
		</>
	)
}

export default NewSimulation
