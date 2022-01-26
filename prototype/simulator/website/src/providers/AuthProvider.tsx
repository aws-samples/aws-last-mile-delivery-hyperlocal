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
import React, { useEffect, useMemo } from 'react'
import { usePrevious } from '../hooks/usePrevious'
import { usePersistedState } from '../hooks/usePersistedState'
import { AuthContext, ICurrentUser } from '../context/AuthContext'

export type AuthProviderProps = {
	defaultCurrentUser?: ICurrentUser
  onLogin?: () => void
  onLogout?: () => void
  onChallenge?: (name: string) => void
};

export const AuthProvider: React.FC<AuthProviderProps> = ({
	defaultCurrentUser = {
		isAuthenticated: false,
	},
	onLogin,
	onLogout,
	onChallenge,
	children,
}) => {
	const [user, setUser] = usePersistedState(
		'currentUser',
		defaultCurrentUser,
	)

	const previousAuthenticated = usePrevious(user.isAuthenticated)

	useEffect(() => {
		if (!previousAuthenticated && user.isAuthenticated) {
			onLogin && onLogin()
		}
	}, [previousAuthenticated, user, onLogin])

	useEffect(() => {
		if (previousAuthenticated && !user.isAuthenticated) {
			onLogout && onLogout()
		}
	}, [previousAuthenticated, user, onLogout])

	const previousChallenge = usePrevious(user.challengeName)
	useEffect(() => {
		if (previousChallenge !== user.challengeName) {
			onChallenge && onChallenge(user.challengeName)
		}
	}, [previousChallenge, user, onChallenge])

	const contextValue = useMemo(
		() => ({
			user,
			setUser,
		}),
		[user, setUser],
	)

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	)
}
