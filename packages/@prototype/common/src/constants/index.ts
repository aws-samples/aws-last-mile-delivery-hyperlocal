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
export const SERVICE_NAME = {
	ORDER_SERVICE: 'com.aws.proto.order',
	ORDER_MANAGER: 'com.aws.proto.order.manager',
	DISPATCH_ENGINE: 'com.aws.proto.dispatchEngine',
	GEOFENCING_SERVICE: 'com.aws.proto.geofencing',
	DRIVER_SERVICE: 'com.aws.proto.driver',
	DESTINATION_SERVICE: 'com.aws.proto.destination',
	ORIGIN_SERVICE: 'com.aws.proto.origin',
	EXAMPLE_POLLING_PROVIDER_SERVICE: 'com.aws.proto.provider.examplePollingProvider',
	EXAMPLE_WEBHOOK_PROVIDER_SERVICE: 'com.aws.proto.provider.exampleWebhookProvider',
	INSTANT_DELIVERY_PROVIDER_SERVICE: 'com.aws.proto.provider.instantDeliveryProvider',
}

export const PROVIDER_NAME = {
	EXAMPLE_POLLING_PROVIDER: 'ExamplePollingProvider',
	EXAMPLE_WEBHOOK_PROVIDER: 'ExampleWebhookProvider',
	INSTANT_DELIVERY_PROVIDER: 'InstantDeliveryProvider',
}

export const DEMOGRAPHIC_AREA = {
	CENTRAL_JAKARTA: 'Central Jakarta',
	WEST_JAKARTA: 'West Jakarta',
	SOUTH_JAKARTA: 'South Jakarta',
	NORTH_JAKARTA: 'North Jakarta',
	EAST_JAKARTA: 'East Jakarta',
}

export const STATIC_AREAS_POLYGON = {
	AREA1: [
		{
			long: 106.78573608398438,
			lat: -6.132362249080842,
		},
		{
			long: 106.79603576660156,
			lat: -6.150453925445967,
		},
		{
			long: 106.79483413696289,
			lat: -6.1533553634802605,
		},
		{
			long: 106.79088592529297,
			lat: -6.163424937254352,
		},
		{
			long: 106.78985595703124,
			lat: -6.171616991899985,
		},
		{
			long: 106.79672241210938,
			lat: -6.178784935825187,
		},
		{
			long: 106.79929733276367,
			lat: -6.199264240303361,
		},
		{
			long: 106.82401657104492,
			lat: -6.233394646324949,
		},
		{
			long: 106.83757781982422,
			lat: -6.240391105690608,
		},
		{
			long: 106.84976577758789,
			lat: -6.241756257604386,
		},
		{
			long: 106.8643569946289,
			lat: -6.241414969959423,
		},
		{
			long: 106.87431335449219,
			lat: -6.245681049537433,
		},
		{
			long: 106.87688827514648,
			lat: -6.2395378839383016,
		},
		{
			long: 106.87379837036133,
			lat: -6.2294697624022195,
		},
		{
			long: 106.87259674072266,
			lat: -6.212575362017247,
		},
		{
			long: 106.87191009521484,
			lat: -6.200800156119922,
		},
		{
			long: 106.87362670898438,
			lat: -6.194485806945051,
		},
		{
			long: 106.87482833862305,
			lat: -6.174518314223994,
		},
		{
			long: 106.87826156616211,
			lat: -6.166155636198615,
		},
		{
			long: 106.8889045715332,
			lat: -6.145163027098804,
		},
		{
			long: 106.89147949218749,
			lat: -6.1327036071518854,
		},
		{
			long: 106.87980651855469,
			lat: -6.126900490235312,
		},
		{
			long: 106.8614387512207,
			lat: -6.1229748165410856,
		},
		{
			long: 106.85714721679688,
			lat: -6.126047085365903,
		},
		{
			long: 106.83843612670898,
			lat: -6.13031409606636,
		},
		{
			long: 106.81938171386719,
			lat: -6.132874286105464,
		},
		{
			long: 106.81354522705077,
			lat: -6.130655455448263,
		},
		{
			long: 106.80307388305664,
			lat: -6.13321564384872,
		},
		{
			long: 106.78573608398438,
			lat: -6.132362249080842,
		},
	],
	AREA2: [
		{
			long: 106.71329498291016,
			lat: -6.0968598188879355,
		},
		{
			long: 106.6878890991211,
			lat: -6.113245848715275,
		},
		{
			long: 106.68685913085938,
			lat: -6.117683645476741,
		},
		{
			long: 106.68685913085938,
			lat: -6.128948656354494,
		},
		{
			long: 106.68342590332031,
			lat: -6.135093107529973,
		},
		{
			long: 106.66866302490234,
			lat: -6.140554782450295,
		},
		{
			long: 106.66213989257812,
			lat: -6.148064493999533,
		},
		{
			long: 106.66213989257812,
			lat: -6.156939470946354,
		},
		{
			long: 106.65458679199219,
			lat: -6.169568990105866,
		},
		{
			long: 106.6549301147461,
			lat: -6.178784935825187,
		},
		{
			long: 106.65287017822266,
			lat: -6.186635429683865,
		},
		{
			long: 106.65458679199219,
			lat: -6.1907312932460465,
		},
		{
			long: 106.6549301147461,
			lat: -6.1996055553158005,
		},
		{
			long: 106.6611099243164,
			lat: -6.209503594551114,
		},
		{
			long: 106.66797637939453,
			lat: -6.214964502097392,
		},
		{
			long: 106.68445587158203,
			lat: -6.210527519031174,
		},
		{
			long: 106.70059204101562,
			lat: -6.201994754217926,
		},
		{
			long: 106.7208480834961,
			lat: -6.188683365433652,
		},
		{
			long: 106.73389434814453,
			lat: -6.1903899724953,
		},
		{
			long: 106.7654800415039,
			lat: -6.189024687286995,
		},
		{
			long: 106.77921295166016,
			lat: -6.1832221858026,
		},
		{
			long: 106.79054260253905,
			lat: -6.1811742288990965,
		},
		{
			long: 106.79054260253905,
			lat: -6.177419620653995,
		},
		{
			long: 106.7867660522461,
			lat: -6.173323654015037,
		},
		{
			long: 106.78642272949219,
			lat: -6.165472962780473,
		},
		{
			long: 106.79157257080078,
			lat: -6.1548914124977525,
		},
		{
			long: 106.79019927978514,
			lat: -6.1507952719189785,
		},
		{
			long: 106.7816162109375,
			lat: -6.1327036071518854,
		},
		{
			long: 106.77268981933594,
			lat: -6.123828226321055,
		},
		{
			long: 106.76753997802734,
			lat: -6.124169589851178,
		},
		{
			long: 106.74179077148438,
			lat: -6.123828226321055,
		},
		{
			long: 106.73046112060547,
			lat: -6.1159768049268965,
		},
		{
			long: 106.71329498291016,
			lat: -6.0968598188879355,
		},
	],
	AREA3: [
		{
			long: 106.66849136352539,
			lat: -6.218548191874777,
		},
		{
			long: 106.6727828979492,
			lat: -6.223497056650201,
		},
		{
			long: 106.67501449584961,
			lat: -6.227080688253128,
		},
		{
			long: 106.6746711730957,
			lat: -6.231688178661453,
		},
		{
			long: 106.66746139526367,
			lat: -6.246192976751192,
		},
		{
			long: 106.66694641113281,
			lat: -6.249093888171772,
		},
		{
			long: 106.6720962524414,
			lat: -6.254383744059148,
		},
		{
			long: 106.67621612548828,
			lat: -6.260014822154807,
		},
		{
			long: 106.68428421020506,
			lat: -6.272641867408254,
		},
		{
			long: 106.68737411499023,
			lat: -6.279637801378429,
		},
		{
			long: 106.69166564941406,
			lat: -6.285268606790822,
		},
		{
			long: 106.69578552246094,
			lat: -6.2919231164232485,
		},
		{
			long: 106.69681549072264,
			lat: -6.29772441427049,
		},
		{
			long: 106.70110702514648,
			lat: -6.29977191568369,
		},
		{
			long: 106.70265197753906,
			lat: -6.300454414359868,
		},
		{
			long: 106.70951843261719,
			lat: -6.294823773446234,
		},
		{
			long: 106.71913146972656,
			lat: -6.292605625415009,
		},
		{
			long: 106.72239303588867,
			lat: -6.289022443208887,
		},
		{
			long: 106.72616958618164,
			lat: -6.288169300947852,
		},
		{
			long: 106.73234939575195,
			lat: -6.282538526926375,
		},
		{
			long: 106.73973083496094,
			lat: -6.279125906956927,
		},
		{
			long: 106.74599647521973,
			lat: -6.273921618447204,
		},
		{
			long: 106.74882888793945,
			lat: -6.270082355905161,
		},
		{
			long: 106.75003051757812,
			lat: -6.263342248861624,
		},
		{
			long: 106.75174713134764,
			lat: -6.262147790432094,
		},
		{
			long: 106.7556095123291,
			lat: -6.262830338440737,
		},
		{
			long: 106.75895690917967,
			lat: -6.261294604166597,
		},
		{
			long: 106.75990104675293,
			lat: -6.2567726936923105,
		},
		{
			long: 106.7607593536377,
			lat: -6.251909463287963,
		},
		{
			long: 106.76281929016113,
			lat: -6.249605812047297,
		},
		{
			long: 106.76350593566895,
			lat: -6.249861773797215,
		},
		{
			long: 106.78204536437988,
			lat: -6.241585613809702,
		},
		{
			long: 106.78213119506836,
			lat: -6.235613045988124,
		},
		{
			long: 106.78762435913086,
			lat: -6.225715498144566,
		},
		{
			long: 106.7922592163086,
			lat: -6.214964502097392,
		},
		{
			long: 106.79397583007812,
			lat: -6.21308732151894,
		},
		{
			long: 106.79809570312499,
			lat: -6.204383942293507,
		},
		{
			long: 106.79912567138672,
			lat: -6.203189349609291,
		},
		{
			long: 106.79569244384766,
			lat: -6.186123444506508,
		},
		{
			long: 106.79500579833984,
			lat: -6.179808919892202,
		},
		{
			long: 106.79157257080078,
			lat: -6.185270134775632,
		},
		{
			long: 106.7812728881836,
			lat: -6.186635429683865,
		},
		{
			long: 106.76856994628906,
			lat: -6.191413934085869,
		},
		{
			long: 106.7373275756836,
			lat: -6.192779213118479,
		},
		{
			long: 106.72325134277344,
			lat: -6.19175525417492,
		},
		{
			long: 106.70471191406249,
			lat: -6.2037013182340495,
		},
		{
			long: 106.6892623901367,
			lat: -6.213940586248378,
		},
		{
			long: 106.66849136352539,
			lat: -6.218548191874777,
		},
	],
}
