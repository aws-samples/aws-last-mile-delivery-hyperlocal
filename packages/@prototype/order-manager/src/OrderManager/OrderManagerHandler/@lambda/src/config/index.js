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
const services = {
	orderService: process.env.ORDER_SERVICE_NAME,
	originService: process.env.ORIGIN_SERVICE_NAME,
	exampleWehookService: process.env.EXAMPLE_WEBHOOK_PROVIDER_SERVICE_NAME,
	examplePollingService: process.env.EXAMPLE_POLLING_PROVIDER_SERVICE_NAME,
	internalWebhookService: process.env.INTERNAL_WEBHOOK_PROVIDER_SERVICE_NAME,
}

module.exports = {
	...services,
	orderOrchestrationStateMachine: process.env.ORDER_ORCHESTRATOR_STATE_MACHINE,
	orderTable: process.env.ORDER_TABLE,
	supportedServices: Object.keys(services).map(q => services[q]),
}
