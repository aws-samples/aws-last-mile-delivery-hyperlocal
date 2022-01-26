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
/* eslint-disable @typescript-eslint/no-this-alias */

const groupAreas = (areas: any[], maxGroup = 0): any[] => {
	const groups = []

	for (let i = 0; i < areas.length; i += 3) {
		const group = []
		group.push(areas[i])
		areas[i + 1] && group.push(areas[i + 1])
		areas[i + 2] && group.push(areas[i + 2])

		groups.push(group)
	}

	if (maxGroup > 0) {
		return groups.slice(0, maxGroup)
	}

	return groups
}

const mapStatusToColor = (status: string): any => {
	switch (status) {
		case 'STARTING':
			return 'blue'
		case 'RUNNING':
			return 'green'
		case 'STOPPED':
			return 'red'
		default:
			return undefined
	}
}

const sortByCreationDateDesc = (arr: []): [] => {
	return arr.sort((a: any, b: any) => b.createdAt - a.createdAt)
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
const debounce = (func: any, wait: number, immediate = false): any => {
	let timeout: NodeJS.Timeout | null

	return function (...args: any[]): any {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const context = this
		const later = (): any => {
			timeout = null

			if (!immediate) {
				func.apply(context, args)
			}
		}
		const callNow = immediate && !timeout
		clearTimeout(timeout as NodeJS.Timeout)
		timeout = setTimeout(later, wait)

		if (callNow) {
			func.apply(context, args)
		}
	}
}

const generateGeofenceGEOJSON = (lat: number, long: number): any => {
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'Point',
			coordinates: [long, lat],
		},
	}
}

const metersToPixelsAtMaxZoom = (meters: number, latitude: number): number => {
	return meters / 0.075 / Math.cos(latitude * Math.PI / 180)
}

const calculateDistanceByZoom = (zoom: number): number => {
	const pixelMeterSizes = {
		8: 610.984,
		9: 305.492,
		10: 152.746,
		11: 76.373,
		12: 38.187,
		13: 19.093,
		14: 9.547,
		15: 4.773,
		16: 2.387,
		17: 1.193,
		18: 0.596,
		19: 0.298,
		20: 0.149,
	}
	let pixelMeter = pixelMeterSizes[8]

	if (zoom > 20) {
		pixelMeter = pixelMeterSizes[20]
	} else if (zoom > 8) {
		pixelMeter = pixelMeterSizes[zoom as keyof typeof pixelMeterSizes]
	}

	return Math.floor(pixelMeter * 512)
}

const generatePolygonGEOJSON = (vertices: any[]): any => {
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'Polygon',
			coordinates: [vertices.map(item => ([item.long, item.lat]))],
		},
	}
}

const DEFAULT_AREAS = [
	{ lat: -6.1813448922772185, long: 106.8372344970703 },
	{ lat: -6.154038052480653, long: 106.7270278930664 },
	{ lat: -6.22981105782168, long: 106.73372268676758 },
]

const getAreaCodeFromCoords = (lat: number, long: number): string|undefined => {
	const idx = DEFAULT_AREAS.findIndex((q) => q.lat === lat && q.long === long)

	if (idx > -1) {
		return `Area ${idx + 1}`
	}

	return `Area ${Math.floor(Math.random() * (200 - 100 + 1)) + 100}`
}

const camelCaseToWords = (str: string): string => {
	const match = str.match(/^[a-z]+|[A-Z][a-z]*/g)

	return (match || []).map((x) => {
		return x[0].toUpperCase() + x.substr(1).toLowerCase()
	}).join(' ')
}

export default {
	mapStatusToColor,
	groupAreas,
	sortByCreationDateDesc,
	debounce,
	generateGeofenceGEOJSON,
	metersToPixelsAtMaxZoom,
	calculateDistanceByZoom,
	generatePolygonGEOJSON,
	DEFAULT_AREAS,
	getAreaCodeFromCoords,
	camelCaseToWords,
}
