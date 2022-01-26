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
import SideNavigation, {
	SideNavigationItemType,
} from 'aws-northstar/components/SideNavigation'

const navigationItems = [
	{ type: SideNavigationItemType.LINK, text: 'Home', href: '/' },
	{
		type: SideNavigationItemType.LINK,
		text: 'System Status',
		href: '/system-status',
	},
	{ type: SideNavigationItemType.DIVIDER },
	{
		type: SideNavigationItemType.SECTION,
		text: 'Simulators',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Customer simulator',
		href: '/customers',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Restaurant simulator',
		href: '/restaurants',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Driver simulator',
		href: '/drivers',
	},
	{ type: SideNavigationItemType.DIVIDER },
	{
		type: SideNavigationItemType.SECTION,
		text: 'Orders',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Orders list',
		href: '/orders',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Dispatching',
		href: '/dispatching',
	},
	{ type: SideNavigationItemType.DIVIDER },
	{
		type: SideNavigationItemType.SECTION,
		text: 'Etc',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Polygons',
		href: '/polygons',
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Driver Query',
		href: '/driver-query',
	},
	{
		type: SideNavigationItemType.DIVIDER,
	},
	{
		type: SideNavigationItemType.LINK,
		text: 'Logout',
		href: '/logout',
	},
]

const NavigationBar: React.FC = (): React.ReactElement => (
	<SideNavigation
		header={{
			href: '/',
			text: 'Simulator',
		}}
		items={navigationItems}
	/>
)

export default NavigationBar
