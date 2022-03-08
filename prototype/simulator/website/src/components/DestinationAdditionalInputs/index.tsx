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
import React, { useState, useCallback } from 'react'
import axios from 'axios'
import Modal from 'aws-northstar/components/Modal'
import Button from 'aws-northstar/components/Button'
import FormField from 'aws-northstar/components/FormField'
import Input from 'aws-northstar/components/Input'
import Select from 'aws-northstar/components/Select'
import Text from 'aws-northstar/components/Text'
import FileUpload from 'aws-northstar/components/FileUpload'
import PlayArrow from '@material-ui/icons/PlayArrow'
import api from '../../api/Destination'

export type IAdditionalInputResults = {
	orders: number
	orderInterval: string
	rejectionRate: number
	eventsFilePath?: string
}

export type IAdditionalInput = {
	visible: boolean
	onClose: () => void
	onAccept: (data: IAdditionalInputResults) => void
}

const DestinationAdditionalInputs: React.FC<IAdditionalInput> =
({ visible, onClose, onAccept }): React.ReactElement => {
	const [orders, setOrders] = useState<number>()
	const [errorText, setErrorText] = useState<string>()
	const [uploading, setUploading] = useState<boolean>(false)
	const [rejectionRate, setRejectionRate] = useState<number>(3)
	const [selectedOption, setSeletedOption] = useState<any>()
	const [eventsFilePath, setEventsFilePath] = useState<string>()
	const [errorMessage, setErrorMessage] = useState<string>()

	const options = [
		{ label: 'Second', value: 's' },
		{ label: 'Minute', value: 'm' },
		{ label: 'Hour', value: 'h' },
	]
	const onChange = (event: any) => {
		setSeletedOption(options.find(o => o.value === event.target.value))
	}

	const onStart = () => {
		if (!orders || !rejectionRate || !selectedOption) {
			setErrorText('Required field')

			return
		}

		onAccept({
			orders,
			rejectionRate,
			orderInterval: selectedOption.value,
			eventsFilePath: eventsFilePath,
		})
	}

	const handleOnChange = useCallback(
		async (files) => {
			if (files && files.length > 0) {
				try {
					setErrorMessage('')
					setUploading(true)

					const content = await files[0].text()
					const { name, size, type } = files[0]

					if (content && name && size > 0) {
						const signedUrlResponse = await api.signedUrl({
							filename: name,
						})

						await axios.put(signedUrlResponse.signedUrl, content, {
							headers: {
								'Content-Type': type,
							},
						})

						setEventsFilePath(signedUrlResponse.key)
					}
				} catch (err) {
					console.error('Error uploading file: ', err)

					setErrorMessage('Unable to upload the file, try again')
					setEventsFilePath('')
				} finally {
					setUploading(false)
				}
			}
		},
		[],
	)

	return (
		<Modal
			title="Additional Inputs"
			visible={visible}
			onClose={onClose}
			footer={
				<Button type='button' icon={PlayArrow} onClick={onStart} loading={uploading}>
					Start
				</Button>
			}
		>
			<FormField
				label='Number of orders to send'
				controlId='rOrders'
				errorText={errorText}
			>
				<Input
					type='number'
					controlId='rOrders'
					onChange={(v: string) => setOrders(Number(v))}
					value={orders}
				/>
			</FormField>
			<FormField
				label='Interval to send the orders for'
				controlId='rInterval'
				errorText={errorText}
			>
				<Select
					controlId='rInterval'
					placeholder="Choose an option"
					options={options}
					selectedOption={selectedOption}
					onChange={onChange}
				/>
			</FormField>
			<FormField
				label='Rejection rate (%)'
				errorText={errorText}
				controlId='rRate'
			>
				<Input
					type='number'
					controlId='rRate'
					onChange={(v: string) => setRejectionRate(Number(v))}
					value={rejectionRate}
				/>
			</FormField>
			<hr />
			<FileUpload
				controlId="simulationFile"
				label="Simulation file"
				description="File to be used during the siulation, it will ignore the previous input"
				hintText="You can only upload JSON files"
				accept='application/json'
				onChange={handleOnChange}
			></FileUpload>
			{errorMessage && <Text color='error'>{errorMessage}</Text>}
		</Modal>
	)
}

export default DestinationAdditionalInputs
