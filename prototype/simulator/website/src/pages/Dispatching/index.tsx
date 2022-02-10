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
import { Box, Button, Column, ColumnLayout, Inline, LoadingIndicator, Table } from 'aws-northstar'
import AssignmentMap from '../../components/MapComponent/AssignmentMap'
import React, { useEffect, useState } from 'react'
import { DateRangeOutlined, DateRangeRounded } from '@material-ui/icons'
import OrderAPI from '../../api/OrderAPI'
import { columnDefinitions } from './table-columns'

const Dispatching: React.FC = () => {
	const [assignments, setAssignments] = useState<any>([])
	const [selectedAssignment, setSelectedAssignment] = useState<any>()
	const [loading, setLoading] = useState(false)
	const [relDate, setRelDate] = useState(true)
	const [nextToken, setNextToken] = useState(undefined)

	const fetchAssignments = async (nextToken?: string, hardRefresh = false) => {
		try {
			setLoading(true)
			const result = await OrderAPI.getDispatchAssignmentsAll(nextToken)

			if (!hardRefresh) {
				setAssignments((old: any) => [...old, ...result.data.assignments])
			} else {
				setAssignments(result.data.assignments)
			}

			setNextToken(result.data.nextToken)
		} catch (err) {
			console.log(err)
		} finally {
			setLoading(false)
		}
	}

	const loadNextPage = () => {
		fetchAssignments(nextToken)
	}

	useEffect(() => {
		fetchAssignments()
	}, [])

	const onTableSelectionChange = (selectedItems: any[]) => {
		if (selectedItems.length > 0) {
			setSelectedAssignment(selectedItems[0])
		} else {
			setSelectedAssignment(null)
		}
	}

	const tableActions = (
		<Inline>
			{nextToken && <Button loading={loading} onClick={() => loadNextPage()}>Load More...</Button>}
			<Button onClick={() => setRelDate(!relDate)} icon={relDate ? DateRangeOutlined : DateRangeRounded} variant="icon"></Button>
			<Button onClick={() => fetchAssignments(undefined, true)} icon='refresh' variant="icon"></Button>
		</Inline>
	)

	return (
		<>
			<ColumnLayout>
				<Column key='table'>
					<Box display="flex" width="100%" height="100%" alignItems="center" justifyContent="center">
						<Table
							tableTitle={'Dispatch Assignments'}
							columnDefinitions={columnDefinitions(relDate)}
							actionGroup={tableActions}
							items={assignments}
							loading={loading}
							multiSelect={false}
							disableRowSelect={false}
							defaultPageSize={25}
							sortBy={[{ id: 'created', desc: true }]}
							pageSizes={[25, 50, 100]}
							rowCount={assignments.length}
							onSelectionChange={onTableSelectionChange}
						/>
					</Box>
				</Column>
				<Column key='map'>
					<Box display="flex" width="100%" height="100%" alignItems="center" justifyContent="center">
						<AssignmentMap assignment={selectedAssignment} />
					</Box>
				</Column>
			</ColumnLayout>

		</>
	)
}

export default Dispatching
