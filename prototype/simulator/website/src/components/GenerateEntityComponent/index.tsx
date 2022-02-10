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
import Container from 'aws-northstar/layouts/Container'
import Stack from 'aws-northstar/layouts/Stack'
import Box from 'aws-northstar/layouts/Box'
import LatLongPair, { ILatLong } from '../LatLongPairComponent'
import Button from 'aws-northstar/components/Button'
import Inline from 'aws-northstar/layouts/Inline'
import Input from 'aws-northstar/components/Input'
import FormField from 'aws-northstar/components/FormField'
import { PlayArrow } from '@material-ui/icons'
import utils from '../../utils'

export type IEntity = {
  coordinates?: ILatLong
  batchSize?: number
	radius?: number
}

export type EntityDetailsComponent = {
  entityName: string
  onGenerate: (entity: IEntity) => void
}

const GenerateEntityComponent: React.FC<EntityDetailsComponent> = ({ entityName, onGenerate }) => {
	const [coordinates, setCoordinates] = useState<ILatLong>()
	const [batchSize, setBatchSize] = useState<number>()
	const [radius, setRadius] = useState<number>()
	const generateHandler = () => {
		onGenerate && onGenerate({ coordinates, batchSize, radius })

		setBatchSize(undefined)
		setCoordinates(undefined)
		setRadius(undefined)
	}

	return (
		<Container
			headingVariant='h2'
			title={`Generate new ${entityName}`}
			style={{ marginTop: '25px', minWidth: '100%' }}
			footerContent={
				<Button
					variant="primary"
					icon={PlayArrow}
					onClick={generateHandler}
				>
          Generate
				</Button>
			}
		>
			<Inline>
				<Stack spacing='s'>
					<LatLongPair onChange={(v: ILatLong) => setCoordinates(v)} value={coordinates} />
					<Inline>
						<Button variant='link' size='small' onClick={() => setCoordinates(utils.DEFAULT_AREAS[0])}>Area 1</Button>
						<Button variant='link' size='small' onClick={() => setCoordinates(utils.DEFAULT_AREAS[1])}>Area 2</Button>
						<Button variant='link' size='small' onClick={() => setCoordinates(utils.DEFAULT_AREAS[2])}>Area 3</Button>
					</Inline>
				</Stack>
				<FormField
					label={`${entityName} #`}
					controlId='rNumber'
				>
					<Box width='120px'>
						<Input
							type='number'
							controlId='rNumber'
							onChange={(v: string) => setBatchSize(Number(v))}
							value={batchSize}
						/>
					</Box>
				</FormField>
				<FormField
					label={'Radius'}
					controlId='rRadius'
				>
					<Box width='120px'>
						<Input
							type='number'
							controlId='rNumber'
							onChange={(v: string) => setRadius(Number(v))}
							value={radius}
						/>
					</Box>
				</FormField>
			</Inline>
		</Container>
	)
}

export default GenerateEntityComponent
