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
import { Column } from 'aws-northstar/layouts/ColumnLayout'
import { AlertType } from 'aws-northstar/components/Alert'
import LatLongPair, { ILatLong } from '../../components/LatLongPairComponent'
import GeotrackingAPI from '../../api/GeotrackingAPI'
import SimulatorAPI from '../../api/SimulatorAPI'
import { Alert, Box, Button, ColumnLayout, Container, Heading, Input, Inline, Stack, Textarea, FormField, Select, Tabs, LoadingIndicator } from 'aws-northstar'
import { SelectOption } from 'aws-northstar/components/Select'
import MarkdownViewer from 'aws-northstar/components/MarkdownViewer'

declare type IMyAlert ={
	type: AlertType
	message: string
}

const defaultLocation = [{
	lat: -6.183084,
	long: 106.80352,
}, {
	lat: -6.173728,
	long: 106.796824,
}, {
	lat: -6.185903,
	long: 106.841798,
}, {
	lat: -6.211713,
	long: 106.82524,
}]

const boxStyle = {
	background: '#ededed',
}

const shapeOptions = [
	{ label: 'circle', value: 'circle' },
	{ label: 'box', value: 'box' },
]

const unitOptions = [
	{ label: 'm', value: 'm' },
	{ label: 'km', value: 'km' },
	{ label: 'ft', value: 'ft' },
	{ label: 'mi', value: 'mi' },
]

const statusOptions = [
	{ label: 'ANY', value: '' },
	{ label: 'IDLE', value: 'IDLE' },
	{ label: 'ACCEPTED', value: 'ACCEPTED' },
	{ label: 'REJECTED', value: 'REJECTED' },
	{ label: 'CANCELLED', value: 'CANCELLED' },
	{ label: 'PICKING_UP_GOODS', value: 'PICKING_UP_GOODS' },
	{ label: 'ARRIVED_AT_ORIGIN', value: 'ARRIVED_AT_ORIGIN' },
	{ label: 'DELIVERING', value: 'DELIVERING' },
	{ label: 'ARRIVED_AT_DESTINATION', value: 'ARRIVED_AT_DESTINATION' },
	{ label: 'DELIVERED', value: 'DELIVERED' },
]

const DriverQuery: React.FC = () => {
	const [alert, setAlert] = useState<IMyAlert>()
	const [driverId, setDriverId] = useState<string>()
	const [latLong, setLatLong] = useState<ILatLong>()
	const [apiResult, setApiResult] = useState<string>('')
	const [radius, setRadius] = useState<number>(200)
	const [width, setWidth] = useState<number>(200)
	const [height, setHeight] = useState<number>(200)
	const [count, setCount] = useState<number>(25)
	const [startFrom, setStartFrom] = useState<number>(0)
	const [duOption, setDuOption] = useState<SelectOption>(unitOptions[0])
	const [shape, setShape] = useState<SelectOption>(shapeOptions[0])
	const [statusOption, setStatusOption] = useState<SelectOption>(statusOptions[0])
	const [polygonIdOption, setPolygonIdOption] = useState<SelectOption>()
	const [polygons, setPolygons] = useState<any>([])
	const [polygonQuery, setPolygonQuery] = useState<string>(JSON.stringify({ polygon: [{ lat: '', long: '' }, { lat: '', long: '' }], startFrom: 0, count: 25 }, null, 2))
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		const loadData = async () => {
			setLoading(true)
			try {
				const pol = await SimulatorAPI.getPolygons()

				setPolygons(pol.data.Items)
			} catch (err) {
				console.log(err)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [])

	const setLocation = (idx: number) => {
		const location = defaultLocation[idx]
		setLatLong(location)
	}

	const getById = async () => {
		if (driverId == null || driverId === '') {
			setAlert({
				message: 'Driver ID can\'t be empty',
				type: 'error',
			})

			return
		}

		try {
			setLoading(true)
			const driver = await GeotrackingAPI.getDriverById(driverId)

			setApiResult(JSON.stringify(driver, null, 2))
		} catch (err) {
			setApiResult(JSON.stringify(err, null, 2))
		} finally {
			setLoading(false)
		}
	}

	const queryDrivers = async () => {
		if (latLong?.lat == null || latLong.long == null || duOption == null) {
			setAlert({ message: 'Lat/long/radius/dist.unit all needed', type: 'error' })

			return
		}

		setLoading(true)
		try {
			const { lat, long } = latLong
			const drivers = await GeotrackingAPI.queryDrivers({
				lat,
				long,
				distance: radius,
				distanceUnit: duOption.value,
				status: statusOption.value === '' ? undefined : statusOption.value,
				count,
				shape: shape.value,
				width: shape.value !== 'circle' ? width : undefined,
				height: shape.value !== 'circle' ? height : undefined,
			})

			setApiResult(JSON.stringify(drivers, null, 2))
		} catch (err) {
			setApiResult(JSON.stringify(err, null, 2))
		} finally {
			setLoading(false)
		}
	}

	const getByPolygonId = async () => {
		if (polygonIdOption == null || polygonIdOption.value == null) {
			setAlert({ message: 'Select a polygon', type: 'error' })

			return
		}
		try {
			setLoading(true)
			const drivers = await GeotrackingAPI.queryByPolygonId(polygonIdOption.value, startFrom, count)

			setApiResult(JSON.stringify(drivers, null, 2))
		} catch (err) {
			setApiResult(JSON.stringify(err, null, 2))
		} finally {
			setLoading(false)
		}
	}

	const getByPolygonJson = async () => {
		if (polygonQuery === '') {
			setAlert({ message: 'Polygon JSON bad format', type: 'error' })

			return
		}
		let polygonJson
		try {
			polygonJson = JSON.parse(polygonQuery)
		} catch {
			setAlert({ message: 'Polygon JSON bad format', type: 'error' })

			return
		}

		setLoading(true)
		try {
			const drivers = await GeotrackingAPI.queryByPolygonJson(polygonJson)

			setApiResult(JSON.stringify(drivers, null, 2))
		} catch (err) {
			setApiResult(JSON.stringify(err, null, 2))
		} finally {
			setLoading(false)
		}
	}

	const byIdQueryContent = (
		<Box style={boxStyle} p={1} display='flex' flexDirection='column' width='100%'>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Input name='driverId' placeholder='Driver ID' type='text' onChange={(e) => setDriverId(e.trim())} />
			</Box>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Button variant='primary' onClick={getById} disabled={loading}>Get by ID {loading && <LoadingIndicator />}</Button>
			</Box>
		</Box>
	)

	const filterQueryContent = (
		<Box style={boxStyle} p={1} display='flex' flexDirection='column' width='100%'>
			<Box display='flex' flexDirection='column' width='100%' p={1}>
				<LatLongPair onChange={(v: ILatLong) => setLatLong(v)} value={latLong} />
				<Box display='flex' flexDirection='row' width='100%'>
					<Button variant='link' size='small' onClick={() => setLocation(0)}>Loc 1</Button>
					<Button variant='link' size='small' onClick={() => setLocation(1)}>Loc 2</Button>
					<Button variant='link' size='small' onClick={() => setLocation(2)}>Loc 3</Button>
					<Button variant='link' size='small' onClick={() => setLocation(3)}>Loc 4</Button>
				</Box>
			</Box>
			<Box display='flex' flexDirection='row' width='100%'>
				<FormField
					label='Shape'
					controlId='shape'
				>
					<Select
						placeholder='Type of shape'
						options={shapeOptions}
						selectedOption={shape}
						onChange={e => {
							const value = e.target.value as string
							setShape(shapeOptions.find(o => o.value === value) || shapeOptions[0])
						}
						}
					/>
				</FormField>
				<FormField
					label='Dist unit'
					controlId='unit'
				>
					<Select
						placeholder='Distance unit'
						options={unitOptions}
						selectedOption={duOption}
						onChange={e => {
							const value = e.target.value as string
							setDuOption(unitOptions.find(o => o.value === value) || unitOptions[0])
						}
						}
					/>
				</FormField>
				<FormField
					label='Status'
					controlId='status'
				>
					<Select
						placeholder='Status'
						options={statusOptions}
						selectedOption={statusOption}
						onChange={e => {
							const value = e.target.value as string
							setStatusOption(statusOptions.find(o => o.value === value) || statusOptions[0])
						}
						}
					/>
				</FormField>
				<FormField
					label='Max Items'
					controlId='max'
				>
					<Input
						type='number'
						controlId='max'
						onChange={(r) => setCount(Number(r))}
						value={count}
					/>
				</FormField>
			</Box>
			<Box display='flex' flexDirection='row'>
				{shape.value === 'circle' &&
					<FormField
						label='Radius'
						controlId='radius'
					>
						<Input
							type='number'
							controlId='radius'
							onChange={(r) => setRadius(Number(r))}
							value={radius}
						/>
					</FormField>
				}
				{shape.value === 'box' &&
				(<>
					<FormField
						label='Width'
						controlId='width'
					>
						<Input
							type='number'
							controlId='width'
							onChange={(r) => setWidth(Number(r))}
							value={width}
						/>
					</FormField>
					<FormField
						label='Height'
						controlId='height'
					>
						<Input
							type='number'
							controlId='height'
							onChange={(r) => setHeight(Number(r))}
							value={height}
						/>
					</FormField>
				</>
				)}
			</Box>

			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Button variant='normal' onClick={queryDrivers} disabled={loading}>Query{loading && <LoadingIndicator />}</Button>
			</Box>
		</Box>
	)

	const polygonOptions = polygons.map((p: any) => ({ label: `${p.name} (${p.ID})`, value: p.ID }))

	const byPolygonIdQueryContent = (
		<Box style={boxStyle} p={1} display='flex' flexDirection='column' width='100%'>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Select
					placeholder='Pick a saved polygon'
					options={polygonOptions}
					selectedOption={polygonIdOption}
					onChange={e => {
						const value = e.target.value as string
						setPolygonIdOption(polygonOptions.find((o: any) => o.value === value))
					}
					}
				/>
			</Box>
			<Box display='flex' flexDirection='row' width='100%' p={1}>

				<FormField
					label='Start from'
					controlId='startFrom'
				>
					<Input
						type='number'
						controlId='startFrom'
						onChange={(r) => setStartFrom(Number(r))}
						value={startFrom}
					/>
				</FormField>

				<FormField
					label='Max Items'
					controlId='max'
				>
					<Input
						type='number'
						controlId='max'
						onChange={(r) => setCount(Number(r))}
						value={count}
					/>
				</FormField>
			</Box>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Button variant='primary' onClick={getByPolygonId} disabled={loading}>Get by Polygon ID</Button>
				{loading && <LoadingIndicator />}
			</Box>
		</Box>
	)

	const byPolygonQueryContent = (
		<Box style={boxStyle} p={1} display='flex' flexDirection='column' width='100%'>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Textarea
					rows={11}
					value={polygonQuery}
					onChange={e => setPolygonQuery(e.target.value)}
				/>
			</Box>
			<Box display='flex' flexDirection='row' width='100%' p={1}>
				<Button variant='primary' onClick={getByPolygonJson} disabled={loading}>Get by Polygon JSON</Button>
				{loading && <LoadingIndicator />}
			</Box>
		</Box>
	)

	const tabs = [
		{
			label: 'By ID',
			id: 'byId',
			content: byIdQueryContent,
		},
		{
			label: 'Filter query',
			id: 'filterQuery',
			content: filterQueryContent,
		},
		{
			label: 'By Polygon ID',
			id: 'byPolygonIdQuery',
			content: byPolygonIdQueryContent,
		},
		{
			label: 'By Polygon JSON',
			id: 'byPolygonQuery',
			content: byPolygonQueryContent,
		},
	]

	return (
		<>
			<Container
				headingVariant='h2'
				title='Query Drivers'
				style={{ marginTop: '25px' }}
			>
				{alert &&
				<Stack>
					<ColumnLayout>
						<Column>
							<Alert type={alert.type as AlertType} onDismiss={() => setAlert(undefined)} dismissible>{alert.message}</Alert>
						</Column>
					</ColumnLayout>
				</Stack>
				}

				<ColumnLayout>
					<Column>
						<Box width='100%'>
							<Tabs tabs={tabs} />
						</Box>
					</Column>
					<Column>
						<Box display='flex' flexDirection='row' width='100%' height='100%'>
							<MarkdownViewer>{`\`\`\`json\n${apiResult}\n \`\`\``}</MarkdownViewer>
							{/* <Textarea
								rows={20}
								value={apiResult}
							/> */}
						</Box>
					</Column>
				</ColumnLayout>
			</Container>
		</>
	)
}

export default DriverQuery
