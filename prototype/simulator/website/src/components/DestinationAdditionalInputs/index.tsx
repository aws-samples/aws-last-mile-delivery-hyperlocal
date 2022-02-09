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
import Modal from 'aws-northstar/components/Modal'
import Button from 'aws-northstar/components/Button'
import FormField from 'aws-northstar/components/FormField'
import Input from 'aws-northstar/components/Input'
import Select from 'aws-northstar/components/Select'

export type IAdditionalInputResults = {
	orders: number
	orderInterval: string
	rejectionRate: number
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
	const [rejectionRate, setRejectionRate] = useState<number>(3)
	const [selectedOption, setSeletedOption] = useState<any>()

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
			orderInterval: selectedOption.value,
			rejectionRate,
		})
	}

	return (
		<Modal
			title="Additional Inputs"
			visible={visible}
			onClose={onClose}
			footer={
				<Button type='button' icon='PlayArrow' onClick={onStart}>
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
		</Modal>
	)
}

export default DestinationAdditionalInputs
