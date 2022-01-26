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
import { useHistory } from 'react-router-dom'
import Inline from 'aws-northstar/layouts/Inline'
import Table from 'aws-northstar/components/Table'
import Icon from 'aws-northstar/components/Icon'
import Button from 'aws-northstar/components/Button'
import SimulatorAPI from '../../api/SimulatorAPI'
import { columnDefinitions } from './table-columns'

const Polygons: React.FC = () => {
	const [polygons, setPolygons] = useState<any>([])
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [forceRefresh, setForceRefresh] = useState(1)
	const [loading, setLoading] = useState(false)
	const history = useHistory()

	const handleNewPolygon = () => {
		history.push('/polygons/new')
	}

	useEffect(() => {
		const loadData = async () => {
			setLoading(true)
			try {
				const pol = await SimulatorAPI.getPolygons()

				setPolygons(pol.data.Items)
			} catch (err) {
				console.log(err)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [forceRefresh])

	const deletePolygons = async () => {
		try {
			for (const id of selectedIds) {
				await SimulatorAPI.deletePolygon(id)
			}

			setForceRefresh((old) => old + 1)
		} catch (err) {
			console.log(err)
		}
	}

	const tableActions = (
		<Inline>
			<Button onClick={() => setForceRefresh((old) => old++)}>
				<Icon name='Refresh' color='primary' fontSize='small' />
			</Button>
			<Button onClick={deletePolygons} icon="Delete" disabled={selectedIds.length === 0}>
				Delete
			</Button>
			<Button onClick={handleNewPolygon} variant='primary'>
				Create polygon
			</Button>
		</Inline>
	)

	return (
		<>
			<Table
				tableTitle={'Polygons'}
				columnDefinitions={columnDefinitions}
				items={polygons}
				loading={loading}
				actionGroup={tableActions}
				onSelectionChange={(selectedItems) => setSelectedIds(selectedItems.map(item => item.ID as string))}
				multiSelect={true}
				defaultPageSize={25}
				sortBy={[{ id: 'name', desc: false }]}
				pageSizes={[25, 50, 100]}
				rowCount={polygons.length}
			/>
		</>
	)
}

export default Polygons
