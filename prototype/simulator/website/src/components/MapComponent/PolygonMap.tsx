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
import ReactMapGL, { NavigationControl, Layer, Source } from 'react-map-gl'
import { FeatureCollection, Position } from 'geojson'
import utils from '../../utils'

declare let appVariables: {
	MAP_BOX_TOKEN: string
}
const navControlStyle = {
	left: 10,
	top: 10,
}

export type PolyonMapInputProps = {
	vertices: [{ lat: number, long: number, }]
}

const PolygonMap: React.FC<PolyonMapInputProps> = ({ vertices }) => {
	const [viewport, setViewport] = useState({
		width: 600,
		height: 600,
		zoom: 11,
		latitude: vertices[0].lat,
		longitude: vertices[0].long,
	})

	const geojson: FeatureCollection = {
		type: 'FeatureCollection',
		features: [
			utils.generatePolygonGEOJSON(vertices),
		],
	}

	return (
		<ReactMapGL
			width={viewport.width}
			height={viewport.height}
			zoom={viewport.zoom}
			latitude={viewport.latitude}
			longitude={viewport.longitude}
			mapStyle="mapbox://styles/mapbox/streets-v11"
			mapboxApiAccessToken={appVariables.MAP_BOX_TOKEN}
			onViewportChange={(v: any) => setViewport(v)}
		>
			<NavigationControl style={navControlStyle} showCompass={false} />
			<Source
				id='polygon-data'
				type='geojson'
				data={geojson}
			/>
			<Layer
				id='polygonlayer'
				type='fill'
				source='polygon-data'
				paint={{
					'fill-color': '#0091cd',
					'fill-opacity': 0.4,
				}}
			/>
		</ReactMapGL>
	)
}

export default PolygonMap
