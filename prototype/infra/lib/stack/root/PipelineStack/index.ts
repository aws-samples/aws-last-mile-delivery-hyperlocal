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
import * as fs from 'fs'
import * as path from 'path'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines'
import { action } from '@aws-play/cdk-constants'
import * as codebuild from '@aws-cdk/aws-codebuild'
import * as codecommit from '@aws-cdk/aws-codecommit'
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions'
import { setNamespace, namespaced } from '@aws-play/cdk-core'
import { CodeArtifactBuildCommands } from '@aws-play/cdk-cicd'
import { BackendStage } from './stage/BackendStage'
import { getArtifactRepository } from './npm-registry'
import BackendStageProps from './stage/BackendStageProps'

const ROOT_DIR = path.resolve(__dirname, '../../../../../../')
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const packageInfo: NPM.Package = JSON.parse(
	fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'),
)

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PipelineStackProps extends StackProps, BackendStageProps {}

interface SynthActionProperties extends codepipeline.ActionProperties {
	project?: codebuild.PipelineProject
}

/**
 * Pipeline stack that manages and deploys the stacks. Handles stages and orchestration.
 * @see https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html
 */
export class PipelineStack extends Stack {
	constructor (scope: Construct, id: string, props: PipelineStackProps) {
		super(scope, id, props)

		setNamespace(this, props.namespace)

		// get the npm registry from .npmrc file used for authentication
		const artifactRepository = getArtifactRepository()

		const sourceArtifact = new codepipeline.Artifact()
		const cloudAssemblyArtifact = new codepipeline.Artifact()

		const synthAction = new SimpleSynthAction({
			sourceArtifact,
			cloudAssemblyArtifact,
			installCommand: [
				'cd $CODEBUILD_SRC_DIR',
				// HANDOFF: This only applies during engagmenet and can be removed post handoff.
				...artifactRepository == null ? [] : CodeArtifactBuildCommands.codeArtifactLogin({
					repository: {
						domain: 'aws-proto',
						domainOwner: '191433347007',
						domainRegion: 'us-west-2',
						repositoryName: artifactRepository,
					},
				}),
				'yarn install --frozen-lockfile',
			].join(' && '),
			buildCommand: [
				'cd $CODEBUILD_SRC_DIR',
				'yarn build',
				'cd $CODEBUILD_SRC_DIR/prototype/infra',
			].join(' && '),
			synthCommand: ['npx cdk synth'].join(' && '),
			subdirectory: 'prototype/infra',
			environment: {
				computeType: codebuild.ComputeType.LARGE,
				buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
			},
		})

		const pipeline = new CdkPipeline(this, 'Pipeline', {
			pipelineName: namespaced(this, 'Pipeline'),
			cloudAssemblyArtifact,
			sourceAction: new codepipeline_actions.CodeCommitSourceAction({
				actionName: 'CodeCommit',
				output: sourceArtifact,
				repository: codecommit.Repository.fromRepositoryName(
					this,
					'CodeCommitRepository',
					'PrototypeCode',
				),
			}),
			synthAction,
			// Use cdk version as defined in root package.json
			cdkCliVersion: packageInfo.dependencies['@aws-play/cdk-aws-cdk'],
		})

		// TODO: HACK: Until https://github.com/aws/aws-cdk/issues/9163 is resolved we don't have good way
		// to update the policies on synth action role. But seems that `sythAction.actionProperties.project.role`
		// is defined post `bind()` call, so we can add there. But not supported in the cdk interface so
		// hacking type mapping for now.
		const synthActionProperties = synthAction.actionProperties as SynthActionProperties

		if (synthActionProperties.project == null) {
			throw new Error(
				'SynthAction does not have pipeline project defined, so not able to add policy to role',
			)
		}

		// HANDOFF: this can be removed by customer post handoff, as it only facilitates
		// CodeArtifact authentication within context of engagmeent.
		synthActionProperties.project?.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					...action.preset.CodeArtifact.DomainReadAccess,
					...action.preset.CodeArtifact.RepositoryReadPublishAccess,
					action.STS.ASSUME_ROLE,
				],
				resources: ['*'],
			})
		)

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const devBackendStage = pipeline.addApplicationStage(
			new BackendStage(this, 'Dev-Backend', props),
		)
	}
}
