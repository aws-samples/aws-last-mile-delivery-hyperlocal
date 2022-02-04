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
import { execSync } from 'child_process'
import { FileSystem, SymlinkFollowMode } from 'aws-cdk-lib'

const ASSET_ROOT = process.env.CDK_OUTDIR as string

export interface BundlingOptions {
	readonly output?: string
	readonly stdout?: 'ignore' | 'inherit'
}

export function bundleAsset (sourcePath: string, cmd: string, options: BundlingOptions): void {
	const { output, stdout = 'ignore' } = options

	if (!path.isAbsolute(sourcePath)) {
		throw new Error(`Bundle only support absolute paths: ${sourcePath}`)
	}

	try {
		const outputPath = output ? path.join(sourcePath, output) : sourcePath

		const sourceHash = FileSystem.fingerprint(outputPath, { follow: SymlinkFollowMode.ALWAYS })

		// Only run command when hash changes
		const outDir = path.join(ASSET_ROOT, `asset.${sourceHash}`)

		fs.lstatSync(outDir).isDirectory()
	} catch (error) {
		// Quite noisy logs regarding dependencies
		const env: any = {
			...process.env,
			npm_config_production: 'true',
			npm_config_fund: 'false',
			npm_config_audit: 'false',
		}

		execSync(cmd, { env, cwd: sourcePath, stdio: [stdout, stdout, 'inherit'] })
	}
}
