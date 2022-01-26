# Routing

We use [GraphHopper Open Source](https://www.graphhopper.com/open-source/) for routing in the prototype. This enables us to perform distance calculations for free and utilize all the services Graphhopper offers.
We host Graphhopper as an ECS Service, running the containers in Fargate, placing them behind an ALB (Application Load Balancer). For further details, check out the `GraphhopperSetup` construct in the `dispatch-setup` package.

In the prototype, we utilize _routing_ when an order has been assigned to a driver. The system will send a `route` query to our Graphhopper endpoint and will update the DynamoDB entry with the gmaps encoded path string, that can be visualized on a mapping component such as Mapbox or Google Maps.

We also use Graphhopper when it comes to calculating the distance between drivers, restaurants, and customers. In this case, we use the Graphhopper Java SDK in the Dispatch Engine and implement the functionality there. For more information, check out `Distance Matrix` section in the Dispach Engine topic.


## Isochrones

Using isochrones will be crucial when it comes to production. Retrieving drivers around restaurants in a specific time-bound distance needs isochrones to be set up. The open-source GraphHopper service provides an Isochrone API that is already built-in, meaning the ECS Service we set up also provides this functionality.
The Isochrone API could be used when a restaurant is being onboarded into the production system: a 5-, 10-, 15-, 20-minute isochrone could be saved to the database alongside with other attributes for a restaurant, and used when retrieving drivers for the dispatch engine. This way the driver lookup changes to polygon-based lookup, but the accuracy of the result would be better.
In the future, isochrones could be built around restaurant based on driver history. A highly sophisticated isochrone setup could be created depending on the location, time of the day, day of the week, if it's a public holiday, etc.

## Setup

For detailed description how to build the self-hosted GraphHopper service, refer to the graphhopper development doc (docs/development/graphhopper/README.md).