# Distance caching with H3

> Important: Make sure the H3 version you are using is working on the platform of your choice. More information [here](https://github.com/uber/h3-java/issues/85).
> Important: main commands have changed from version 2022-05-09: export -> build-h3, build-lat-long; import -> import-h3, import-lat-long

Make sure you have the proper graphhopper setup with openstreetmap file of your choice and a geojson polygon as your coverage area.

Example:

* OSM mapfile: <https://download.geofabrik.de/asia/philippines-latest.osm.pbf>
* GeoJson file: `prototype/dispatch/delivery-dispatch/data/metro-manila-geojson.json`

## Generate distance cache file

```bash
# build the project
cd prototype/dispatch/delivery-dispatch
mvn clean install

cd apps/distancecache-util/target

# run the app to generate resolution 7 distance cache for the coverage area
java -jar distance-cache-util-jar-with-dependencies.jar build-h3 --resolution 7 ../../../data/metro-manila-geojson.json -o ../../../data/metro-manila-res7.distcache
```

Output:

```bash
[main] DEBUG d.a.p.a.d.util.commands.ExportCache - Parameters:
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         geoJsonFile = ../../../data/metro-manila-geojson.json
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         persistenceType = file
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         H3 resolution = 7
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         routing profile = motorcycle
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         localOsmDir = ~/.graphhopper/openstreetmap
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         localGraphhopperDir = ~/.graphhopper/graphhopper
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         osmFile = mapfile.osm.pbf
[main] DEBUG d.a.p.a.d.util.commands.ExportCache -         outputFilename = ../../../data/metro-manila-res7.distcache

[main] INFO  d.a.p.a.d.util.commands.ExportCache - Loading geoJson file ../../../data/metro-manila-geojson.json
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Loaded polygon is defined by 7264 geo coordinates.
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Number of covering hexagons is 105 at resolution 7
[main] INFO  d.a.p.a.d.util.commands.ExportCache - This will result a 105x105 distance matrix cache (11025 cells).
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Predicted size of the cache file: 0.211 MB
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Attempting to load Graphhopper...
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local OSM dir (~/.graphhopper/openstreetmap) ok
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local Graphhopper cache dir (~/.graphhopper/graphhopper) ok
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local OSM file (~/.graphhopper/openstreetmap/mapfile.osm.pbf) ok
[main] INFO  d.a.p.c.r.route.GraphhopperLoader - Importing OSM file and cache: ~/.graphhopper/openstreetmap/mapfile.osm.pbf
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Loading Graphhopper with CAR and MOTORCYCLE profiles
[main] INFO  com.graphhopper.GraphHopper - version 5.0|2022-03-23T09:58:08Z (9,21,6,5,6,8)
[main] INFO  com.graphhopper.GraphHopper - graph car,motorcycle|RAM_STORE|2D|no_turn_cost|nodes:9,edges:21,geometry:6,location_index:5,string_index:6,nodesCH:0,shortcuts:8, details:edges: 2 429 946(84MB), nodes: 1 992 997(23MB), bounds: 109.4882011,126.602108,1.4384914,22.6193592, name:(4MB), geo:14 672 628(56MB)
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Graphhopper loading successful
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Initializing Graphhopper Router...
[main] INFO  d.a.p.a.d.util.commands.ExportCache - Generating H3DistanceCache (dim = 105)
[ForkJoinPool.commonPool-worker-13] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 1000/11025 (9.070294784580499%)
[ForkJoinPool.commonPool-worker-5] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 2000/11025 (18.140589569160998%)
[ForkJoinPool.commonPool-worker-17] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 3000/11025 (27.2108843537415%)
[ForkJoinPool.commonPool-worker-19] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 4000/11025 (36.281179138321995%)
[main] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 5000/11025 (45.3514739229025%)
[ForkJoinPool.commonPool-worker-3] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 6000/11025 (54.421768707483%)
[ForkJoinPool.commonPool-worker-9] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 7000/11025 (63.49206349206349%)
[ForkJoinPool.commonPool-worker-3] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 8000/11025 (72.56235827664399%)
[ForkJoinPool.commonPool-worker-23] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 9000/11025 (81.63265306122449%)
[ForkJoinPool.commonPool-worker-17] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 10000/11025 (90.702947845805%)
[ForkJoinPool.commonPool-worker-3] DEBUG d.a.p.c.r.cache.H3DistanceCache - Processing 11000/11025 (99.77324263038548%)
[main] DEBUG d.a.p.c.r.cache.H3DistanceCache - :: H3DistanceCache :: calculation time = 33163ms (~0m 33s)
[main] DEBUG d.a.p.c.r.cache.H3DistanceCache - :: H3DistanceCache :: dimension = 105 :: cells = 11025
[main] DEBUG d.a.p.c.r.cache.H3DistanceCache - :: H3DistanceCache :: calc time PER CELL = 3.007981859410431ms
[main] DEBUG d.a.p.c.r.cache.H3DistanceCache - :: H3DistanceCache :: router errors: 0
[main] INFO  d.a.p.a.d.util.commands.ExportCache - H3DistanceCache generated successfully.
[main] INFO  d.a.p.c.r.c.p.FilePersistence - Exporting H3DistanceCache (dim = 105)
[main] INFO  d.a.p.c.r.c.p.FilePersistence - Successfully wrote H3DistanceCache to ../../../data/metro-manila-res7.distcache
```

## Import/check existing distance cache file

```zsh
java -jar distance-cache-util-jar-with-dependencies.jar import-h3 ../../../data/metro-manila-res7.distcache
```

Output:

```zsh
[main] INFO  d.a.p.a.d.util.commands.ImportCache - Importing cache file from ../../../data/metro-manila-res7.distcache
[main] INFO  d.a.p.c.r.c.p.FilePersistence - Importing H3DistanceCache from ../../../data/metro-manila-res7.distcache
[main] INFO  d.a.p.c.r.c.p.FilePersistence - Successfully imported H3DistanceCache from ../../../data/metro-manila-res7.distcache (dim = 105).
[main] INFO  d.a.p.a.d.util.commands.ImportCache - Distance Cache loaded successfully to memory.
[main] INFO  d.a.p.a.d.util.commands.ImportCache - Number of hexagons: 105
[main] INFO  d.a.p.a.d.util.commands.ImportCache - H3 resolution: 7
[main] INFO  d.a.p.a.d.util.commands.ImportCache - Matrix size: 105x105 (11025 cells)
```

# Distance caching lat/longs

Make sure you have the proper graphhopper setup with openstreetmap file of your choice and the input file is JSON of array of "lat"/"long" objects.

Example:

* OSM mapfile: <https://download.geofabrik.de/asia/philippines-latest.osm.pbf>
* Input file: `prototype/dispatch/delivery-dispatch/data/distmatrix-lat-longs.json`

## Generate distance cache file

```zsh
# build the project
cd prototype/dispatch/delivery-dispatch
mvn clean install

cd apps/distancecache-util/target

# run the app to generate resolution 7 distance cache for the coverage area
java -jar distance-cache-util-jar-with-dependencies.jar build-lat-long ../../../data/distmatrix-lat-longs.json -o ../../../data/distmatrix.latlongcache
```

### Output

```zsh
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache - Parameters:
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     locationsFile = ../../../data/distmatrix-lat-longs.json
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     persistenceType = file
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     routing profile = car
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     localOsmDir = ~/.graphhopper/openstreetmap
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     localGraphhopperDir = ~/.graphhopper/graphhopper
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     osmFile = mapfile.osm.pbf
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -     outputFilename = ../../../data/distmatrix.latlongcache
[main] DEBUG d.a.p.a.d.u.c.BuildLatLongCache -

[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Loading locations file ../../../data/distmatrix-lat-longs.json
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Loaded 16 lat/long pairs
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - This will result a 16x16 distance matrix cache (256 cells).
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Predicted size of the cache file: 0.004 MB
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Attempting to load Graphhopper...
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local OSM dir (~/.graphhopper/openstreetmap) ok
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local Graphhopper cache dir (~/.graphhopper/graphhopper) ok
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Local OSM file (~/.graphhopper/openstreetmap/mapfile.osm.pbf) ok
[main] INFO  d.a.p.c.r.route.GraphhopperLoader - Importing OSM file and cache: ~/.graphhopper/openstreetmap/mapfile.osm.pbf
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Loading Graphhopper with CAR and MOTORCYCLE profiles
[main] INFO  com.graphhopper.GraphHopper - version 5.0|2022-03-23T09:58:08Z (9,21,6,5,6,8)
[main] INFO  com.graphhopper.GraphHopper - graph car,motorcycle|RAM_STORE|2D|no_turn_cost|nodes:9,edges:21,geometry:6,location_index:5,string_index:6,nodesCH:0,shortcuts:8, details:edges: 2 429 946(84MB), nodes: 1 992 997(23MB), bounds: 109.4882011,126.602108,1.4384914,22.6193592, name:(4MB), geo:14 672 628(56MB)
[main] DEBUG d.a.p.c.r.route.GraphhopperLoader - Graphhopper loading successful
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Initializing Graphhopper Router...
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - Generating DistanceMatrix (dim = 16)
[main] DEBUG d.a.p.c.r.distance.DistanceMatrix - DMatrix :: dimension = 16x16 (256 cells)
[main] DEBUG d.a.p.c.r.distance.DistanceMatrix - DistanceMatrix :: calc time = 692ms :: dim = 16x16 :: per cell = 2.703125ms
[main] DEBUG d.a.p.c.r.distance.DistanceMatrix - DistanceMatrix :: errors = 0
[main] INFO  d.a.p.a.d.u.c.BuildLatLongCache - DistanceMatrix generated successfully.
[main] INFO  d.a.p.c.r.c.p.l.FilePersistence - Exporting DistanceMatrix (dim = 16)
[main] INFO  d.a.p.c.r.c.p.l.FilePersistence - Successfully wrote distanceMatrix to ../../../data/distmatrix.latlongcache
```

## Import/check existing distance matrix file

```zsh
java -jar distance-cache-util-jar-with-dependencies.jar import-lat-long ../../../data/distmatrix.latlongcache
```

### Output

```zsh
[main] INFO  d.a.p.a.d.u.c.ImportLatLongCache - Importing cache file from ../../../data/distmatrix.latlongcache
[main] INFO  d.a.p.c.r.c.p.l.FilePersistence - Importing DistanceMatrix from ../../../data/distmatrix.latlongcache
[main] INFO  d.a.p.c.r.c.p.l.FilePersistence - Successfully imported DistanceMatrix from ../../../data/distmatrix.latlongcache (dim = 16).
[main] INFO  d.a.p.a.d.u.c.ImportLatLongCache - Distance Matrix loaded successfully to memory.
[main] INFO  d.a.p.a.d.u.c.ImportLatLongCache - Number of lat/long pairs: 16
[main] INFO  d.a.p.a.d.u.c.ImportLatLongCache - Matrix size: 16x16 (256 cells)

```
