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
import { aws_opensearchservice as opensearchservice, aws_elasticache as elasticache } from 'aws-cdk-lib'
import { OpenSearchCluster, OpenSearchClusterProps } from './OpenSearchCluster'
import { RedisCluster, RedisClusterProps } from './RedisCluster'

export interface LiveDataCacheProps {
	readonly redisClusterProps: RedisClusterProps
	readonly openSearchClusterProps: OpenSearchClusterProps
}

export class LiveDataCache extends Construct {
	readonly openSearchDomain: opensearchservice.IDomain

	readonly redisCluster: elasticache.CfnCacheCluster

	constructor (scope: Construct, id: string, props: LiveDataCacheProps) {
		super(scope, id)

		const { redisClusterProps, openSearchClusterProps } = props

		const openSearchCluster = new OpenSearchCluster(this, 'OpenSearchCluster', openSearchClusterProps)
		this.openSearchDomain = openSearchCluster.domain

		const ecCluster = new RedisCluster(this, 'RedisCluster', redisClusterProps)
		this.redisCluster = ecCluster.redisCluster
	}
}
