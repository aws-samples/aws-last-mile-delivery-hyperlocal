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
import { Badge, Popover } from 'aws-northstar'
import dayjs from '../../utils/daysjs'

export const columnDefinitions = (relativeDate: boolean) => ([
	{
		id: 'id',
		width: 150,
		Header: 'Id',
		accessor: 'ID',
	},
	{
		id: 'created',
		width: 120,
		Header: 'Created',
		accessor: 'createdAt',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { createdAt } = row.original

				const relDate = dayjs().to(createdAt)
				const absDate = dayjs(createdAt).format('YYYY-MM-DD\nHH:mm:ss')

				return (
					<Popover
						position="right"
						size="small"
						triggerType="custom"
						content={relativeDate ? absDate : relDate}
					>
						{relativeDate ? relDate : absDate}
					</Popover>
				)
			}

			return row.createdAt
		},
	},
	{
		id: 'updated',
		width: 120,
		Header: 'Last updated',
		accessor: 'updatedAt',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { updatedAt } = row.original

				const relDate = dayjs().to(updatedAt)
				const absDate = dayjs(updatedAt).format('YYYY-MM-DD\nHH:mm:ss')

				return (
					<Popover
						position="right"
						size="small"
						triggerType="custom"
						content={relativeDate ? absDate : relDate}
					>
						{relativeDate ? relDate : absDate}
					</Popover>
				)
			}

			return row.updatedAt
		},
	},
	{
		id: 'provider',
		width: 170,
		Header: 'Provider',
		accessor: 'provider',
	},
	{
		id: 'state',
		width: 130,
		Header: 'State',
		accessor: 'state',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { state } = row.original

				let color: 'grey' | 'red' | 'blue' | 'green' | undefined = 'grey'

				switch (state) {
					case 'REJECTED':
						color = 'red'
						break
					case 'DELIVERED':
						color = 'green'
						break
					default:
						color = 'grey'
						break
				}

				return (
					<Badge content={state} color={color} />
				)
			}

			return row.state
		},
	},
	{
		id: 'destination-location',
		width: 200,
		Header: 'Destination location',
		accessor: 'destination',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { destination } = row.original

				return (
					<>
						{'lat'}&nbsp;&nbsp;&nbsp;&nbsp;{'= ' + destination.lat}<br/>
						{'long = ' + destination.long}
					</>
				)
			}

			return row.contact
		},
	},
	{
		id: 'origin-location',
		width: 200,
		Header: 'Origin location',
		accessor: 'origin',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { origin } = row.original

				return (
					<>
						{'lat'}&nbsp;&nbsp;&nbsp;&nbsp;{'= ' + origin.lat}<br/>
						{'long = ' + origin.long}
					</>
				)
			}

			return row.contact
		},
	},
	{
		id: 'driverId',
		width: 300,
		Header: 'DriverID',
		accessor: 'driverId',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { driverId } = row.original

				if (driverId != null) {
					return driverId
				}

				return '-'
			}

			return row.driverId
		},
	},
	{
		id: 'driverIdentity',
		width: 350,
		Header: 'DriverIdentity',
		accessor: 'driverIdentity',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { driverIdentity } = row.original

				if (driverIdentity != null) {
					return driverIdentity
				}

				return '-'
			}

			return row.driverIdentity
		},
	},
])
