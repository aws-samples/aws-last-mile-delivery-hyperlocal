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

const getProviderPieOptions = (status: any): any => {
	return {
		tooltip: {
			trigger: 'item',
		},
		legend: {
			orient: 'horizontal',
			left: 'top',
		},
		series: [
			{
				name: 'Providers allocation',
				type: 'pie',
				radius: '70%',
				data: [
					{ value: status.ordersToProvider.examplepollingprovider, name: 'Polling Provider (Mock)' },
					{ value: status.ordersToProvider.examplewebhookprovider, name: 'Webhook Provider (Mock)' },
					{ value: status.ordersToProvider.instantdeliveryprovider, name: 'Instant Delivery Provider (Implementation)' },
				],
			},
		],
	}
}

const getOrdersBarOption = (status: any): any => {
	return {
		yAxis: {
			type: 'category',
			data: ['All', 'New Order', 'Driver Assigned', 'Picking up goods', 'Arrived at origin', 'Delivering', 'Arrived at destination', 'Delivered', 'Cancelled', 'Rejected'],
		},
		tooltip: {
			trigger: 'item',
		},
		xAxis: {
			type: 'value',
		},
		series: [{
			data: [
				{
					value: status.orders.all,
					itemStyle: {
						color: 'grey',
					},
				},
				status.orders.new_order,
				status.orders.driver_assigned,
				status.orders.picking_up_goods,
				status.orders.arrived_at_origin,
				status.orders.delivering,
				status.orders.arrived_at_destination,
				{
					value: status.orders.delivered,
					itemStyle: {
						color: 'green',
					},
				},
				{
					value: status.orders.cancelled,
					itemStyle: {
						color: 'yellow',
					},
				},
				{
					value: status.orders.rejected,
					itemStyle: {
						color: 'red',
					},
				},
			],
			type: 'bar',
		}],
	}
}

const getDriversBarOptions = (status: any): any => {
	return {
		yAxis: {
			type: 'category',
			data: ['Idle', 'Accepted', 'Picking up goods', 'Arrived at origin', 'Delivering', 'Arrived at destination', 'Delivered'],
		},
		tooltip: {
			trigger: 'item',
		},
		xAxis: {
			type: 'value',
		},
		series: [{
			data: [
				{
					value: status.drivers.idle,
					itemStyle: {
						color: 'grey',
					},
				},
				status.drivers.accepted,
				status.drivers.picking_up_goods,
				status.drivers.arrived_at_origin,
				status.drivers.delivering,
				status.drivers.arrived_at_destination,
				{
					value: status.drivers.delivered,
					itemStyle: {
						color: 'green',
					},
				},
			],
			type: 'bar',
		}],
	}
}

const getProviderDistributionOptions = (status: any): any => {
	return {
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow',
			},
		},
		legend: {
			data: ['Pending', 'Processing', 'Finalised', 'Driver Assigned', 'Picking up goods', 'Arrived at origin', 'Delivering', 'Delivered', 'Cancelled', 'Rejected'],
		},
		xAxis: [
			{
				type: 'category',
				data: ['Polling Provider (Mock)', 'Webhook Provider (Mock)', 'Instnat Delivery Provider'],
			},
		],
		yAxis: [
			{
				type: 'value',
			},
		],
		grid: {
			left: '3%',
			right: '3%',
			bottom: '3%',
			containLabel: true,
		},
		series: [
			{
				name: 'Pending',
				type: 'bar',
				barGap: 0,
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.requested || 0,
					status.providers.ExampleWebhookProvider.requested || 0,
					status.providers.InstantDeliveryProvider.requested || 0,
				],
			},
			{
				name: 'Processing',
				type: 'bar',
				emphasis: {
					focus: 'series',
				},
				data: [
					(
						(status.providers.ExamplePollingProvider.driver_assigned || 0) +
						(status.providers.ExamplePollingProvider.picking_up_goods || 0) +
						(status.providers.ExamplePollingProvider.arrived_at_origin || 0) +
						(status.providers.ExamplePollingProvider.delivering || 0)
					),
					(
						(status.providers.ExampleWebhookProvider.driver_assigned || 0) +
						(status.providers.ExampleWebhookProvider.picking_up_goods || 0) +
						(status.providers.ExampleWebhookProvider.arrived_at_origin || 0) +
						(status.providers.ExampleWebhookProvider.delivering || 0)
					),
					(
						(status.providers.InstantDeliveryProvider.driver_assigned || 0) +
						(status.providers.InstantDeliveryProvider.picking_up_goods || 0) +
						(status.providers.InstantDeliveryProvider.arrived_at_origin || 0) +
						(status.providers.InstantDeliveryProvider.delivering || 0)
					),
				],
			},
			{
				name: 'Driver Assigned',
				type: 'bar',
				barWidth: 5,
				stack: 'Processing',
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.driver_assigned || 0,
					status.providers.ExampleWebhookProvider.driver_assigned || 0,
					status.providers.InstantDeliveryProvider.driver_assigned || 0,
				],
			},
			{
				name: 'Picking up goods',
				type: 'bar',
				barWidth: 5,
				stack: 'Processing',
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.picking_up_goods || 0,
					status.providers.ExampleWebhookProvider.picking_up_goods || 0,
					status.providers.InstantDeliveryProvider.picking_up_goods || 0,
				],
			},
			{
				name: 'Arrived at origin',
				type: 'bar',
				barWidth: 5,
				stack: 'Processing',
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.arrived_at_origin || 0,
					status.providers.ExampleWebhookProvider.arrived_at_origin || 0,
					status.providers.InstantDeliveryProvider.arrived_at_origin || 0,
				],
			},
			{
				name: 'Delivering',
				type: 'bar',
				barWidth: 5,
				stack: 'Processing',
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.delivering || 0,
					status.providers.ExampleWebhookProvider.delivering || 0,
					status.providers.InstantDeliveryProvider.delivering || 0,
				],
			},
			{
				name: 'Finalised',
				type: 'bar',
				emphasis: {
					focus: 'series',
				},
				data: [
					(
						(status.providers.ExamplePollingProvider.delivered || 0) +
						(status.providers.ExamplePollingProvider.cancelled || 0) +
						(status.providers.ExamplePollingProvider.rejected || 0)
					),
					(
						(status.providers.ExampleWebhookProvider.delivered || 0) +
						(status.providers.ExampleWebhookProvider.cancelled || 0) +
						(status.providers.ExampleWebhookProvider.rejected || 0)
					),
					(
						(status.providers.InstantDeliveryProvider.delivered || 0) +
						(status.providers.InstantDeliveryProvider.cancelled || 0) +
						(status.providers.InstantDeliveryProvider.rejected || 0)
					),
				],
			},
			{
				name: 'Delivered',
				type: 'bar',
				stack: 'Finalised',
				barWidth: 5,
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.delivered || 0,
					status.providers.ExampleWebhookProvider.delivered || 0,
					status.providers.InstantDeliveryProvider.delivered || 0,
				],
			},
			{
				name: 'Cancelled',
				type: 'bar',
				stack: 'Finalised',
				barWidth: 5,
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.cancelled || 0,
					status.providers.ExampleWebhookProvider.cancelled || 0,
					status.providers.InstantDeliveryProvider.cancelled || 0,
				],
			},
			{
				name: 'Rejected',
				type: 'bar',
				stack: 'Finalised',
				barWidth: 5,
				emphasis: {
					focus: 'series',
				},
				data: [
					status.providers.ExamplePollingProvider.rejected || 0,
					status.providers.ExampleWebhookProvider.rejected || 0,
					status.providers.InstantDeliveryProvider.rejected || 0,
				],
			},
		],
	}
}

const getOrdersPerdriverOptions = (status: any): any => {
	return {
		tooltip: {
			trigger: 'item',
		},
		legend: {
			orient: 'horizontal',
			left: 'top',
		},
		series: [
			{
				name: 'Orders per driver',
				type: 'pie',
				radius: '70%',
				data: Object.keys(status.ordersPerDriver).map((k: string) => ({
					value: Number(status.ordersPerDriver[k]),
					name: `${k} Order${Number(k) > 1 ? 's' : ''}`,
				})),
			},
		],
	}
}

export default {
	getProviderPieOptions,
	getOrdersBarOption,
	getDriversBarOptions,
	getProviderDistributionOptions,
	getOrdersPerdriverOptions,
}
