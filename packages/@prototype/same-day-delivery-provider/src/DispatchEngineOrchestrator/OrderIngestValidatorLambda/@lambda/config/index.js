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
	dispatchEngineOrchestratorManagerArn: process.env.DISPATCH_ENGINE_MANAGER_ARN,
	sameDayDeliveryProviderOrders: process.env.SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE_NAME,
	sameDayDeliveryProviderOrdersStatusPartitionIndex:
		process.env.SAME_DAY_DELIVERY_PROVIDER_ORDERS_STATUS_PARTITION_INDEX,
	sameDayDeliveryProviderApiSecretName: process.env.SAME_DAY_DELIVERY_PROVIDER_SECRET_NAME,
	sameDayDeliveryProviderApiUrl: process.env.SAME_DAY_DELIVERY_CALLBACK_API_URL,
	orderTimeoutInMinutes: Number(process.env.ORDER_TIMEOUT_MINUTES) || 120,
	orderIngestMaxBatchingWindowMinutes: Number(process.env.MAX_BATCHING_WINDOW_MINUTES) || 30,
	orderIngestMaxBatchingSize: Number(process.env.MAX_BATCHING_SIZE) || 250,
}
