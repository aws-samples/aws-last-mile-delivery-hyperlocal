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
import Button from 'aws-northstar/components/Button'
import Inline from 'aws-northstar/layouts/Inline'
import Table from 'aws-northstar/components/Table'
import { columnDefinitions } from './table-columns'
import OrderAPI from '../../api/OrderAPI'

const Orders: React.FC = () => {
	const [orders, setOrders] = useState<any>([])
	const [loading, setLoading] = useState(false)
	const [relDate, setRelDate] = useState(true)
	const [nextToken, setNextToken] = useState(undefined)

	const fetchOrders = async (nextToken?: string, hardRefresh = false) => {
		try {
			setLoading(true)
			const result = await OrderAPI.getOrders(nextToken)

			if (!hardRefresh) {
				setOrders((old: any) => [...old, ...result.data])
			} else {
				setOrders(result.data)
			}

			setNextToken((result.lastEvaluatedKey || {}).ID)
		} catch (err) {
			console.log(err)
		} finally {
			setLoading(false)
		}
	}

	const loadNextPage = () => {
		fetchOrders(nextToken)
	}

	useEffect(() => {
		fetchOrders()
	}, [])

	useEffect(() => {
		console.warn(nextToken)
	}, [nextToken])

	const tableActions = (
		<Inline>
			{nextToken && <Button loading={loading} onClick={() => loadNextPage()}>Load More...</Button>}
			<Button onClick={() => setRelDate(!relDate)} icon={relDate ? 'DateRangeOutlined' : 'DateRangeRounded'} variant="icon"></Button>
			<Button onClick={() => fetchOrders(undefined, true)} icon='Refresh' variant="icon"></Button>
		</Inline>
	)

	return (
		<>
			<Table
				tableTitle={'Orders'}
				columnDefinitions={columnDefinitions(relDate)}
				actionGroup={tableActions}
				items={orders}
				loading={loading}
				multiSelect={false}
				disableRowSelect={true}
				defaultPageSize={25}
				sortBy={[{ id: 'created', desc: true }]}
				pageSizes={[25, 50, 100]}
				rowCount={orders.length}
			/>

		</>
	)
}

export default Orders
