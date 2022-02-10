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
import { useHistory } from 'react-router-dom'
import Container from 'aws-northstar/layouts/Container'
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout'
import Flashbar, { FlashbarMessage } from 'aws-northstar/components/Flashbar'
import Inline from 'aws-northstar/layouts/Inline'
import Box from 'aws-northstar/layouts/Box'
import Button from 'aws-northstar/components/Button'
import FormField from 'aws-northstar/components/FormField'
import Input from 'aws-northstar/components/Input'
import Heading from 'aws-northstar/components/Heading'
import { ArrowBackIos, SaveOutlined, Add, Remove } from '@material-ui/icons'
import SimulatorAPI from '../../api/SimulatorAPI'
import { ILatLong } from '../../components/LatLongPairComponent'
import utils from '../../utils'

export type LatLongKey = keyof ILatLong

const NewPolygon: React.FC = () => {
	const [notifications, setNotifications] = useState<FlashbarMessage[]>([])
	const [vertices, setVertices] = useState<ILatLong[]>([{}])
	const [name, setName] = useState('')
	const [loading, setLoading] = useState(false)
	const history = useHistory()

	const handleBackButton = () => {
		history.push('/polygons')
	}

	const addNewLatLong = () => {
		setVertices((old) => [...old, {}])
	}

	const setVertexField = (idx: number, field: LatLongKey, value: number) => {
		const a = [...vertices]
		a[idx][field] = value

		setVertices(a)
	}

	const setVertex = (idx: number) => {
		setVertexField(vertices.length - 1, 'lat', utils.DEFAULT_AREAS[idx].lat)
		setVertexField(vertices.length - 1, 'long', utils.DEFAULT_AREAS[idx].long)
	}

	const removeIdx = (idx: number) => {
		const a = [...vertices]
		a.splice(idx, 1)

		setVertices(a)
	}

	const savePolygon = async () => {
		let missing = false
		vertices.forEach(element => {
			if (!element.lat || !element.long) {
				missing = true
			}
		})

		if (missing || !name) {
			setNotifications((old): FlashbarMessage[] => [...old, {
				type: 'warning',
				header: 'Missing fields',
				content: 'All items are required',
				dismissible: true,
			}])

			return
		}

		try {
			setLoading(true)
			await SimulatorAPI.createPolygon(name, vertices)

			handleBackButton()
		} catch (err) {
			console.error(err)

			setNotifications((old): FlashbarMessage[] => [...old, {
				type: 'error',
				header: 'Error',
				content: 'Error while saving the polygon, please try again',
				dismissible: true,
			}])
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Flashbar items={notifications} />
			<Container
				headingVariant='h2'
				title='Create new Polygon'
				style={{ marginTop: '25px' }}
				footerContent={
					<Inline spacing='s'>
						<Button
							icon={ArrowBackIos}
							onClick={handleBackButton}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							icon={SaveOutlined}
							onClick={savePolygon}
							loading={loading}
						>
							Save
						</Button>
					</Inline>
				}
			>
				<FormField label="Polygon name" controlId="name">
					<Input type="text" controlId="name" placeholder="Name of the simulation" value={name} onChange={(v) => setName(v)} />
				</FormField>
				<Box marginBottom="15px">
					<Heading variant='h4'>Vertices</Heading>
				</Box>
				{vertices.map((vertex, idx) => (
					<Box marginBottom="10px" key={idx}>
						<ColumnLayout renderDivider={false}>
							<Column key="column1">
								<FormField label="Latitude" controlId="lat">
									<Input
										type="number"
										controlId="lat"
										placeholder='eg. 123.45677'
										value={vertex.lat}
										onChange={(v) => setVertexField(idx, 'lat', Number(v))}
									/>
								</FormField>
							</Column>
							<Column key="column2">
								<FormField label="Longitude" controlId="long">
									<Input
										type="number"
										controlId="long"
										placeholder='eg. 123.45677'
										value={vertex.long}
										onChange={(v) => setVertexField(idx, 'long', Number(v))}
									/>
								</FormField>
							</Column>
						</ColumnLayout>
						{idx === vertices.length - 1 && (
							<>
								<Box marginTop="10px">
									<Button variant='link' onClick={() => setVertex(0)}>V1</Button>
									<Button variant='link' onClick={() => setVertex(1)}>V2</Button>
									<Button variant='link' onClick={() => setVertex(2)}>V3</Button>
								</Box>
							</>
						)}
					</Box>
				))}
				<Box marginTop="10px">
					<Inline>
						<Button icon={Add} variant="normal" onClick={addNewLatLong}>Add new item</Button>
						<Button icon={Remove} variant="normal" onClick={() => removeIdx(vertices.length - 1)} disabled={vertices.length < 1}>Remove last item</Button>
					</Inline>
				</Box>
			</Container>
		</>
	)
}

export default NewPolygon
