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
const geoClustering = require('./geoClustering').execute
const queryDispatch = require('./queryDispatch').execute
const invokeDispatch = require('./invokeDispatch').execute
const sendToDriver = require('./sendToDriver').execute
const sendToKinesis = require('./sendToKinesis').execute
const updateOrdersStatus = require('./updateOrdersStatus').execute
const lockDriver = require('./lockDriver').execute
const releaseDriverLock = require('./releaseDriverLock').execute
const releaseOrdersLock = require('./releaseOrdersLock').execute
const cancelOrders = require('./cancelOrders').execute
const orderTimedOut = require('./orderTimedOut').execute
const filterExpiredOrders = require('./filterExpiredOrders').execute

module.exports = {
	geoClustering,
	queryDispatch,
	invokeDispatch,
	sendToDriver,
	sendToKinesis,
	updateOrdersStatus,
	lockDriver,
	releaseDriverLock,
	releaseOrdersLock,
	cancelOrders,
	orderTimedOut,
	filterExpiredOrders,
}
