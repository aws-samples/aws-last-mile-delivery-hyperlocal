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
import { Construct } from 'constructs'
import { Stack, aws_codepipeline as codepipeline, aws_codepipeline_actions as codepipeline_actions, aws_iam as iam, aws_codecommit as codecommit } from 'aws-cdk-lib'
import { CodeArtifactPublisher, CodeArtifactPublisherProps } from './CodeArtifactPublisher'

export interface LernaCodeArtifactPipelineRepositoryProps extends codecommit.RepositoryProps {
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
	readonly pipeline: codepipeline.Pipeline

	readonly repository: codecommit.IRepository

	constructor (scope: Construct, id: string, props: LernaCodeArtifactPipelineProps) {
		super(scope, id)

		const {
			pipelineName,
			codeCommit: codeCommitProps,
			codeArtifact: codeArtifactProps,
			branch = 'master',
		} = props

		if (codeCommitProps.existing) {
			this.repository = codecommit.Repository.fromRepositoryName(this, 'CodeRepository-Existing', codeCommitProps.repositoryName)
		} else {
			this.repository = new codecommit.Repository(this, 'CodeRepository', codeCommitProps)
		}

		// Configure the CodePipeline source - where your CDK App's source code is hosted
		const sourceArtifact = new codepipeline.Artifact()

		this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
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
				new codepipeline_actions.CodeCommitSourceAction({
					actionName: 'CodeCommitSource',
					repository: this.repository,
					branch,
					output: sourceArtifact,
					// TODO: make singleton
					role: new iam.Role(this, 'CodeCommitSourceActionRole', {
						assumedBy: new iam.AccountPrincipal(Stack.of(this).account),
						managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitReadOnly')],
					}),
				}),
			],
		})

		const codeArtifactPublisher = new CodeArtifactPublisher(this, 'CodeArtifactPublisher', codeArtifactProps)

		this.pipeline.addStage({
			stageName: 'Publish',
			actions: [
				new codepipeline_actions.CodeBuildAction({
					actionName: 'Publish-CodeArtifact',
					project: codeArtifactPublisher.pipelineProject,
					input: sourceArtifact,
				}),
			],
		})
	}
}
