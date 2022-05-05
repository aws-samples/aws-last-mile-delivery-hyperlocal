# Driver Simulation

The driver entity simulate the behaviour of a driver running on a ECS container. The driver is responsible of pusblishing the location update events to the designed rule and, whenever there's a status change, the driver is supposed to publish another message to a dedicated status change rule to reflect the new status for that specific order/job.

## Location Updates

The `LOCATION_UPDATE` event has to be published in thet topic `$aws/rules/[driver-data-ingest-rule-name]` (where `[driver-data-ingest-rule-name]` is the name of the rule eg. _devproto_driver_data_ingest_)

The format of the event is the following:

```json
{
  "type": "LOCATION_UPDATE",
  "locations": [
    {
      "timestamp": 1650439715733, // in millisections, can be obtained with Date.now()
      "latitude": 14.61315,
      "longitude": 120.99037,
      "elevation": 25.2, // in meters
      "spoofing_detected": false, // define if the location is legit or spoofed
    }
  ],
  "status": "DELIVERING",
  "driverId": "driver-id",
  "driverIdentity": "driver-identity"
}
```

The `status` flag can be one of the following:

-	IDLE
- ACCEPTED
- REJECTED
- CANCELLED
- PICKING_UP_GOODS
- ARRIVED_AT_ORIGIN
- DELIVERING
- ARRIVED_AT_DESTINATION
- DELIVERED

Generally the driver is in a `IDLE` state until it receives an order which has been accepted, in that situation the status reflects the order workflow.

## Status Changes

Every time the driver status changes the client is required to send a `STATUS_CHANGE` event to the backend. As such, the message has to be published on a dedicated IoT Rule Topic: `$aws/rules/[driver-staus-change-rule-name]` (where `[driver-staus-change-rule-name]` is the name of the rule eg. _devproto_driver_status_update_)

The message has to follow the following format:

```json
{
  "type": "STATUS_CHANGE",
  "driverId": "driver-id",
  "driverIdentity": "driver-identity",
  "status": "DELIVERING",
  "jobId": "job-id", // job the driver is working on
  "orderId": "order-id", // order the driver is deliverying
  "timestamp": 1650439715733 // in millisections, can be obtained with Date.now()
}
```

While sending the message above, few fields can be omitted based on the workflow:

- IDLE: `jobId` and `orderId` can be omitted since the driver has no assignement yet
- ACCEPTED: `orderId` can be omitted, while `jobId` must be sent. Drivers must accepted all orders in the job/assignement
- REJECTED: `orderId` can be omitted, while `jobId` must be sent. Drivers must reject all orders in the job/assignement
- PICKING_UP_GOODS, ARRIVED_AT_ORIGIN, DELIVERING, ARRIVED_AT_DESTINATION, DELIVERED: both `orderId` and `jobId` are required

## Assignments

The driver will receive messages on the following topics:

- `[driver-identity]/messages`: personal messages (eg. new assignments)
- `broadcast`: common messages (eg. configuration updates)

Based on the type of delivery, the driver will need to acknowledge these messages accordingly.

### Instant Delivery

The driver will receive the following message for **Instant Delivery** assignments; the message will come from the personal topic (`[driver-identity]/messages`)

```json
{
  "type": "NEW_ORDER",
  "payload": {
    "jobId": "job-id",
    "driverId": "driver-id",
    "driverIdentity": "driver-identity",
    "route": {
      "distance": {
        "value": "1200",
        "unit": "m",
      },
      "time": {
        "value": "600",
        "unit": "sec",
      },
      "pointsEncoded": "gmjxAchlaVM?KlLaY", // encoded string
    },
    "segments": [
      {
        "index": 1,
        "orderId": "order-id",
        "from": { "lat": 14.6535911, "long": 120.9484165 },
        "to": { "lat": 14.6949722, "long": 120.9877968 },
        "segmentType": "TO_ORIGIN",
        "route": {
          "distance": {
            "value": "600",
            "unit": "m",
          },
          "time": {
            "value": "300",
            "unit": "sec",
          },
          "pointsEncoded": "gmjxAchla", // encoded string
        },
      },
      {
        "index": 2,
        "orderId": "order-id",
        "from": { "lat": 14.6949722, "long": 120.9877968 },
        "to": { "lat": 14.7671864, "long": 121.0580401 },
        "segmentType": "TO_DESTINATION",
        "route": {
          "distance": {
            "value": "600",
            "unit": "m",
          },
          "time": {
            "value": "300",
            "unit": "sec",
          },
          "pointsEncoded": "VM?KlLaY", // encoded string
        },
      }
      ...
    ],
  },
}
```

The assignment might contain multiple orders (generally, only one), each segment contain the routing details to a specific point (eg. `TO_ORIGIN` or `TO_DESTINATION`) based on that specific order.

The driver is required to send an acknowledgement to accept the job (by sending the `jobId` in the Status Change message - see [Status Change](#status-change)). When the driver starts to work on a specific order, is required to send a status change message and post the `orderId` along with the `jobId` to reflect the change on that specific order.

The backend would not need to send a confirmation as the order is specific to this driver, if the driver does not acknowledge the order on time, the order will be removed from that driver and assigned to a new driver. This timeout is configurable in the backend (see `driverAcknowledgeTimeoutInSeconds` flag, default 30 seconds).

### Same Day Delivery

The driver will receive the following message for **Same Day Delivery** assignments; the message will come from the personal topic (`[driver-identity]/messages`)

```json
{
  "type": "NEW_ASSIGNMENT",
  "payload": {
    "jobId": "job-id",
    "route": {
      "distance": {
        "value": "1200",
        "unit": "m",
      },
      "time": {
        "value": "600",
        "unit": "sec",
      },
      "pointsEncoded": "gmjxAchlaVM?KlLaY", // encoded string
    },
    "segments": [
      {
        "index": 1,
        "orderId": "order-id",
        "from": { "lat": 14.6535911, "long": 120.9484165 },
        "to": { "lat": 14.6949722, "long": 120.9877968 },
        "segmentType": "TO_ORIGIN",
        "route": {
          "distance": {
            "value": "600",
            "unit": "m",
          },
          "time": {
            "value": "300",
            "unit": "sec",
          },
          "pointsEncoded": "gmjxAchla", // encoded string
        },
      },
      {
        "index": 2,
        "orderId": "order-id",
        "from": { "lat": 14.6949722, "long": 120.9877968 },
        "to": { "lat": 14.7671864, "long": 121.0580401 },
        "segmentType": "TO_DESTINATION",
        "route": {
          "distance": {
            "value": "600",
            "unit": "m",
          },
          "time": {
            "value": "300",
            "unit": "sec",
          },
          "pointsEncoded": "VM?KlLaY", // encoded string
        },
      }
      ...
    ],
  },
}
```

The assignment might contain multiple orders (generally, more than one), each segment contain the routing details to a specific point (eg. `TO_ORIGIN` or `TO_DESTINATION`) based on that specific order.

The driver is required to send an acknowledgement to accept the job (by sending the `jobId` in the Status Change message - see [Status Change](#status-change)). 

After sending the accepted status updated, the backend will reply with the following message in case the job is assigned to that driver correctly:

```json
{
  "type": "CONFIRM_ASSIGNMENT",
  "payload": {
    "ordersId": ["order-id-1", "order-id-2"...],
    "jobId": "job-id",
    "driverId": "driver-id",
    "driverIdentity": "driver-identity",
  },
}
```

**Note**: as reference, once confirmed, a message with type `JOB_ASSIGNED` would be sent to ALL drivers in the `broadcast` topic to notify that the given job has been taken from another driver (thus the app UI can be updated with a flag or something that avoid other drivers to book that specific job) 

```json
{
  "type": "JOB_ASSIGNED",
  "payload": {
    "driverId": "driver-id",
    "jobId": "job-id",
  },
}
```

This is to avoid race conditions as for same day delivery, **orders are sent to multiple drivers**. In case of concurrency issues, the backend will send another message with `REJECT_ASSIGNMENT` as type:

```json
{
  "type": "REJECT_ASSIGNMENT",
  "payload": {
    "ordersId": ["order-id-1", "order-id-2"...],
    "jobId": "job-id",
    "driverId": "driver-id",
    "driverIdentity": "driver-identity",
  },
}
```

After receiving the `CONFIRM_ASSIGNMENT` message, the driver is allowed to start delivering/working on the orders. When the driver starts to work on a specific order, is required to send a status change message and post the `orderId` along with the `jobId` to reflect the change on that specific order.

In case the order got rejected (`REJECT_ASSIGNMENT`) the driver is not allowed to work on that order (as most likely anoter driver got it), thus is required to select another assignment to work on.
