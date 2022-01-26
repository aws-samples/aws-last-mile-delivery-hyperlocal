export {}

declare global {
	namespace NPM {
		/**
		 * NPM package.json schema info
		 * TODO: this is very basic just to get dependency info. Need to build out properly
		 */
		export interface Package {
			name: string
			description: string
			version: string
			dependencies: {
				[key: string]: string
			}
			devDependencies: {
				[key: string]: string
			}
			peerDependencies: {
				[key: string]: string
			}
		}
	}
}
