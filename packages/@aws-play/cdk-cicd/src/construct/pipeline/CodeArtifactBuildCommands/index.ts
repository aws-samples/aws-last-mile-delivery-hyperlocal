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
import { flatten } from 'lodash'
import { Stack } from 'aws-cdk-lib'

export interface CodeArtifactRepositoryDefinition {
	/**
	 * The CodeArtifact `domain` to publish packages to.
	 * @see https://docs.aws.amazon.com/codeartifact/latest/ug/codeartifact-concepts.html#welcome-concepts-domain
	 */
	readonly domain: string
	/**
	 * The owner of the CodeArtifact `domain` to publish packages to.
	 * @see https://docs.aws.amazon.com/codeartifact/latest/ug/codeartifact-concepts.html#welcome-concepts-domain
	 */
	readonly domainOwner: string

	/**
	 * The region of the domain.
	 */
	readonly domainRegion: string
	/**
	 * The CodeArtifact `registry` to publish packages to.
	 * @see https://docs.aws.amazon.com/codeartifact/latest/ug/codeartifact-concepts.html#welcome-concepts-repository
	 */
	readonly repositoryName: string

	/**
	 * List of scopes this repository is mapped to.
	 * Example setting scopes to `[@aws-play]` will config the npm registry only for this scope.
	 * Read only scopes shouldn't need to be defined here, as they are mapped in lock files.
	 */
	readonly scopes?: string[]
}

interface CodeArtifaceLoginOptions {
	/**
	 * The CodeArtifact repository to publish artifacts to.
	 */
	readonly repository: CodeArtifactRepositoryDefinition

	/**
	 * List of repositories the build process requires to perform `yarn install`.
	 * All repositories listed here will get authorized during build.
	 * The main `repository` is already authorized and does not need to be included here.
	 */
	readonly readRepositories?: CodeArtifactRepositoryDefinition[]
}

interface LernaPublishOptions {
	/**
	 * The CodeArtifact repository to publish artifacts to.
	 */
	readonly repository: CodeArtifactRepositoryDefinition
}

export const CodeArtifactUtils = {
	formatRepository (repository: CodeArtifactRepositoryDefinition): string {
		return `https:${this.formatRepositoryEndpoint(repository)}`
	},

	formatRepositoryEndpoint (repository: CodeArtifactRepositoryDefinition): string {
		return `//${repository.domain}-${repository.domainOwner}.d.codeartifact.${repository.domainRegion}.amazonaws.com:443/npm/${repository.repositoryName}/`
	},

	formatRepositoryNpmArn (stack: Stack, repository: CodeArtifactRepositoryDefinition, resourceName = '*'): string {
		return stack.formatArn({
			account: repository.domainOwner,
			region: repository.domainRegion,
			service: 'codeartifact',
			resource: 'package',
			resourceName: `${repository.domain}/${repository.repositoryName}/npm/${resourceName}`,
		})
	},
}

export const CodeArtifactBuildCommands = {
	installYarn (): string[] {
		return [
			'curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -',
			'apt-get update -y',
			'apt-get install apt-transport-https',
			// Setup yarn
			'echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list',
			'apt update && apt install yarn',
			'yarn --version',
		]
	},

	codeArtifactLogin (options: CodeArtifaceLoginOptions): string[] {
		const { repository, readRepositories } = options

		return [
			// We need the latest awscli for full codeartifact support
			'pip3 install awscli --upgrade --user',

			// auth token is based on profile, so it is shared between repos, just need to get it once
			`export CODEARTIFACT_AUTH_TOKEN=\`aws codeartifact get-authorization-token --domain ${repository.domain} --domain-owner ${repository.domainOwner} --region ${repository.domainRegion} --query authorizationToken --output text\``,

			// scope are just supported for publishing
			// TODO: rethink this whole scoping stuff based on updated architecture
			...(repository.scopes || []).map(scope => {
				return `npm config set @${scope.replace('@', '')}:registry ${CodeArtifactUtils.formatRepository(repository)}`
			}),

			// Setup CodeArtifact credentials for publish repository and all read repositories
			// TODO: previously we had complex "scope" based permissions defined here... but now prefer simplified single repository for all artifacts.
			// However we will later need to support reading from other repos for development/prerelease handling. This should likely just be done in
			// project .npmrc files, but we still have some assumed handling here that should be cleaned up once finalized approach.
			...flatten((readRepositories || []).concat(repository).map((repo) => {
				if (repo.scopes && repo.scopes.length > 0) {
					console.warn('Scopes are not currently supported in pipeline for read repositories, they will be ignored and should be handled in local .npmrc file', repo.repositoryName, repo.scopes)
				}

				const commands = [
					`npm config set ${CodeArtifactUtils.formatRepositoryEndpoint(repo)}:always-auth=true`,
					`npm config set ${CodeArtifactUtils.formatRepositoryEndpoint(repo)}:_authToken=\${CODEARTIFACT_AUTH_TOKEN}`,
				]

				return commands
			})),
			'npm config ls -l',
		]
	},

	lernaPublish (options: LernaPublishOptions): string[] {
		const { repository } = options

		return [
			'yarn install --frozen-lockfile',
			'yarn build',
			`yarn lerna publish from-package --no-verify-access --yes --registry ${CodeArtifactUtils.formatRepository(repository)}`,
		]
	},
}
