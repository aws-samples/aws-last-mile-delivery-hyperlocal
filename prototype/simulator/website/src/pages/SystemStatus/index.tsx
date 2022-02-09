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
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import {
	PieChart,
	BarChart,
} from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	TitleComponent,
	LegendComponent,
} from 'echarts/components'
import {
	CanvasRenderer,
} from 'echarts/renderers'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Container from 'aws-northstar/layouts/Container'
import Box from 'aws-northstar/layouts/Box'
import Inline from 'aws-northstar/layouts/Inline'
import KeyValuePair from 'aws-northstar/components/KeyValuePair'
import Popover from 'aws-northstar/components/Popover'
import Button from 'aws-northstar/components/Button'
import SimulatorAPI from '../../api/SimulatorAPI'
import helper from './chartsHelper'
import dayjs from '../../utils/daysjs'

echarts.use(
	[TitleComponent, TooltipComponent, LegendComponent, GridComponent, PieChart, BarChart, CanvasRenderer],
)

const Simulations: React.FC = () => {
	const [providerPieOptions, setProviderPieOptions] = useState({})
	const [ordersPerDriverOptions, setOrdersPerDriverOptions] = useState({})
	const [providerDistributionOptions, setProviderDistributionOptions] = useState({})
	const [ordersBarOptions, setOrdersBarOptions] = useState({})
	const [driversBarOption, setDriversBarOptions] = useState({})
	const [loading, setLoading] = useState<boolean>(false)
	const [refresh, setRefresh] = useState<number>(0)
	const [status, setStatus] = useState<any>({
		origins: {},
		destinations: {},
		orders: {},
		ordersToProvider: {},
		drivers: {},
		providers: {
			ExamplePollingProvider: {},
			ExampleWebhookProvider: {},
			InternalWebhookProvider: {},
		},
		orderExecutionTime: {
			ExamplePollingProvider: 0,
			ExampleWebhookProvider: 0,
			InternalWebhookProvider: 0,
		},
		errors: {
			InternalWebhookProvider: 0,
		},
		ordersPerDriver: {},
	})

	useEffect(() => {
		const loadData = async () => {
			setLoading(true)
			const stats = await SimulatorAPI.getStats()

			setStatus(stats.data)
			setLoading(false)
		}

		loadData()
	}, [refresh])

	useEffect(() => {
		setProviderPieOptions(helper.getProviderPieOptions(status))
		setOrdersBarOptions(helper.getOrdersBarOption(status))
		setDriversBarOptions(helper.getDriversBarOptions(status))
		setProviderDistributionOptions(helper.getProviderDistributionOptions(status))
		setOrdersPerDriverOptions(helper.getOrdersPerdriverOptions(status))
	}, [status])

	useEffect(() => {
		setRefresh((q) => q + 1)
	}, [])

	return (
		<>
			<Box textAlign='right'>
				<Button disabled={loading} icon='refresh' onClick={() => setRefresh((old) => old + 1)}>Refresh</Button>
			</Box>

			<ColumnLayout>
				<Column key="c1">
					<Container
						headingVariant='h2'
						title='Destinations status (eg. end customers)'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<Inline>
							<KeyValuePair label='Offline' value={status.destinations.offline} />
							<KeyValuePair label='Online' value={status.destinations.online} />
						</Inline>
					</Container>
				</Column>
				<Column key="c2">
					<Container
						headingVariant='h2'
						title='Origins status (eg. restaurants)'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<Inline>
							<KeyValuePair label='Offline' value={status.origins.offline} />
							<KeyValuePair label='Online' value={status.origins.online} />
						</Inline>
					</Container>
				</Column>
			</ColumnLayout>

			<ColumnLayout>
				<Column key="c1">
					<Container
						headingVariant='h2'
						title='Orders status'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<ReactEChartsCore
							echarts={echarts}
							option={ordersBarOptions}
							notMerge={true}
							lazyUpdate={true}
						/>
					</Container>
				</Column>
				<Column key="c2">
					<Container
						headingVariant='h2'
						title='Drivers status'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<ReactEChartsCore
							echarts={echarts}
							option={driversBarOption}
							notMerge={true}
							lazyUpdate={true}
						/>
					</Container>
				</Column>
			</ColumnLayout>

			<ColumnLayout>
				<Column key="c1">
					<Container
						headingVariant='h2'
						title='Orders to provider'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<ReactEChartsCore
							echarts={echarts}
							option={providerPieOptions}
							notMerge={true}
							lazyUpdate={true}
						/>
					</Container>
				</Column>
				<Column key="c2">
					<Container
						headingVariant='h2'
						title='Provider distribution'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<ReactEChartsCore
							echarts={echarts}
							option={providerDistributionOptions}
							notMerge={true}
							lazyUpdate={true}
						/>
					</Container>
				</Column>
			</ColumnLayout>

			<ColumnLayout>
				<Column key="c1">
					<Container
						headingVariant='h2'
						title='Average delivery time (seconds)'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<Inline>
							<Popover
								position="right"
								size="small"
								triggerType="text"
								content={`${Math.floor(status.orderExecutionTime.ExamplePollingProvider / 1000)} seconds`}
							>
								<KeyValuePair label='Polling Provider (Mock)' value={dayjs.duration(status.orderExecutionTime.ExamplePollingProvider).humanize()} />
							</Popover>
							<Popover
								position="right"
								size="small"
								triggerType="text"
								content={`${Math.floor(status.orderExecutionTime.ExampleWebhookProvider / 1000)} seconds`}
							>
								<KeyValuePair label='Webhook Provider (Mock)' value={dayjs.duration(status.orderExecutionTime.ExampleWebhookProvider).humanize() } />
							</Popover>
							<Popover
								position="right"
								size="small"
								triggerType="text"
								content={`${Math.floor(status.orderExecutionTime.InternalWebhookProvider / 1000)} seconds`}
							>
								<KeyValuePair label='Internal Provider (Impl.)' value={dayjs.duration(status.orderExecutionTime.InternalWebhookProvider).humanize()} />
							</Popover>
						</Inline>
					</Container>
				</Column>
				<Column key="c2">
					<Container
						headingVariant='h2'
						title='Orders per Driver'
						style={{ marginTop: '25px', width: '100%' }}
					>
						<ReactEChartsCore
							echarts={echarts}
							option={ordersPerDriverOptions}
							notMerge={true}
							lazyUpdate={true}
						/>
					</Container>
				</Column>
			</ColumnLayout>
		</>
	)
}

export default Simulations
