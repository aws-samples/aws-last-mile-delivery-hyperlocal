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

import React, { useEffect, useState, useCallback } from 'react'
import ReactMapGL, { NavigationControl, Source, Layer } from 'react-map-gl'
import * as polyline from '@mapbox/polyline'
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'
import Icon from 'aws-northstar/components/Icon'
import Alert from 'aws-northstar/components/Alert'
// to fix: https://github.com/visgl/react-map-gl/issues/1266
import mapboxgl from 'mapbox-gl'
import MapPin from '../MapPin'
import GeotrackingAPI from '../../api/GeotrackingAPI'
import SimulatorAPI from '../../api/SimulatorAPI'
import utils from '../../utils'

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
	zoom: 14,
}

export type MapInputProps = {
	orders: any[]
	geofences: any[]
}

const getColor = (idx: number) => {
	if (idx % 2) {
		return '#03AA46'
	}

	return '#AA0303'
}
const MAX_DRIVERS = 100

const MapComponent: React.FC<MapInputProps> = ({ orders, geofences }) => {
	const [geoJSON, setGeoJSON] = useState<any>([])
	const [drivers, setDrivers] = useState<any>([])
	const [polygons, setPolygons] = useState<any>([])
	const [viewport, setViewport] = useState({
		width: '100%',
		height: 800,
		...baseLocation,
	})

	const resetDefault = () => {
		setViewport((old) => ({
			...old,
			...baseLocation,
		}))
	}

	const query = useCallback(
		utils.debounce(async (zoom: number, latitude: number, longitude: number) => {
			const res = await GeotrackingAPI.queryDrivers({
				lat: latitude,
				long: longitude,
				distance: utils.calculateDistanceByZoom(Math.floor(zoom)),
				count: MAX_DRIVERS,
			})

			setDrivers(res)
		}, 250),
		[],
	)

	useEffect(() => {
		const interval = setInterval(async () => {
			// @ts-ignore
			query(viewport.zoom, viewport.latitude, viewport.longitude)
		}, 3000)

		return () => clearInterval(interval)
	}, [viewport, query])

	useEffect(() => {
		// @ts-ignore
		query(viewport.zoom, viewport.latitude, viewport.longitude)
	}, [viewport, query])

	useEffect(() => {
		const paths = orders.map((q: any) =>
			q.detail.routing && q.detail.routing.map((r: any) => polyline.toGeoJSON(r.pathPolyline)),
		).flat()

		if (paths.length) {
			setGeoJSON(paths.map((p: any) => ({
				type: 'Feature',
				geometry: p,
			})))
		}
	}, [orders])

	useEffect(() => {
		const loadData = async () => {
			try {
				const pol = await SimulatorAPI.getPolygons()

				setPolygons(pol.data.Items)
			} catch (err) {
				console.log(err)
			}
		}

		loadData()
	}, [])

	return (
		<Container
			headingVariant='h2'
			title='Map'
			style={{ marginTop: '25px' }}
			actionGroup={
				<Inline>
					{viewport.latitude} {viewport.longitude} {parseInt(viewport.zoom.toString(), 10)}
					<span onClick={resetDefault} style={{ cursor: 'pointer' }}>
						<Icon name='GpsFixed' />
					</span>
				</Inline>
			}
		>
			{drivers.length === MAX_DRIVERS && <Alert>The Map only shows {MAX_DRIVERS} drivers</Alert>}
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
				{drivers && drivers.map((d: any, idx: number) => (
					<MapPin key={idx} latitude={d.latitude} longitude={d.longitude} data={d} />
				))}
				{orders && orders.map((q: any) => q.detail.destination).map((r: any, idx: number) => (
					<MapPin key={idx} latitude={r.lat} longitude={r.long} data={r} iconName='Face' />
				))}
				{orders && orders.map((q: any) => q.detail.origin).map((r: any, idx: number) => (
					<MapPin key={idx} latitude={r.lat} longitude={r.long} data={r} iconName='Restaurant' />
				))}
				{geoJSON && geoJSON.map((g: any, idx: number) => (
					<Source key={idx} id={`route-${idx}`} type="geojson" data={g}>
						<Layer type='line' paint={{
							'line-color': getColor(idx),
							'line-opacity': 0.8,
							'line-width': {
								type: 'exponential',
								base: 2,
								stops: [
									[0, 4 * Math.pow(2, (0 - 14))],
									[24, 4 * Math.pow(2, (24 - 14))],
								],
							},
						}} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
					</Source>
				))}
				{geofences && geofences.map((g: any, idx: number) => (
					<Source key={idx} id={`geofence-${idx}`} type="geojson" data={utils.generateGeofenceGEOJSON(g.detail.lat, g.detail.long)}>
						<Layer type='circle' paint={{
							'circle-color': 'blue',
							'circle-opacity': 0.4,
							'circle-radius': {
								stops: [
									[0, 0],
									[20, utils.metersToPixelsAtMaxZoom(g.detail.radius, g.detail.lat)],
								],
								base: 2,
							},
						}} />
					</Source>
				))}
				{polygons && polygons.map((p: any, idx: number) => (
					<Source key={idx} id={`polygon-${idx}`} type="geojson" data={utils.generatePolygonGEOJSON(p.vertices)}>
						<Layer type='fill' paint={{
							'fill-color': '#0091cd',
							'fill-opacity': 0.1,
						}} />
					</Source>
				))}
			</ReactMapGL>
		</Container>

	)
}

export default MapComponent
