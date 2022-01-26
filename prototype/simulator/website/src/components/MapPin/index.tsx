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
import React, { useContext } from 'react'
import Icon, { IconName } from 'aws-northstar/components/Icon'
import Popover from 'aws-northstar/components/Popover'
import MarkdownViewer from 'aws-northstar/components/MarkdownViewer'
import { MapContext } from 'react-map-gl'
import { convertToObject } from 'typescript'

export type IMapPin = {
	longitude: number
	latitude: number
	iconName?: IconName
	data: any
	color?: string
}

const MapPin: React.FC<IMapPin> = ({ longitude, latitude, data, iconName, color }) => {
	const context = useContext(MapContext)
	const [x, y] = context.viewport?.project([longitude, latitude]) || [undefined, undefined]
	// console.log(color)

	return (
		<>
			{x && y &&
				<div style={{ position: 'absolute', left: x, top: y, color: color }}>
					<Popover
						position='top'
						size="large"
						triggerType="custom"
						content={<MarkdownViewer>{`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``}</MarkdownViewer>}
					>
						<Icon name={iconName || 'PersonPinCircle'} fontSize='large' color={'inherit'} htmlColor={color} />
					</Popover>
				</div>
			}
		</>
	)
}

export default MapPin
