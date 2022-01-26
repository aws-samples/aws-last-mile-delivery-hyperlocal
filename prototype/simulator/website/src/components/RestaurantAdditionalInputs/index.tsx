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
	rejectionRate: number
}

export type IAdditionalInput = {
	visible: boolean
	onClose: () => void
	onAccept: (data: IAdditionalInputResults) => void
}

const RestaurantAdditionalInputs: React.FC<IAdditionalInput> = ({ visible, onClose, onAccept }): React.ReactElement => {
	const [errorText, setErrorText] = useState<string>()
	const [rejectionRate, setRejectionRate] = useState<number>(3)

	const onStart = () => {
		if (!rejectionRate) {
			setErrorText('Required field')

			return
		}

		onAccept({
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

export default RestaurantAdditionalInputs
