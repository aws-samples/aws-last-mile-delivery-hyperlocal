#!/usr/bin/env node
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

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const { prompt } = require('inquirer')

;(async function upgrade () {
	const { version } = await prompt({
		name: 'version',
		message: 'What version?',
		required: true,
	})

	if (version == null) {
		throw new Error('Must specify version')
	}

	console.log(`Upgrading cdk to version ${version}...`)

	const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reuse'))

	await execa('git', [
		'clone',
		'--depth', '1',
		'--branch', `v${version}`,
		'https://github.com/aws/aws-cdk.git',
	], { cwd: workingDir })

	const repoDir = path.join(workingDir, 'aws-cdk')
	const awsCdkPackageDir = path.join(repoDir, 'packages/@aws-cdk')
	const packageDirs = (await fs.readdir(awsCdkPackageDir)).filter(dir => {
		if (fs.statSync(path.join(awsCdkPackageDir, dir)).isDirectory() !== true) {
			return false
		}

		try {
			const pkgJson = fs.readJsonSync(path.join(awsCdkPackageDir, dir, 'package.json'))

			return pkgJson.private !== true
		} catch (error) {
			return false
		}
	})

	const packageJsonPath = path.join(__dirname, '../package.json')
	const packageJson = await fs.readJSON(packageJsonPath)

	// replace version
	packageJson.version = version

	// add @aws-cdk/* dependencies
	packageJson.dependencies = packageDirs.reduce((deps, packageName) => {
		deps[`@aws-cdk/${packageName}`] = version

		return deps
	}, {})

	// add aws-cdk dependency
	packageJson.dependencies['aws-cdk'] = version

	// add constructs version based on @aws-cdk/core
	packageJson.dependencies.constructs = (await fs.readJSON(path.join(awsCdkPackageDir, 'core', 'package.json'))).dependencies.constructs

	await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 })

	console.log('Successfully upgraded package dependencies')

	console.log('You still need to update packages that consume this and other cdk stuff manually')
})()
