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
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam'
import { ES } from 'cdk-iam-actions/lib/actions'

const allowStatement = (esDomainArn: string, actions: string[]): PolicyStatement => {
	return new PolicyStatement({
		actions,
		effect: Effect.ALLOW,
		resources: [`${esDomainArn}/*`],
	})
}

export const AllowESRead = (esDomainArn: string): PolicyStatement => {
	return allowStatement(esDomainArn, [ES.ES_HTTP_GET])
}
export const AllowESWrite = (esDomainArn: string): PolicyStatement => {
	return allowStatement(esDomainArn, [ES.ES_HTTP_POST, ES.ES_HTTP_PUT])
}
export const AllowESDelete = (esDomainArn: string): PolicyStatement => {
	return allowStatement(esDomainArn, [ES.ES_HTTP_DELETE])
}
