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
	orderTableName: process.env.ORDER_TABLE_NAME,
	eventBusName: process.env.EVENT_BUS_NAME,
	serviceName: process.env.SERVICE_NAME,
	geofencingArn: process.env.GEOFENCING_ARN,
	geofencingSeviceName: process.env.GEOFENCING_SERVICE_NAME,
	orderManagerServiceName: process.env.ORDER_MANAGER_SERVICE_NAME,
	examplePollingProviderServiceName: process.env.EXAMPLE_POLLING_PROVIDER_SERVICE_NAME,
	exampleWebhookProviderServiceName: process.env.EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME,
	instantDeliveryWebhookProviderServiceName: process.env.INSTANT_DELIVERY_PROVIDER_SERVICE,
}
