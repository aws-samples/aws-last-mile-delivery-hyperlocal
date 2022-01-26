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
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import EventsDebugComponent from '../../components/EventsDebugComponent'
import EventDetails from '../../components/EventDetails'
import MapComponent from '../../components/MapComponent'

const Main: React.FC = () => {
	const [event, setEvent] = useState<any>(null)
	const [orders, setOrders] = useState<any>([])
	const [geofences, setGeofences] = useState<any>([])

	const handleChange = (_orders: any[], _geofences: any[]) => {
		setOrders(_orders)
		setGeofences(_geofences)
	}

	return (
		<>
			<ColumnLayout>
				<Column key="c1">
					<EventsDebugComponent onChange={handleChange} onClick={setEvent} />
				</Column>
				<Column key="c2">
					<EventDetails event={event} onClose={() => setEvent(null)} />
				</Column>
			</ColumnLayout>
			<MapComponent orders={orders} geofences={geofences} />
		</>
	)
}

export default Main
