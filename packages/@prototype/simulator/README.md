# `@prototype/simulator`

This contain the stack definition for the simulator functions. It contains the following stacks:

- `ECSVpcStack`: It does create the simulator VPC used by the ECS containers
- `ECSContainerStack`: provision the required settings for the ECS container to run (ECR repository, roles and policies for the simulator and define the container settings)
- `SimulatorDataStack`: It provision the table in DDB used by the simulator
- `SimulatorManagerStack`: creates the Lambda exposed through API gateway that provides the methods used by the UI; it also include the AWS Step Functions that start the container and its additional helper Lambda function.

## Usage

```js
import { ECSVpcStack, ECSContainerStack, SimulatorManagerStack, SimulatorDataStack } from '@prototype/simulator'


const simulatorRestApi = new RestApi(this, 'SimulatorRestApi', {
  restApiName: namespaced(this, 'SimulatorRestApi'),
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
  },
})

const ecsVpc = new ECSVpcStack(this, 'SimulatorVPC')

const ecsContainer = new ECSContainerStack(this, 'SimulatorECSStack', {
  userPool,
  identityPool,
  userPoolClient: webAppClient,
  simulatorConfig,
  iotIngestionRule: iotIngestRule,
  iotDriverStatusRule: iotDriverStatusUpdateRule,
  iotPolicy,
  ecsVpc: ecsVpc.vpc,
  configBucket,
  configBucketKey,
})

const data = new SimulatorDataStack(this, 'SimulatorData', {})

const manager = new SimulatorManagerStack(this, 'SimulatorManager', {
  vpc: ecsVpc.vpc,
  securityGroup: ecsVpc.securityGroup,
  cluster: ecsContainer.cluster,
  taskDefinition: ecsContainer.taskDefiniton,
  taskExecutionRole: ecsContainer.taskExecutionRole,
  taskDefinitionRole: ecsContainer.taskDefinitionRole,
  containerDefinition: ecsContainer.container,
  simulatorTable: data.simulatorTable,
  orderTable: data.orderTable,
  eventTable: data.eventTable,
  eventCreatedAtIndex: data.eventCreatedAtIndex,
  geoPolygonTable,
  simulatorRestApi,
  userPool,
  eventBus,
  driverSearch,
  routingEta,
  geofencing,
})
```

# Details

After the stack is created, it's required to **deploy the docker image** into the ECR Registry. To do so, navigate to the [simulator container folter](../../../prototype/simulator/container/README.md) and run the deployment command.