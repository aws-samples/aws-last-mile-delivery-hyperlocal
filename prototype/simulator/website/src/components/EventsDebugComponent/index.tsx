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
import Container from 'aws-northstar/layouts/Container'
import Popover from 'aws-northstar/components/Popover'
import Badge from 'aws-northstar/components/Badge'
import Alert from 'aws-northstar/components/Alert'
import Button from 'aws-northstar/components/Button'
import EventsAPI from '../../api/EventsAPI'
import utils from '../../utils'
import dayjs from '../../utils/daysjs'

export type EventDebugger = {
	onChange?: (orders: any[], geofences: any[]) => void
	onClick?: (event: any) => void
}

const EventsDebugComponent: React.FC<EventDebugger> = ({ onChange, onClick }) => {
	const [events, setEvents] = useState<any>([])

	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const result = await EventsAPI.getEvents()

				setEvents(result.data)
			} catch (err) {
				console.log(err)
			}
		}, 2000)

		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		const orders = events.filter((q: any) => q['detail-type'] === 'ORDER_FULFILLED')
		const geofences = events.filter((q: any) => q['detail-type'] === 'GEOFENCE_START')

		onChange && onChange(orders, geofences)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [events])

	return (
		<Container
			headingVariant='h2'
			title='Events Debugger'
			style={{ marginTop: '25px', width: '100%', maxHeight: '329.781px', overflow: 'scroll' }}
		>
			{events.length === 100 && <Alert>The UI only display the latest 100 events</Alert>}
			<table>
				<tbody>
					{utils.sortByCreationDateDesc(events).map((e: any, idx: number) => (
						<tr key={idx}>
							<td style={{ paddingRight: '15px' }}>
								<Badge color='blue' content={e.source} />
							</td>
							<td style={{ paddingRight: '15px' }}>
								{/* <Popover
									position="right"
									size="large"
									triggerType="text"
									content={<MarkdownViewer>{`\`\`\`json\n${JSON.stringify(e.detail, null, 2)}\n \`\`\``}</MarkdownViewer>}
								> */}
								<Button variant="link" href="" onClick={() => onClick && onClick(e)}>
									{e['detail-type']}
								</Button>
								{/* </Popover> */}
							</td>
							<td style={{ paddingRight: '15px' }}>
								<Popover
									position="right"
									size="small"
									triggerType="text"
									content={dayjs(e.createdAt).toISOString()}
								>
									{dayjs().to(e.createdAt)}
								</Popover>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Container>
	)
}

export default EventsDebugComponent
