# Graphhopper routing

> Since Graphhopper mainline was using `Log4j` until Dec 10, 2021, we cannot use the `v3.2` tag anymore.

## Before deployment

> **IMPORTANT**: Steps `1` to `7` have been implemented in `prototype/scripts/graphhopper/generate-cache.sh`

1. Clone the graphhopper repo from github `git clone git@github.com:graphhopper/graphhopper.git`
2. Download the `indonesia.osm.pbf` file from geofabric.de to `~/.graphhopper/openstreetmap/indonesia-latest.osm.pbf`
3. cd into the graphhopper folder
4. update `web-bundle/pom.xml`: `nodeVersion = v.17.2.0` and `npmVersion = 8.0.4`
5. build the project `mvn clean package`
6. run `java -Ddw.graphhopper.datareader.file=$HOME/.graphhopper/openstreetmap/indonesia-latest.osm.pbf -Xmx16g -Xms16g -jar web/target/graphhopper-web-*.jar server config-indonesia.yml`
   1. wait until the server started. this may take some time, since it's loading the map and preparing the cache
   2. if it's too slow, you may need to change the Xmx/Xms settings (set it to an ok number like 12g or 16g)
   3. the precompiled graphhopper cache will be in `~/.graphhopper/openstreetmap/indonesia-latest.osm-gh` folder
7. once the cache is generated, head over to `prototype/scripts/graphhopper`
8. review the variables in `build-and-upload.sh` file
9. run it: `./build-and-upload.sh`

> **Note**: make sure you're generating the graphhopper cache with the same version of graphhopper as the one you will use in the built docker image.