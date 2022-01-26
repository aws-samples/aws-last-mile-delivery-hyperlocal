# Amazon Prototyping (`aws_packages`)

Packages contained in this folder were developed solely by AWS during the prototyping engagement.

	During the course of the engagement, our AWS team members develop code and define system architectures.  Any of your confidential information and prior work that you share with us remains your property and is protected under the terms of our Mutual Non-Disclosure Agreement (NDA) and the AWS Customer Agreement.  All the work which AWS team members create falls under the terms of our Customer Agreement and is AWS Content.  Additionally, our team members often bring sample code, libraries, and other reusable assets into our engagement, and, like all AWS Service Offerings, these assets also remain the property of AWS.  You are allowed to use, modify, and create derivative works from, the prototype assets in connection with the AWS Service Offerings under the Amazon Software License. AWS may reuse these assets in future engagements, but we will not share your confidential data nor your intellectual property with other customers.  Prototyping Engagements are offered on a no-fee basis. However, you may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.


---
## Development
Packages in the `aws_packages` directory are "*prebuilt*", meaning they include the compiled artifacts and not
intendend to be "*build*" within the context of the prototype.
* These artifacts *may* or *may **not*** include the *source code*, depending on the publisher of the package.
* Rebuilding these packages (eg: `yarn build`) is not guarenteed to work within the prototype, as they may have assumptions on environment and dependencies not configured by the prototype.
	> Eg: TypeScript configurations may not be compatible
* Packages are **ignored** during workspace build commands (`yarn build`, `yarn build:packages`)

### *How to modify these packages within context of prototype handoff?*
If customer wishes to modify the content of these packages (*within terms defined*), the following steps
are recommended.
> There is no guarantee that these packages will "build" **AS IS** within the prototype code and should be considered as *example* only.
> These packages have been decoupled from external dependencies and work as **compiled** artifacts only.

**Follow these steps:**
1. Move the package from `aws_packages` directory into `packages` directory
	* This will enable the package to be built during `yarn build:*` scripts
	> `aws_packages/@aws-play/cdk-core => packages/@aws-play/cdk-core`
1. Try running build script to see if works "*as is*"
	* `cd packages/{scope/package}`
		> eg: `cd packages/@aws-play/cdk-core`
	* `yarn build`
1. If above **WORKS**, then you should be ok to start modifying the package within the prototype workspace
1. If above **DOES NOT WORK**
	* Look into the `build` scripts used in the `package.json` file and modify as needed to get build to succeed.
	> There is no single solution to resolving this as these packages are from multiple providers and have different tooling/workspaces/etc to build.
	* Once the `yarn build` script is successful you can start modifying and using the package the prototype workspace.
	* **Potential Solutions**:
		* Verify the TypeScript config (`tsconfig.json`) is setup/mapped correctly for the workspace.
			> Verify all paths are correctly mapped
		* Verify all `peerDependencies` and `devDependencies` are available.
			> The original workspace the package was built it may have root level dependencies not defined in the `package.json`

> `Pro-Tip`: Do **NOT** start modifying the *source code* until the package can "build" successfully with
> original code proovided.
