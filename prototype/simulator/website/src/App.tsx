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
import React, { ReactElement } from 'react'
import { AuthProvider } from './providers/AuthProvider'
import { Route, Switch } from 'react-router'
import { useHistory } from 'react-router-dom'
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider'
import Layout from './layout'
import Login from './pages/Login'
import Logout from './pages/Logout'
import NewPassword from './pages/NewPassword'
import AuthRoute from './components/AuthRoute'

const App: React.FC = (): ReactElement => {
	const history = useHistory()

	const handleLogin = () => {
		history.push('/')
	}

	const handleLogout = () => {
		history.push('/login')
	}

	const handleChallenge = (challengeName: string) => {
		switch (challengeName) {
			case 'NEW_PASSWORD_REQUIRED':
				history.push('/new-password')

				return
			default:
				history.push('/login')
		}

		console.warn(challengeName)
	}

	return (
		<NorthStarThemeProvider>
			<AuthProvider onLogin={handleLogin} onLogout={handleLogout} onChallenge={handleChallenge}>
				<Switch>
					<Route path="/login" exact component={Login} />
					<Route path="/logout" exact component={Logout} />
					<Route path="/new-password" exact component={NewPassword} />
					<AuthRoute path="/" component={Layout} />
				</Switch>
			</AuthProvider>
		</NorthStarThemeProvider>
	)
}

export default App
