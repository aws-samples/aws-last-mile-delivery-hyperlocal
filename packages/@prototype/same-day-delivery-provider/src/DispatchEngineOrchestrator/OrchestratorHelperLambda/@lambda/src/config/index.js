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
	sameDayDeliveryProviderOrdersTable: process.env.SAME_DAY_DELIVERY_PROVIDER_ORDERS_TABLE,
	sameDayDeliveryProviderOrdersBatchIdIndex: process.env.SAME_DAY_DELIVERY_PROVIDER_ORDERS_BATCH_ID_INDEX,
	eventBusName: process.env.EVENT_BUS,
	serviceName: process.env.SERVICE_NAME,
	// not used for now
	graphhopperElbDNS: process.env.GRAPH_HOPPER_ELB_DNS,
	dispatchEngineElbDNS: process.env.DISPATCH_ENGINE_ELB_DNS,
	geotrackingUrl: process.env.GEOTRACKING_API_URL,
	geoTrackingSecretName: process.env.GEOTRACKING_API_KEY_SECRET_NAME,
	sameDayDirectPudoDeliveryJobsTable: process.env.SAME_DAY_DELIVERY_PUDO_DELIVERY_JOBS_TABLE,
}
