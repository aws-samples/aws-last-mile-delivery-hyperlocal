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

import React, { useEffect, useState } from 'react'
import { NavigationControl, Source, Layer, Map } from 'react-map-gl'
import * as polyline from '@mapbox/polyline'
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'
import Icon from 'aws-northstar/components/Icon'
import Select from 'aws-northstar/components/Select'
// to fix: https://github.com/visgl/react-map-gl/issues/1266
import mapboxgl from 'mapbox-gl'
import MapPin from '../MapPin'
import SameDayDelivery from '../../api/SameDayDelivery'

// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default

declare let appVariables: {
	MAP_BOX_TOKEN: string
	BASE_LOCATION: {
		lat: number
		long: number
	}
}

const navControlStyle = {
	left: 10,
	top: 10,
}

const baseLocation = {
	latitude: appVariables.BASE_LOCATION.lat,
	longitude: appVariables.BASE_LOCATION.long,
	zoom: 12,
}

type MapInputProps = {
	segments: any
	route: any
}

const SELECTALL = { label: 'Show all', value: 'all' }
const DESELECTALL = { label: 'Show none', value: 'none' }
const colorLetters = '0123456789ABCDEF'
const getRandomColor = () => {
	let color = '#'
	for (let i = 0; i < 6; i++) {
		color += colorLetters[Math.floor(Math.random() * 16)]
	}

	return color
}

const SameDayAssignmentMap: React.FC<MapInputProps> = ({ segments, route }) => {
	const [viewport, setViewport] = useState({
		width: '100%',
		height: 800,
		...baseLocation,
	})
	const [originPins, setOriginPins] = useState<any>([])
	const [destinationPins, setDestinationPins] = useState<any>([])
	const [routeLines, setRouteLines] = useState<any>([])
	const [segmentsState, setSegmentsState] = useState<any>()
	const [routeState, setRouteState] = useState<any>()
	const [deliveryHubs, setDeliveryHubs] = useState<any>([])
	const [selectOptions, setSelectOptions] = useState<any>([])
	const [selectedOption, setSelectedOption] = useState<any>(SELECTALL)

	useEffect(() => {
		setRouteState(route)
		setSegmentsState(segments)
		const getDeliveryHubs = async () => {
			try {
				const result = await SameDayDelivery.getDeliveryHubs()

				setDeliveryHubs(result.data.hubs)
			} catch (err) {
				console.error('error retrieving the hubs')
			}
		}

		getDeliveryHubs()
	}, [route, segments])

	useEffect(() => {
		if (!segmentsState) {
			return
		}

		const _viewPort = {
			width: '100%',
			height: 800,
			latitude: segmentsState[0].from.lat,
			longitude: segmentsState[0].from.long,
			zoom: 12,
		}
		setViewport(_viewPort)
	}, [segmentsState])

	const createMapData = () => {
		if (!segmentsState || !routeState) {
			return
		}

		const _originPins: any[] = []
		const _destinationPins: any[] = []
		const _routeLines: any[] = []
		const ordersList = Array.from(new Set(segmentsState.map((q: any) => q.orderId)))

		ordersList
		.forEach((orderId: any) => {
			const color = getRandomColor()

			segmentsState.filter((q: any) => q.orderId === orderId).forEach((q: any) => {
				if (!(selectedOption.value === 'all' || q.index === selectedOption.value)) {
					return
				}

				if (q.segmentType === 'TO_ORIGIN') {
					_originPins.push({
						...q,
						color,
					})
				}

				if (q.segmentType === 'TO_DESTINATION') {
					_destinationPins.push({
						...q,
						color,
					})
				}

				// show the route only if selected
				if (selectedOption.value !== 'all' && q.index === selectedOption.value) {
					const geoJsonData: any = {
						type: 'Feature',
						geometry: polyline.toGeoJSON(q.route.pointsEncoded),
					}

					_routeLines.push({
						geoJsonData,
						color: color,
					})
				}
			})
		})

		if (routeState != null && selectedOption.value === 'all') {
			const geoJsonData: any = {
				type: 'Feature',
				geometry: polyline.toGeoJSON(routeState.pointsEncoded),
			}

			_routeLines.push({
				geoJsonData,
				color: getRandomColor(),
			})
		}

		setOriginPins(_originPins)
		setDestinationPins(_destinationPins)
		setRouteLines(_routeLines)
	}

	useEffect(() => {
		createMapData()
	}, [segmentsState, routeState, selectedOption])

	useEffect(() => {
		if (segmentsState) {
			const element = segmentsState.find((q: any) => q.index === selectedOption.value)

			if (element) {
				setViewport((old) => ({
					...old,
					latitude: element.from.lat,
					longitude: element.from.long,
				}))
			}
		}
	}, [segmentsState, selectedOption])

	useEffect(() => {
		let _options: any[] = []

		if (segmentsState) {
			_options = segmentsState.map((s: any) => {
				return ({
					label: `[${s.index}] [${s.segmentType}] [${s.orderId.substr(0, 8)}]`,
					value: s.index,
				})
			})
		}

		setSelectOptions([SELECTALL, DESELECTALL, ..._options])
	}, [segmentsState, setSelectOptions])

	const onSelectChange = (e: any) => {
		const newSelected = selectOptions.find((o: any) => o.value === e.target.value)
		setSelectedOption(newSelected)
	}

	const movePrev = () => {
		const idx = selectOptions.findIndex((q: any) => q.value === selectedOption.value)

		if (idx > 0) {
			setSelectedOption(selectOptions[idx - 1])
		}
	}
	const moveNext = () => {
		const idx = selectOptions.findIndex((q: any) => q.value === selectedOption.value)

		if (idx > 1 && idx < selectOptions.length - 1) {
			setSelectedOption(selectOptions[idx + 1])
		} else if (idx < 2) {
			setSelectedOption(selectOptions[2])
		}
	}

	const resetDefault = () => {
		setViewport((old) => ({
			...old,
			...baseLocation,
		}))
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
					<span onClick={movePrev} style={{ cursor: 'pointer' }}>
						<Icon name='ArrowBackIos' />
					</span>
					<span onClick={moveNext} style={{ cursor: 'pointer' }}>
						<Icon name='ArrowForwardIos' />
					</span>
					{viewport.latitude} {viewport.longitude} {parseInt(viewport.zoom.toString(), 10)}
					<span onClick={resetDefault} style={{ cursor: 'pointer' }}>
						<Icon name='GpsFixed' />
					</span>
					<span onClick={createMapData} style={{ cursor: 'pointer' }}>
						<Icon name='RefreshTwoTone' />
					</span>
				</Inline>
			}
		>
			<Map
				style={{ width: viewport.width, height: viewport.height }}
				initialViewState={{
					latitude: viewport.latitude,
					longitude: viewport.longitude,
					zoom: viewport.zoom,
				}}
				mapStyle="mapbox://styles/mapbox/streets-v11"
				mapboxAccessToken={appVariables.MAP_BOX_TOKEN}
				onMove={(v: any) => setViewport(v)}
			>
				<NavigationControl style={navControlStyle} showCompass={false} />
				{originPins && originPins.map((d: any) => (<MapPin
					key={`${d.orderId}-origin`}
					latitude={d.to.lat}
					longitude={d.to.long}
					color={d.color}
					data={d}
					iconName='TripOriginOutlined'
				/>))}
				{destinationPins && destinationPins.map((d: any) => (
					<MapPin
						key={`${d.orderId}-destination`}
						latitude={d.to.lat}
						longitude={d.to.long}
						color={d.color}
						data={d}
						iconName='HomeOutlined'
					/>
				))}
				{deliveryHubs && deliveryHubs.map((d: any) => (
					<MapPin
						key={`${d.ID}-hub`}
						latitude={d.coordinate.lat}
						longitude={d.coordinate.long}
						color={'#000000'}
						data={d}
						iconName='DeviceHub'
					/>
				))}
				{routeLines && routeLines.map((r: any, idx: number) => (
					<Source key={`route-${idx}`} id={`route-${idx}`} type='geojson' data={r.geoJsonData}>
						<Layer key={`layer-${idx}`} id={`layer-${idx}`} type='line' paint={{
							'line-color': '#1017cc',
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
			</Map>
		</Container>

	)
}

export default SameDayAssignmentMap
