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
/* eslint-disable @typescript-eslint/no-var-requires */

import React, { useCallback, useEffect, useState } from 'react'
import ReactMapGL, { NavigationControl, Source, Layer } from 'react-map-gl'
import * as polyline from '@mapbox/polyline'
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'
import Icon from 'aws-northstar/components/Icon'
import Select from 'aws-northstar/components/Select'
// to fix: https://github.com/visgl/react-map-gl/issues/1266
import mapboxgl from 'mapbox-gl'
import MapPin from '../MapPin'
import OrderAPI from '../../api/OrderAPI'

// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default

declare let appVariables: {
	MAP_BOX_TOKEN: string
}

const navControlStyle = {
	left: 10,
	top: 10,
}

const baseLocation = {
	latitude: -6.177427115234792,
	longitude: 106.8265913307582,
	zoom: 12,
}

type MapInputProps = {
	assignment: any
}

const UNASSIGNEDCOLOR = '#999'
const colorLetters = '0123456789ABCDEF'
const getRandomColor = () => {
	let color = '#'
	for (let i = 0; i < 6; i++) {
		color += colorLetters[Math.floor(Math.random() * 16)]
	}

	return color
}
const SELECTALL = { label: 'Show all', value: 'all' }
const DESELECTALL = { label: 'Show none', value: 'none' }

const AssignmentMap: React.FC<MapInputProps> = ({ assignment }) => {
	const [assignmentData, setAssignmentData] = useState<any>([])
	const [viewport, setViewport] = useState({
		width: '100%',
		height: 800,
		...baseLocation,
	})
	const [originPins, setOriginPins] = useState<any>([])
	const [orderRoutes, setOrderRoutes] = useState<any>([])
	const [destinationPins, setDestinationPins] = useState<any>([])
	const [routeLines, setRouteLines] = useState<any>([])
	const [selectOptions, setSelectOptions] = useState<any>([])
	const [selectedOption, setSelectedOption] = useState<any>(SELECTALL)

	useEffect(() => {
		const queryOrders = async () => {
			try {
				if (!assignmentData || assignmentData.length === 0) {
					return
				}

				const idList = assignmentData.map((q: any) => q.orders).flat()
				const routes = await OrderAPI.getOrderRoutes(idList.join(','))

				setOrderRoutes(routes.data.orderRoutes)
			} catch (err) {
				console.error('Error querying orders!')
				console.error(err)
			}
		}

		queryOrders()
	}, [assignmentData])

	useEffect(() => {
		const data = assignment == null
			? []
			: assignment.assigned.map((d: any) => {
				if (selectedOption.value === 'all' || d.driverId === selectedOption.value) {
					let color = getRandomColor()

					if (d.orders.length === 0) {
						color = UNASSIGNEDCOLOR
					}

					return { ...d, color }
				} else {
					return null
				}
			})

		setAssignmentData(data.filter((q: any) => q !== null))
	}, [assignment, selectedOption])

	useEffect(() => {
		const _viewPort = {
			width: '100%',
			height: 800,
			latitude: assignment == null ? baseLocation.latitude : assignment.assigned[0].driverLocation.lat,
			longitude: assignment == null ? baseLocation.longitude : assignment.assigned[0].driverLocation.long,
			zoom: 12,
		}
		setViewport(_viewPort)
	}, [assignment])

	useEffect(() => {
		const routes = assignmentData.map(({ route, driverId, color }: any) =>
			route.map((r: any) => ({ driverId, color, ...r })),
		).flat()

		const _routeLines = assignmentData.map((d: any) => {
			if (selectedOption.value === 'all' || d.driverId === selectedOption.value) {
				return d.orders.map((o: any, idx: number) => {
					if (orderRoutes[o] != null) {
						return orderRoutes[o].map((oRoute: any, i: number) => {
							const geoJsonData: any = {
								type: 'Feature',
								geometry: polyline.toGeoJSON(oRoute.pathPolyline),
							}

							return {
								geoJsonData,
								color: d.color,
							}
						})
					}

					return null
				})
			} else {
				return null
			}
		})

		const _originPins = routes.filter((q: any) => q.type === 'ORIGIN' && (selectedOption.value === 'all' || q.driverId === selectedOption.value))
		setOriginPins(_originPins)
		const _destinationPins = routes.filter((q: any) => q.type === 'DESTINATION' && (selectedOption.value === 'all' || q.driverId === selectedOption.value))
		setDestinationPins(_destinationPins)
		setRouteLines(_routeLines.flat().flat().filter((q: any) => q !== null))
	}, [assignmentData, orderRoutes, selectedOption])

	useEffect(() => {
		const _options = assignment == null
			? []
			: assignment.assigned.map((d: any) => {
				let u = ''

				if (d.orders.length === 0) {
					u = ' [U]'
				}

				return ({
					label: `Driver ${d.driverId.substr(0, 8)}${u}`,
					value: d.driverId,
				})
			},

			).flat()
		const _selectOptions = [SELECTALL, DESELECTALL, ..._options]
		setSelectOptions(_selectOptions)
	}, [assignment, setSelectOptions])

	const onSelectChange = (e: any) => {
		const newSelected = selectOptions.find((o: any) => o.value === e.target.value)
		setSelectedOption(newSelected)
	}

	const resetDefault = () => {
		setViewport((old) => ({
			...old,
			...baseLocation,
		}))
	}

	const resetColors = () => {
		const data = assignmentData.map((d: any) => {
			let color = getRandomColor()

			if (d.orders.length === 0) {
				color = UNASSIGNEDCOLOR
			}

			return { ...d, color }
		})

		setAssignmentData(data)
	}

	return (
		<Container
			headingVariant='h2'
			title='Map'
			style={{ width: '100%' }}
			actionGroup={
				<Inline>
					<Select
						options={selectOptions}
						selectedOption={selectedOption}
						onChange={onSelectChange}
					/>
					{viewport.latitude} {viewport.longitude} {parseInt(viewport.zoom.toString(), 10)}
					<span onClick={resetDefault} style={{ cursor: 'pointer' }}>
						<Icon name='GpsFixed' />
					</span>
					<span onClick={resetColors} style={{ cursor: 'pointer' }}>
						<Icon name='RefreshTwoTone' />
					</span>
				</Inline>
			}
		>
			<ReactMapGL
				width={viewport.width}
				height={viewport.height}
				latitude={viewport.latitude}
				longitude={viewport.longitude}
				zoom={viewport.zoom}
				mapStyle="mapbox://styles/mapbox/streets-v11"
				mapboxApiAccessToken={appVariables.MAP_BOX_TOKEN}
				onViewportChange={(v: any) => setViewport(v)}
			>
				<NavigationControl style={navControlStyle} showCompass={false} />
				{assignmentData && assignmentData.map((d: any) => (
					<MapPin
						key={d.driverId}
						latitude={d.driverLocation.lat}
						longitude={d.driverLocation.long}
						color={d.color}
						data={d} />
				))}
				{originPins && originPins.map((d: any) => (<MapPin
					key={`${d.driverId}-${d.id}`}
					latitude={d.lat}
					longitude={d.long}
					color={d.color}
					data={{ originId: d.id }}
					iconName='TripOriginOutlined'
				/>))}
				{destinationPins && destinationPins.map((d: any) => (
					<MapPin
						key={`${d.driverId}-${d.id}`}
						latitude={d.lat}
						longitude={d.long}
						color={d.color}
						data={{ destinationId: d.id }}
						iconName='HomeOutlined'
					/>
				))}
				{routeLines && routeLines.map((r: any, idx: number) => (
					<Source key={`route-${idx}`} id={`route-${idx}`} type='geojson' data={r.geoJsonData}>
						<Layer key={`layer-${idx}`} id={`layer-${idx}`} type='line' paint={{
							'line-color': r.color,
							'line-opacity': 0.8,
							'line-width': {
								type: 'exponential',
								base: 2,
								stops: [
									[0, 4 * Math.pow(2, (0 - 12))],
									[24, 4 * Math.pow(2, (24 - 12))],
								],
							},
						}} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
					</Source>
				))}
			</ReactMapGL>
		</Container>

	)
}

export default AssignmentMap
