# Geofencing planning

1. order is assigned to a driver
   * orderID/customer (lat/long)/driverId/restaurant (lat/long)
   * event message to eventBridge
     * detailType: 'OrderUpdate'
     * status: DriverAssigned

2. start geofencing
    * lambda handles event
      * store geofence in redis
        * geofenceId: { driverId, destination (lat/long), notificationDistance }
        * "geofence:location" == geofenceId - lat/long pairs
        * "geofence:location:<geofenceId>" - driverId - lat/long
        * geofence:driver == geofenceId - driverId pairs

3. A) periodically check the distance between driver and destination for geofenceId
   1. get all geofences' driverId (1 cmd)
   2. get all driverLoations by driverId (1 cmd)
   3. get distance between current driverLocation and destination (3cmd * #(geofences))
      1. add driverId-lat/long, destination-lat/long
      2. GEODIST
      3. remove driverId/destination

3. B) do check for every driver location update
    1. check if there's a geofence associated to driverId
    2. check distance between driver and destination
    3. if inside --> dispatch event 'GeoFenceTriggered'

4. handle GeoFenceTriggered
   1. remove geofence-driver assoc from redis
   2. update order object
   3. [optionally] add new geofence (for customer, if prev was restaurant)
   4. send notification to restaurant/customer


Calc:

* 100k parallel orders at one time --> 100k geofences at one time
* 