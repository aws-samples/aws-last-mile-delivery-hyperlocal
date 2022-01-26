# CDK Dependencies
This package adds [all @aws-cdk/*](https://github.com/aws/aws-cdk/tree/master/packages/%40aws-cdk) depenencies with same version.

Goal is to make it easy to maintain consistent version throughout projects and make it easy to upgrade.

> At the expense of having a dependency on **all** cdk packages.

## Version
The version of this package matches the version of cdk it references.

> As such, it is **not** managed by lerna and must be manualy set.


## Next Steps
### Automate the upgrading of CDK
While search/replace of version number is easy, there is often the case that new packages have been added.
I tedious to compare the repository packages/@aws-cdk dir against what we have to find changes, or look through the release commits.

We should automated this by using the Github GraphQL api to get a list of packages and run install on them.

Did some initial testing and can get this list using the following:
> https://api.github.com/graphql
> https://docs.github.com/en/graphql/guides/using-the-explorer

```
{
  repository(owner: "aws", name: "aws-cdk") {
    id
    name
    object(expression: "master:packages/@aws-cdk") {
      ... on Tree {
        id
        entries {
          name
          type
        }
      }
    }
  }
}
```
