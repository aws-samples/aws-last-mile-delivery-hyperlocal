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
import { PipelineProject, BuildSpec, LinuxBuildImage, ComputeType, BuildEnvironment } from '@aws-cdk/aws-codebuild'
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { Construct, Stack } from '@aws-cdk/core'
import { ServicePrincipals } from 'cdk-constants'
import { CodeArtifactBuildCommands, CodeArtifactRepositoryDefinition, CodeArtifactUtils } from '../CodeArtifactBuildCommands'

export interface CodeArtifactPublisherProps {
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

	readonly buildEnvironment?: BuildEnvironment
}

export class CodeArtifactPublisher extends Construct {
		readonly pipelineProject: PipelineProject

		constructor (scope: Construct, id: string, props: CodeArtifactPublisherProps) {
			super(scope, id)

			const { repository, readRepositories, buildEnvironment } = props

			this.pipelineProject = new PipelineProject(this, 'PipelineProject', {
				buildSpec: BuildSpec.fromObject({
					version: '0.2',
					phases: {
						install: {
							commands: CodeArtifactBuildCommands.installYarn(),
						},
						pre_build: {
							commands: CodeArtifactBuildCommands.codeArtifactLogin({
								repository,
								readRepositories,
							}),
						},
						build: {
							commands: CodeArtifactBuildCommands.lernaPublish({ repository }),
						},
					},
				}),
				environment: {
					buildImage: LinuxBuildImage.STANDARD_2_0,
					computeType: ComputeType.MEDIUM,
					...buildEnvironment || {},
				},
				role: new Role(this, 'Role', {
					assumedBy: new ServicePrincipal(ServicePrincipals.CODE_BUILD),
					inlinePolicies: {
						codeAtrifact: new PolicyDocument({
							statements: [
								new PolicyStatement({
									effect: Effect.ALLOW,
									actions: [
										'codeartifact:GetAuthorizationToken',
										'codeartifact:GetRepositoryEndpoint',
										'codeartifact:ReadFromRepository',
									],
									resources: ['*'],
								}),
								new PolicyStatement({
									effect: Effect.ALLOW,
									actions: [
										'codeartifact:PublishPackageVersion',
									],
									// Grant write permissions to scope only if provided
									resources: repository.scopes == null ? ['*'] : repository.scopes.map((scope) => {
										return CodeArtifactUtils.formatRepositoryNpmArn(Stack.of(this), repository, `${scope.replace('@', '')}/*`)
									}),
								}),
								new PolicyStatement({
									effect: Effect.ALLOW,
									actions: [
										'sts:GetServiceBearerToken',
									],
									resources: ['*'],
									conditions: {
										StringEquals: {
											'sts:AWSServiceName': 'codeartifact.amazonaws.com',
										},
									},
								}),
							],
						}),
					},
				}),
			})
		}
}
