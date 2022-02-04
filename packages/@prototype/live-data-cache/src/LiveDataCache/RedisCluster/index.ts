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
/* eslint-disable no-console */
import { Construct } from 'constructs'
import { aws_elasticache as elasticache, aws_ec2 as ec2 } from 'aws-cdk-lib'
import { namespaced } from '@aws-play/cdk-core'

export interface RedisClusterProps {
	readonly numNodes: number
	/**
	 * Must be one of the accepted values
	 * Check: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-elasticache-cache-cluster.html#cfn-elasticache-cachecluster-cachenodetype
	 */
	readonly nodeType?: string
	readonly vpc: ec2.IVpc
	readonly securityGroups: ec2.ISecurityGroup[]
}

export class RedisCluster extends Construct {
	readonly redisCluster: elasticache.CfnCacheCluster

	constructor (scope: Construct, id: string, props: RedisClusterProps) {
		super(scope, id)

		const { numNodes, nodeType, vpc, securityGroups } = props

		const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisClusterSubnetGroup', {
			cacheSubnetGroupName: namespaced(this, 'live-data', { lowerCase: true }), // NOTE: lowercase
			description: 'Subnet for LiveData RedisCluster',
			subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.ISOLATED }).subnetIds,
		})

		const redisClusterName = namespaced(this, 'live-data', { lowerCase: true }) // NOTE: lowercase
		const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisClusterEC', {
			clusterName: redisClusterName,
			engine: 'redis',
			cacheNodeType: nodeType || 'cache.t3.medium',
			numCacheNodes: 1,
			autoMinorVersionUpgrade: true,
			cacheSubnetGroupName: redisSubnetGroup.ref,
			vpcSecurityGroupIds: securityGroups.map(group => group.securityGroupId),
			tags: [
				{
					key: 'Name',
					value: redisClusterName,
				},
			],
		})

		/// for Production add a replication group for the redis instance
		// new CfnReplicationGroup(this, 'RedisReplication', {
		// 	replicationGroupDescription: 'Redis replication group',
		// 	replicationGroupId: namespaced(this, 'redis-replication'),
		// 	engine: 'redis',
		// 	cacheNodeType: nodeType || 'cache.t3.medium',
		// 	autoMinorVersionUpgrade: true,
		// 	automaticFailoverEnabled: true,
		// 	securityGroupIds: securityGroups.map(group => group.securityGroupId),
		// 	cacheSubnetGroupName: redisSubnetGroup.ref,
		// 	replicasPerNodeGroup: 1,
		// 	nodeGroupConfiguration: [{
		// 		nodeGroupId: '1',
		// 	}, {
		// 		nodeGroupId: '2',
		// 	}, {
		// 		nodeGroupId: '3',
		// 	}],
		// 	multiAzEnabled: true,
		// })

		redisCluster.node.addDependency(redisSubnetGroup)

		// retainResource(redisCluster)

		this.redisCluster = redisCluster
	}
}
