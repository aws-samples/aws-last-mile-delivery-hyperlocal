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
import React, { useContext, useState } from 'react'
import Form from 'aws-northstar/components/Form'
import Button from 'aws-northstar/components/Button'
import Flashbar, { FlashbarMessage } from 'aws-northstar/components/Flashbar'
import FormField from 'aws-northstar/components/FormField'
import FormSection from 'aws-northstar/components/FormSection'
import Input from 'aws-northstar/components/Input'
import Box from 'aws-northstar/layouts/Box'
import { AuthContext } from '../../context/AuthContext'
import UserApi from '../../api/UserAPI'

const Login: React.FC = () => {
	const [notifications, setNotifications] = useState<FlashbarMessage[]>([])
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)

	const { setUser } = useContext(AuthContext)

	const performLogin = async () => {
		try {
			setLoading(true)
			const user = await UserApi.login(username, password)

			setUser(user)
		} catch (err: any) {
			console.error('Login: ', err)
			setNotifications((old): FlashbarMessage[] => [...old, {
				type: 'error',
				header: 'Error',
				content: err.message,
				dismissible: true,
			}])
		} finally {
			setLoading(false)
		}
	}

	return (
		<Box display="flex" alignItems='center' flexDirection='column' justifyContent='center' height='100%'>
			<Box width='50%'>
				<Flashbar items={notifications} />
				<Form
					header=''
					actions={<Button variant='primary' onClick={performLogin} loading={loading}>Login</Button>}
				>
					<FormSection header='Login'>
						<FormField
							label='Email'
							hintText='Type your email: username@domain.ext'
							controlId='email'
						>
							<Input
								type='email'
								controlId='email'
								value={username}
								onChange={(v) => setUsername(v)}
							/>
						</FormField>
						<FormField
							label='Password'
							hintText='Type your password'
							controlId='password'
						>
							<Input
								type='password'
								controlId='password'
								value={password}
								onChange={(v) => setPassword(v)}
							/>
						</FormField>
					</FormSection>
				</Form>
			</Box>
		</Box>
	)
}

export default Login
