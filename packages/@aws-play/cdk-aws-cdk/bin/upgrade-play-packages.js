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
const findup = require('find-up').sync

const updateDependencyObject = (depObj, newVersion, objOrigin) => {
	if (depObj != null) {
		for (const dep in depObj) {
			if (Object.hasOwnProperty.call(depObj, dep)) {
				if (dep.startsWith('@aws-cdk/') || dep === '@aws-play/cdk-aws-cdk') {
					console.debug(`${objOrigin} :: ${dep} :: ${depObj[dep]} --> ${newVersion}`)

					depObj[dep] = newVersion
				}
			}
		}
	}

	return depObj
}

;(async function upgradePlayPackages () {
	const awsPlayDir = findup('@aws-play', { type: 'directory' })

	// current cdk-aws-cdk version
	const cdkAwsCdkPackageJson = await fs.readJSON(path.join(awsPlayDir, 'cdk-aws-cdk', 'package.json'))
	const version = cdkAwsCdkPackageJson.version
	console.debug(`@aws-play/cdk-aws-cdk version is ${version}`)

	console.log(`Upgrading @aws-play packages' CDK versions to ${version}...\n`)

	// take all packages
	const awsPlayPackages = fs.readdirSync(awsPlayDir)

	// except aws-cdk-cdk
	const awscdkIdx = awsPlayPackages.indexOf('cdk-aws-cdk')

	if (awscdkIdx !== -1) {
		awsPlayPackages.splice(awscdkIdx, 1)
	}

	awsPlayPackages.forEach(playPackageDir => {
		if (fs.statSync(path.join(awsPlayDir, playPackageDir)).isDirectory()) {
			const packageJsonPath = path.join(awsPlayDir, playPackageDir, 'package.json')

			if (!fs.existsSync(packageJsonPath)) {
				return
			}

			const pkgJson = fs.readJsonSync(packageJsonPath)

			pkgJson.dependencies = updateDependencyObject(pkgJson.dependencies, version, `@aws-play/${playPackageDir} :: dependencies`)
			pkgJson.devDependencies = updateDependencyObject(pkgJson.devDependencies, version, `@aws-play/${playPackageDir} :: devDependencies`)
			pkgJson.peerDependencies = updateDependencyObject(pkgJson.peerDependencies, version, `@aws-play/${playPackageDir} :: peerDependencies`)

			fs.writeJsonSync(packageJsonPath, pkgJson, { spaces: 2 })
			console.log(`${packageJsonPath} updated\n`)
		}
	})

	console.log('Successfully upgraded @aws-play package dependencies')

	console.log('You still need to make sure there were no breaking changes!')
})()
