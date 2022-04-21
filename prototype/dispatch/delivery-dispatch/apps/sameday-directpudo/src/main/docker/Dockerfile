##
# Downloader stage
## #################################################################################################################### 
FROM --platform=linux/arm64 debian:buster-slim as downloader

ARG MAPFILE_URL=set_MAPFILE_URL_env_var
ARG GRAPHHOPPER_VERSION=5.0

WORKDIR /download

# fetch graphhopper
ADD https://github.com/graphhopper/graphhopper/releases/download/${GRAPHHOPPER_VERSION}/graphhopper-web-${GRAPHHOPPER_VERSION}.jar graphhopper.jar

# fetch the mapfile
ADD ${MAPFILE_URL} mapfile.osm.pbf

##
# Build stage for generating graphhopper cache
## ####################################################################################################################
FROM --platform=linux/arm64 public.ecr.aws/docker/library/maven:3.8.4-amazoncorretto-11 as gh-build

ARG DISTANCE_CACHE_FILE=cache-res9.distcache

WORKDIR /build

COPY --from=downloader /download/graphhopper.jar /build/graphhopper.jar
COPY --from=downloader /download/mapfile.osm.pbf /build/mapfile.osm.pbf

ADD ${DISTANCE_CACHE_FILE} /build/cache-res9.distcache

# add the config file
COPY ./graphhopper-config.yml /build/graphhopper-config.yml

# build the mapfile cache with graphhopper
RUN \
    mkdir -p /graphhopper-cache \
    && java \
        -Xmx16g -Xms16g \
        -Ddw.graphhopper.datareader.file="/build/mapfile.osm.pbf" \
        -Ddw.graphhopper.graph.location="/graphhopper-cache" \
        -jar /build/graphhopper.jar \
        import /build/graphhopper-config.yml


### Stage for instant-sequential delivery dispatcher
FROM --platform=linux/arm64 public.ecr.aws/amazoncorretto/amazoncorretto:11 as prod

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en'

# Configure the JAVA_OPTIONS
ENV JAVA_OPTIONS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# mapfile
COPY --from=downloader --chown=1001 /download/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=gh-build --chown=1001 /graphhopper-cache /graphhopper-cache

COPY --from=gh-build --chown=1001 /build/cache-res9.distcache /cache/cache-res9.distcache

# settings
COPY ./config/application.properties /app/config/application.properties
COPY ./config/solver-config.xml /app/solver-config.xml

# executables
COPY ./*.jar /app

RUN chown -R 1001 /app
WORKDIR /app

EXPOSE 80 8080
USER 1001

ENTRYPOINT [ "java", "-jar", "/app/delivery-dispatch-sameday-directpudo-runner.jar" ]
