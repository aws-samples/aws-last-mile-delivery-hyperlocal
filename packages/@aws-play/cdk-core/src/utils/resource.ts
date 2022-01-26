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
import { AnyPrincipal, Role } from '@aws-cdk/aws-iam'
import { CfnResource, Construct, RemovalPolicy, Resource, Stack } from '@aws-cdk/core'
import { yellow } from 'chalk'

export function retainResource (construct: Construct): void {
	if (construct instanceof CfnResource && (construct as CfnResource)?.applyRemovalPolicy) {
		(construct as CfnResource)?.applyRemovalPolicy(RemovalPolicy.RETAIN)
	} else {
		(construct.node.findChild('Resource') as CfnResource)?.applyRemovalPolicy(RemovalPolicy.RETAIN)
	}
}

/**
 * Creates a placeholder resource (Role) for stacks that don't define any resources.
 * These should be removed after already have a resource defined... or if stack is
 * found to not need resources but only contributes to other stacks, it should be
 * changed to a construct.
 * @param scope
 */
export function TODO_placeholderResource (stack: Stack): Resource {
	console.warn(yellow(`TODO: Creating placeholder resource in stack ${stack.stackId}, need to remove later`))

	return new Role(stack, 'PlaceholderRole', {
		assumedBy: new AnyPrincipal(),
		description: 'Placeholder because need resource in stack',
	})
}
