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
export const CodeArtifact = {
	get DomainReadAccess (): string[] {
		return [
			'codeartifact:DescribeDomain',
			'codeartifact:GetAuthorizationToken',
			'codeartifact:ListRepositoriesInDomain',
			'sts:GetServiceBearerToken',
		]
	},

	get DomainContributorAccess (): string[] {
		return [
			...this.DomainReadAccess,
			'codeartifact:CreateRepository',
			'codeartifact:GetDomainPermissionsPolicy',
		]
	},

	/**
	 * Provides full access to CodeArtifact `domain`.
	 * *NOTE: Does not grant access to `repositories` within domain.
	 * Use `AdminAccess` for both `domain` and `repository` access.
	 */
	get DomainFullAccess (): string[] {
		return [
			...this.DomainContributorAccess,
			'codeartifact:DeleteDomain',
			'codeartifact:DeleteDomainPermissionsPolicy',
			'codeartifact:PutDomainPermissionsPolicy',
		]
	},

	get RepositoryReadAccess (): string[] {
		return [
			'codeartifact:DescribePackageVersion',
			'codeartifact:DescribeRepository',
			'codeartifact:GetPackageVersionReadme',
			'codeartifact:GetRepositoryEndpoint',
			'codeartifact:ListPackageVersionAssets',
			'codeartifact:ListPackageVersionDependencies',
			'codeartifact:ListPackageVersions',
			'codeartifact:ListPackages',
			'codeartifact:ReadFromRepository',
		]
	},

	get RepositoryReadPublishAccess (): string[] {
		return [
			...this.RepositoryReadAccess,
			'codeartifact:PublishPackageVersion',
			'codeartifact:PutPackageMetadata',
		]
	},

	get RepositoryFullAccess (): string[] {
		return [
			...this.RepositoryReadPublishAccess,
			'codeartifact:AssociateExternalConnection',
			'codeartifact:CopyPackageVersions',
			'codeartifact:DeletePackageVersions',
			'codeartifact:DeleteRepository',
			'codeartifact:DeleteRepositoryPermissionsPolicy',
			'codeartifact:DisassociateExternalConnection',
			'codeartifact:DisposePackageVersions',
			'codeartifact:PutRepositoryPermissionsPolicy',
			'codeartifact:UpdatePackageVersionsStatus',
			'codeartifact:UpdateRepository',
		]
	},

	get FullAccess (): string[] {
		return [
			'codeartifact:*',
		]
	},
}
