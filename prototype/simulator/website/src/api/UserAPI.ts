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
import { Auth } from 'aws-amplify'
import { ICurrentUser } from '../context/AuthContext'

const login = async (username: string, password: string): Promise<ICurrentUser> => {
	const user = await Auth.signIn(username, password)

	if (user.signInUserSession) {
		if (
			!user.signInUserSession.accessToken ||
      !user.signInUserSession.accessToken.payload['cognito:groups'] ||
      !user.signInUserSession.accessToken.payload['cognito:groups'].includes('Administrators')
		) {
			await Auth.signOut()

			// eslint-disable-next-line no-throw-literal
			throw {
				code: 'InvalidGroupException',
				message: 'You are not authorized to perform this action',
				toString: (): string => ((this || {}) as any).message,
			}
		}
	}

	return {
		...user.attributes,
		challengeName: user.challengeName,
		username,
		isAuthenticated: !!user.signInUserSession,
	}
}

const completeNewPassword = async (
	username: string,
	oldPassword: string,
	newPassword: string,
): Promise<ICurrentUser> => {
	const currentUser = await Auth.signIn(username, oldPassword)
	await Auth.completeNewPassword(currentUser, newPassword, {
		// to avoid building the ui
		phone_number: '+6512345678',
	})

	return {
		// force to re-login with the new password
		isAuthenticated: false,
	}
}

const forgotPassword = (username: string): Promise<any> => {
	return Auth.forgotPassword(username)
}

const confirmForgot = (username: string, code: string, password: string): Promise<any> => {
	return Auth.forgotPasswordSubmit(username, code, password)
}

const logout = async (): Promise<ICurrentUser> => {
	await Auth.signOut()

	return {
		isAuthenticated: false,
	}
}

export default {
	login,
	logout,
	completeNewPassword,
	forgotPassword,
	confirmForgot,
}
