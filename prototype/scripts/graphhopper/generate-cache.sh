#!/bin/bash

set -e

if ! command -v mvn &> /dev/null; then
    echo "mvn not found"
    echo "try to install it with \"brew install mvn\""
    exit
fi

MAPFILE=indonesia-latest.osm.pbf
MAPFILE_LOCAL_DIR=$HOME/.graphhopper/openstreetmap
MAPFILE_BASE_URL=https://download.geofabrik.de/asia
PRE_GENERATED_CACHE_PATH=$HOME/.graphhopper/openstreetmap/indonesia-latest.osm-gh
GH_CONFIG_FILE=config-local.yml

SCRIPT_DIR=$(pwd)
echo "Creating tmp folder in ${SCRIPT_DIR}"
mkdir -p ./tmp && cd ./tmp
mkdir -p $PRE_GENERATED_CACHE_PATH

echo "Cloning graphhopper [latest, master branch]"
git clone --depth 2 https://github.com/graphhopper/graphhopper.git
cd graphhopper

if [ ! -f "${MAPFILE_LOCAL_DIR}/${MAPFILE}" ]; then
    echo "Mapfile doesn't exist at ${MAPFILE_LOCAL_DIR}/${MAPFILE}"
    mkdir -p ${MAPFILE_LOCAL_DIR}
    echo "Attempting to download from ${MAPFILE_BASE_URL}/${MAPFILE}"
    curl -o "${MAPFILE_LOCAL_DIR}/${MAPFILE}" "${MAPFILE_BASE_URL}/${MAPFILE}"
else
    echo "Mapfile found at ${MAPFILE_LOCAL_DIR}/${MAPFILE}."
fi

echo "Updating nodeVersion and npmVersion in graphhopper's web-bundle/pom.xml"
sed -i '' 's/nodeVersion>v12.3.1/nodeVersion>v17.2.0/' web-bundle/pom.xml # MAC needs this first '' with sed
sed -i '' 's/npmVersion>6.14.5/npmVersion>8.1.4/' web-bundle/pom.xml

echo "Build graphhopper"
mvn clean package --quiet

## SETUP symlinks to store the cache properly and reuse it in the build phase
mkdir -p gh-tmp
ln -s ${MAPFILE_LOCAL_DIR} gh-tmp/map
ln -s $PRE_GENERATED_CACHE_PATH gh-tmp/graph-cache

echo "Running graphhopper once to generate the cache"
java -Ddw.graphhopper.datareader.file=$MAPFILE_LOCAL_DIR/$MAPFILE -Xmx16g -Xms16g -jar web/target/graphhopper-web-*.jar server $SCRIPT_DIR/$GH_CONFIG_FILE

echo "Removing tmp folder and copied assets"
cd $SCRIPT_DIR
rm -rf ./tmp

echo "Done"