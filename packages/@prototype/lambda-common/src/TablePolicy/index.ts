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
import { aws_iam as iam } from 'aws-cdk-lib'
import { DynamoDB } from 'cdk-iam-actions/lib/actions'

const tablePolicyStatement = (actions: string[], tableArn: string): iam.PolicyStatement => {
	const policyStatement = new iam.PolicyStatement({
		effect: iam.Effect.ALLOW,
		actions,
		resources: [tableArn],
	})

	return policyStatement
}

export const readDDBTablePolicyStatement = (tableArn: string): iam.PolicyStatement => {
	return tablePolicyStatement(
		[
			DynamoDB.GET_ITEM,
			DynamoDB.BATCH_GET_ITEM,
			DynamoDB.GET_RECORDS,
			DynamoDB.SCAN,
			DynamoDB.QUERY,
			'dynamodb:PartiQLSelect',
		],
		tableArn,
	)
}

export const updateDDBTablePolicyStatement = (tableArn: string): iam.PolicyStatement => {
	return tablePolicyStatement(
		[
			DynamoDB.UPDATE_ITEM,
			DynamoDB.PUT_ITEM,
		],
		tableArn,
	)
}

export const deleteFromDDBTablePolicyStatement = (tableArn: string): iam.PolicyStatement => {
	return tablePolicyStatement(
		[DynamoDB.DELETE_ITEM],
		tableArn,
	)
}
