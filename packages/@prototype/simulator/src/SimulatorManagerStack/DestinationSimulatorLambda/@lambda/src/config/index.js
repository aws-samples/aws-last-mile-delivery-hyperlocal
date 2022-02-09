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
	iotEndpoint: process.env.IOT_ENDPOINT,
	customerSimulationTable: process.env.CUSTOMER_SIMULATIONS_TABLE_NAME,
	customerStatsTable: process.env.CUSTOMER_STATS_TABLE_NAME,
	customerGeneratorStepFunctions: process.env.CUSTOMER_GENERATOR_STEP_FUNCTIONS_ARN,
	customerStarterStepFunctions: process.env.CUSTOMER_STARTER_STEP_FUNCTIONS_ARN,
	customerEraserStepFunctions: process.env.CUSTOMER_ERASER_STEP_FUNCTIONS_ARN,
	customerContainerBatchSize: Number(process.env.CUSTOMER_CONTAINER_BATCH_SIZE) || 10,
	// 25 is the max value
	customerDeleteBatchSize: Number(process.env.CUSTOMER_DELETE_BATCH_SIZE) || 25,
}
