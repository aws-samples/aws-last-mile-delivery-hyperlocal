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
const toRadians = (angdeg) => {
	return angdeg / 180.0 * Math.PI
}

/**
 * Generates number of random geolocation points given a center and a radius.
 *
 * Reference URL: http://goo.gl/KWcPE.
 * @param  {number|string} lat Latitute value
 * @param  {number|string} long Longitude value
 * @param  {number|string} radius Radius in meters.
 * @return {Object} The generated random points as JS object with latitude and longitude attributes.
 */
const generateRandomPoint = (lat, long, radius) => {
	var y0 = Number(lat)
	var x0 = Number(long)

	// Convert Radius from meters to degrees.
	var rd = Number(radius) / 111000.0

	var u = Math.random()
	var v = Math.random()

	var w = rd * Math.sqrt(u)
	var t = 2 * Math.PI * v
	var x = w * Math.cos(t)
	var y = w * Math.sin(t)

	var xp = x / Math.cos(toRadians(y0))

	return {
		latitude: y + y0,
		longitude: xp + x0,
	}
}

module.exports = {
	generateRandomPoint,
}
