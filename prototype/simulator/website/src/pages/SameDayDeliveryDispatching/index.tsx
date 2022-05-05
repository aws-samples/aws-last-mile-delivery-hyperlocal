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
import { Box, Button, Column, ColumnLayout, Inline, LoadingIndicator, Stack, Table } from 'aws-northstar'
import SameDayAssignmentMap from '../../components/MapComponent/SameDayAssignmentMap'
import React, { useEffect, useState } from 'react'
import { DateRangeOutlined, DateRangeRounded } from '@material-ui/icons'
import SameDayDelivery from '../../api/SameDayDelivery'
import { columnDefinitions, deliveryJobsColumnDefinition } from './table-columns'

const SameDayDeliveryDispatching: React.FC = () => {
	const [assignments, setAssignments] = useState<any>([])
	const [deliveryJobs, setDeliveryJobs] = useState<any>([])
	const [selectedAssignment, setSelectedAssignment] = useState<any>()
	const [selectedDeliveryJob, setSelectedDeliveryJob] = useState<any>()
	const [loading, setLoading] = useState(false)
	const [loadingDeliveryJobs, setLoadingDeliveryJobs] = useState(false)
	const [relDate, setRelDate] = useState(true)
	const [nextToken, setNextToken] = useState(undefined)

	const fetchAssignments = async (nextToken?: string, hardRefresh = false) => {
		try {
			setLoading(true)
			const result = await SameDayDelivery.getDispatchAssignmentsAll(nextToken)

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

	useEffect(() => {
		const fetchDeliveryJobs = async () => {
			try {
				setLoadingDeliveryJobs(true)
				const result = await SameDayDelivery.getDeliveryJobs(selectedAssignment.ID)

				setDeliveryJobs(result.data.deliveryJobs)
			} catch (err) {
				console.log(err)
			} finally {
				setLoadingDeliveryJobs(false)
			}
		}

		if (selectedAssignment) {
			fetchDeliveryJobs()
		}
	}, [selectedAssignment])

	const onAssignmentChange = (selectedItems: any[]) => {
		if (selectedItems.length > 0) {
			setSelectedAssignment(selectedItems[0])
		} else {
			setSelectedAssignment(null)
		}
	}

	const onDeliveryJobChange = (selectedItems: any[]) => {
		if (selectedItems.length > 0) {
			setSelectedDeliveryJob(selectedItems[0])
		} else {
			setSelectedDeliveryJob(null)
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
			<Stack>
				<Box >
					<ColumnLayout>
						<Column key='table'>
							<Table
								tableTitle={'Same Day Delivery Dispatch Assignments'}
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
								onSelectionChange={onAssignmentChange}
							/>
						</Column>
						<Column key='map'>
							<Table
								tableTitle={'Same Day Delivery Jobs'}
								columnDefinitions={deliveryJobsColumnDefinition(relDate)}
								items={deliveryJobs}
								loading={loadingDeliveryJobs}
								multiSelect={false}
								disableRowSelect={false}
								defaultPageSize={100}
								sortBy={[{ id: 'created', desc: true }]}
								pageSizes={[25, 50, 100]}
								rowCount={deliveryJobs.length}
								onSelectionChange={onDeliveryJobChange}
							/>
						</Column>
					</ColumnLayout>
				</Box>
				<Box>
					<SameDayAssignmentMap
						segments={selectedDeliveryJob ? selectedDeliveryJob.segments : undefined}
						route={selectedDeliveryJob ? selectedDeliveryJob.route : undefined}
					/>
				</Box>
			</Stack>

		</>
	)
}

export default SameDayDeliveryDispatching
