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
	orderTimeoutInSeconds: Number(process.env.ORDER_TIMEOUT_SECONDS) || 300,
	providerOrdersTable: process.env.PROVIDER_ORDERS_TABLE,
	providerLocksTable: process.env.PROVIDER_LOCKS_TABLE,
	eventBusName: process.env.EVENT_BUS,
	streamName: process.env.KINESIS_STREAM,
	serviceName: process.env.SERVICE_NAME,
	instantDeliveryProviderApiSecretName: process.env.INSTANT_DELIVERY_PROVIDER_SECRET_NAME,
	instantDeliveryProviderApiUrl: process.env.INSTANT_DELIVERY_CALLBACK_API_URL,
	graphhopperElbDNS: process.env.GRAPH_HOPPER_ELB_DNS,
	dispatchEngineElbDNS: process.env.DISPATCH_ENGINE_ELB_DNS,
	geoClusteringBias: Number(process.env.GEO_CLUSTERING_BIAS) || 2,
}
