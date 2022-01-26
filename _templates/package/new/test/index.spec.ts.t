---
to: <%= packageDir %>/test/index.spec.ts
---
import <%= h.changeCase.camel(name) %> from '../src'

describe('<%= packageName %>', () => {
	test('module exists', () => {
		expect(<%= h.changeCase.camel(name) %>).toBeDefined()
	})
})
