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
import { Popover } from 'aws-northstar'
import dayjs from '../../utils/daysjs'

export const columnDefinitions = (relativeDate: boolean): any => ([
	{
		id: 'id',
		width: 120,
		Header: 'Id',
		accessor: 'ID',
	},
	{
		id: 'state',
		width: 100,
		Header: 'State',
		accessor: 'state',
	},
	{
		id: 'score',
		width: 180,
		Header: 'Score',
		accessor: 'score',
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
		id: 'Info',
		width: 20,
		Header: 'Info',
		accessor: 'solverDurationInMs',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const solverDurationInMs: number = row.original.solverDurationInMs

				return (<Popover
					position="right"
					size="small"
					triggerType="custom"
					content={(<>
						<p>Solver Duration (s): {Math.ceil(solverDurationInMs / 1000)}</p>
					</>)}
				>
					Info
				</Popover>)
			}
		},
	},
])

export const deliveryJobsColumnDefinition = (relativeDate: boolean): any => ([
	{
		id: 'id',
		width: 120,
		Header: 'Id',
		accessor: 'ID',
	},
	{
		id: 'distance',
		width: 135,
		Header: 'Distance (m)',
		accessor: 'route',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { route } = row.original

				return route.distance.value
			}

			return undefined
		},
	},
	{
		id: 'time',
		width: 135,
		Header: 'Time (sec.)',
		accessor: 'route',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { route } = row.original

				return route.time.value
			}

			return undefined
		},
	},
	{
		id: 'segments',
		width: 135,
		Header: 'Orders',
		accessor: 'segments',
		Cell: ({ row }: any) => {
			if (row && row.original) {
				const { segments } = row.original

				return segments.length / 2
			}

			return undefined
		},
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
])
