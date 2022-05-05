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
module.exports = {
	simulatorApiEndpoint: process.env.SIMULATOR_API,
	destinationPasswordSecret: process.env.DESTINATION_PASSWORD_SECRET,
	destinationTable: process.env.DESTINATION_TABLE_NAME,
	destinationExecutionIdIndex: process.env.DESTINATION_EXECUTIONID_INDEX,
	destinationStatusUpdateRule: process.env.DESTINATION_STATUS_UPDATE_RULE_NAME,
	executionId: process.env.EXECUTION_ID,
	simulatorConfigBucket: process.env.SIMULATOR_CONFIG_BUCKET,
	eventsFilePath: process.env.EVENTS_FILE_PATH,
	deliveryType: process.env.DELIVERY_TYPE,
	orderRate: parseInt(process.env.ORDER_RATE),
	orderInterval: process.env.ORDER_INTERVAL,
	rejectionRate: parseFloat(process.env.REJECTION_RATE),
}
