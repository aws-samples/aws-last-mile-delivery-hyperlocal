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
import FormField from 'aws-northstar/components/FormField'
import Input from 'aws-northstar/components/Input'
import Inline from 'aws-northstar/layouts/Inline'

export type ILatLong = {
  lat?: number
  long?: number
}

export type LatLongPairProps = {
  onChange: (obj: ILatLong) => void
	value?: ILatLong
}

const LatLongPair: React.FC<LatLongPairProps> = ({ onChange, value }) => {
	const [lat, setLat] = useState(value?.lat)
	const [long, setLong] = useState(value?.long)

	useEffect(() => {
		onChange({
			lat, long,
		})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lat, long])

	useEffect(() => {
		setLong(value?.long)
	}, [value])

	useEffect(() => {
		setLat(value?.lat)
	}, [value])

	return (
		<Inline>
			<FormField
				label='Latitude'
				controlId='rlat'
			>
				<Input
					type='number'
					controlId='rlat'
					onChange={(v: string) => setLat(Number(v))}
					value={lat}
				/>
			</FormField>
			<FormField
				label='Longitude'
				controlId='rlong'
			>
				<Input
					type='number'
					controlId='rlong'
					onChange={(v: string) => setLong(Number(v))}
					value={long}
				/>
			</FormField>
		</Inline>
	)
}

export default LatLongPair
