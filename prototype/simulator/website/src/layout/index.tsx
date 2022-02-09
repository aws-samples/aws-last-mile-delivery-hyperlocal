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
import React from 'react'
import { Switch } from 'react-router'
import AppLayout from 'aws-northstar/layouts/AppLayout'
import Box from 'aws-northstar/layouts/Box'
import HeaderComponent from '../components/HeaderComponent'
import HelpComponent from '../components/HelpComponent'
import NavigationBar from '../components/NavigationBar'
import Main from '../pages/Main'
import Simulations from '../pages/Simulations'
import NewSimulation from '../pages/NewSimulation'
import Polygons from '../pages/Polygons'
import NewPolygon from '../pages/NewPolygon'
import SimulationDetails from '../pages/SimulationDetails'
import DriverQuery from '../pages/DriverQuery'
import Orders from '../pages/Orders'
import Origins from '../pages/Origins'
import Destinations from '../pages/Destinations'
import SystemStatus from '../pages/SystemStatus'
import NotFound from '../pages/404'
import AuthRoute from '../components/AuthRoute'
import Dispatching from '../pages/Dispatching'

const Layout: React.FC = (): React.ReactElement => {
	return (
		<Box style={{ overflowX: 'hidden' }}>
			<AppLayout
				header={<HeaderComponent />}
				navigation={<NavigationBar />}
				helpPanel={<HelpComponent />}
			>
				<Switch>
					<AuthRoute exact path='/' component={Main} />
					<AuthRoute exact path='/drivers' component={Simulations} />
					<AuthRoute exact path='/drivers/new' component={NewSimulation} />
					<AuthRoute exact path='/drivers/:simulationId' component={SimulationDetails} />
					<AuthRoute exact path='/driver-query' component={DriverQuery} />
					<AuthRoute exact path='/polygons' component={Polygons} />
					<AuthRoute exact path='/polygons/new' component={NewPolygon} />
					<AuthRoute exact path='/orders' component={Orders} />
					<AuthRoute exact path='/origins' component={Origins} />
					<AuthRoute exact path='/destinations' component={Destinations} />
					<AuthRoute exact path='/dispatching' component={Dispatching} />
					<AuthRoute exact path='/system-status' component={SystemStatus} />
					<AuthRoute component={NotFound} />
				</Switch>
			</AppLayout>
		</Box>
	)
}

export default Layout
