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
import { Construct } from '@aws-cdk/core'
import { Bucket, IBucket } from '@aws-cdk/aws-s3'
import { PolicyStatement } from '@aws-cdk/aws-iam'
import { CloudFrontWebDistribution, CloudFrontAllowedMethods, PriceClass, OriginAccessIdentity, SourceConfiguration, CfnDistribution } from '@aws-cdk/aws-cloudfront'
import { namespacedBucket, retainResource } from '@aws-play/cdk-core'

/**
 * Properties for creating website hosting construct
 */
export interface WebsiteHostingProps {
	/**
	 * The name of the bucket to create
	 * @default websitebucket
	 */
	readonly bucketName?: string

	/**
	 * The name of the websiteIndexDocument
	 * @default index.html
	 */
	readonly indexDocument?: string

	/**
	 * The name of the websiteErrorDocument
	 * @default error.html
	 */
	readonly errorDocument?: string

	/**
	 * Indicate to retain the S3 bucket
	 * @default true
	 */
	readonly retainResources?: boolean

	/**
	 * Additional hosting bucket configuration
	 * A list of IBucket - pathPattern pairs
	 */
	readonly additionalHostingBuckets?: [{
		hostingBucket: IBucket
		originPath?: string
		pathPattern: string
		allowUpload: boolean
	}]

	readonly errorConfigurations?: CfnDistribution.CustomErrorResponseProperty[]
}

/**
 * Reporesents a WebsiteHosting construct
 */
export class WebsiteHosting extends Construct {
	/**
	 * The S3 bucket that hosts the website
	 */
	readonly hostingBucket: IBucket

	/**
	 * The CloudFront distribution to host the website
	 */
	readonly cloudFrontDistribution: CloudFrontWebDistribution

	constructor (scope: Construct, id: string, props: WebsiteHostingProps) {
		super(scope, id)

		const {
			indexDocument = 'index.html',
			errorDocument = 'error.html',
			bucketName = 'websitebucket',
			retainResources = true,
			additionalHostingBuckets,
			errorConfigurations,
		} = props

		// S3 :: WebsiteBucket
		const hostingBucket = new Bucket(this, 'PLAYHostingBucket', {
			bucketName: namespacedBucket(this, bucketName),
			websiteIndexDocument: indexDocument,
			websiteErrorDocument: errorDocument,
		})

		if (retainResources) {
			retainResource(hostingBucket)
		}

		// Cloudfront :: OIA
		const cloudFrontOia = new OriginAccessIdentity(this, 'PLAY-CF-OIA', {
			comment: 'OIA for hosting buckets',
		})

		// grant permission for cloudfront to the s3 bucket
		hostingBucket.addToResourcePolicy(new PolicyStatement({
			actions: [
				's3:GetObject*',
				's3:List*',
			],
			resources: [
				hostingBucket.bucketArn,
				`${hostingBucket.bucketArn}/*`,
			],
			principals: [
				cloudFrontOia.grantPrincipal,
			],
		}))

		const originConfigs: SourceConfiguration[] = []

		if (additionalHostingBuckets !== undefined) {
			const readActions = ['s3:GetObject*', 's3:List*']
			const rwActions = [...readActions, 's3:PutObject*']

			additionalHostingBuckets.forEach(additionalHosting => {
				additionalHosting.hostingBucket.addToResourcePolicy(new PolicyStatement({
					actions: additionalHosting.allowUpload ? rwActions : readActions,
					resources: [
						additionalHosting.hostingBucket.bucketArn,
						`${additionalHosting.hostingBucket.bucketArn}/*`,
					],
					principals: [
						cloudFrontOia.grantPrincipal,
					],
				}))

				originConfigs.push({
					s3OriginSource: {
						s3BucketSource: additionalHosting.hostingBucket,
						originAccessIdentity: cloudFrontOia,
						originPath: additionalHosting.originPath,
					},
					behaviors: [{
						allowedMethods: additionalHosting.allowUpload
							? CloudFrontAllowedMethods.ALL
							: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
						isDefaultBehavior: false,
						pathPattern: additionalHosting.pathPattern,
					}],
				})
			})
		}

		// cloudfront web distribution
		const cloudFrontDistribution = new CloudFrontWebDistribution(this, 'PLAYCloudFrontDistro', {
			originConfigs: [
				{
					s3OriginSource: {
						s3BucketSource: hostingBucket,
						originAccessIdentity: cloudFrontOia,
					},
					behaviors: [
						{
							allowedMethods: CloudFrontAllowedMethods.ALL,
							isDefaultBehavior: true,
						},
					],
				},
				...originConfigs,
			],
			defaultRootObject: indexDocument,
			priceClass: PriceClass.PRICE_CLASS_ALL,
			errorConfigurations,
		})

		this.cloudFrontDistribution = cloudFrontDistribution
		this.hostingBucket = hostingBucket
	}
}
