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
import { Construct, Stack } from '@aws-cdk/core'
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline'
import { CodeBuildAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions'
import { CodeArtifactPublisher, CodeArtifactPublisherProps } from './CodeArtifactPublisher'
import { AccountPrincipal, ManagedPolicy, Role } from '@aws-cdk/aws-iam'
import { IRepository, Repository, RepositoryProps } from '@aws-cdk/aws-codecommit'

export interface LernaCodeArtifactPipelineRepositoryProps extends RepositoryProps {
	/**
	 * Indicates if repository is already existing. If undefined, will attempt to detect if already exists.
	 */
	readonly existing?: boolean
}

export interface LernaCodeArtifactPipelineProps {
	readonly pipelineName?: string
	readonly codeCommit: LernaCodeArtifactPipelineRepositoryProps
	readonly codeArtifact: CodeArtifactPublisherProps
	readonly branch?: string
}

export class LernaCodeArtifactPipeline extends Construct {
	readonly pipeline: Pipeline

	readonly repository: IRepository

	constructor (scope: Construct, id: string, props: LernaCodeArtifactPipelineProps) {
		super(scope, id)

		const {
			pipelineName,
			codeCommit: codeCommitProps,
			codeArtifact: codeArtifactProps,
			branch = 'master',
		} = props

		if (codeCommitProps.existing) {
			this.repository = Repository.fromRepositoryName(this, 'CodeRepository-Existing', codeCommitProps.repositoryName)
		} else {
			this.repository = new Repository(this, 'CodeRepository', codeCommitProps)
		}

		// Configure the CodePipeline source - where your CDK App's source code is hosted
		const sourceArtifact = new Artifact()

		this.pipeline = new Pipeline(this, 'Pipeline', {
			pipelineName: pipelineName || `${codeCommitProps.repositoryName}-${branch}`,
			// Mutating a CodePipeline can cause the currently propagating state to be
			// "lost". Ensure we re-run the latest change through the pipeline after it's
			// been mutated so we're sure the latest state is fully deployed through.
			restartExecutionOnUpdate: true,
			// TODO: add pipeline name, based on branch
		})

		this.pipeline.addStage({
			stageName: 'Source',
			actions: [
				new CodeCommitSourceAction({
					actionName: 'CodeCommitSource',
					repository: this.repository,
					branch,
					output: sourceArtifact,
					// TODO: make singleton
					role: new Role(this, 'CodeCommitSourceActionRole', {
						assumedBy: new AccountPrincipal(Stack.of(this).account),
						managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitReadOnly')],
					}),
				}),
			],
		})

		const codeArtifactPublisher = new CodeArtifactPublisher(this, 'CodeArtifactPublisher', codeArtifactProps)

		this.pipeline.addStage({
			stageName: 'Publish',
			actions: [
				new CodeBuildAction({
					actionName: 'Publish-CodeArtifact',
					project: codeArtifactPublisher.pipelineProject,
					input: sourceArtifact,
				}),
			],
		})
	}
}
