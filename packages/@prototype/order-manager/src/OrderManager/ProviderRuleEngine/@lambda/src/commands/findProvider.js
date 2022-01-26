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
/* eslint-disable no-console */
const config = require('../config')
const ddb = require('../lib/dynamoDB')
const engine = require('../engine')

const eng = engine.initialiseEngine()
let demographicAreas = null

const execute = async (payload) => {
	console.log('Executing findProvider with payload')
	console.log(JSON.stringify(payload))

	if (!demographicAreas) {
		console.log('Reading demographic areas')

		const res = await ddb.scan(config.demographicAreaSettingsTable)
		demographicAreas = res.Items

		console.debug('Retrieved: ')
		console.debug(JSON.stringify(res.Items))
	}

	const { tags } = payload.restaurant

	if (!tags) {
		throw new Error('No configuration available for the restaurant. Missing tags')
	}

	// TODO: the system assumes that there's only one tag at this point for simplicity
	// it can be extended in order to accommodate multiple tags and use priority rule to merge configurations
	const demographicArea = tags[0]
	const area = demographicAreas.find(q => q.ID === demographicArea)

	if (!area) {
		throw new Error('No configuration available for demographic area: ' + demographicArea)
	}

	const rules = area.rules

	if (!rules || rules.length === 0) {
		throw new Error('No rules defined for demographic area: ' + demographicArea)
	}

	for (const rule of rules) {
		eng.addRule(rule)
	}

	const engineRules = await eng.run(payload)

	console.debug('Results from rule engine: ')
	console.debug(JSON.stringify(engineRules))

	const providers = engineRules.events.filter(q => !!q.params).map(q => q.params.provider)

	for (const rule of rules) {
		eng.removeRule(rule.name)
	}

	return {
		// take the first found, which has high-priority
		// otherwise if empty results send null
		provider: providers.length === 0 ? null : providers[0],
	}
}

module.exports = {
	execute,
}
