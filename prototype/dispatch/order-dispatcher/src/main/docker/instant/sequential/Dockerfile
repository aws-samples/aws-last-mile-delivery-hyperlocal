##
# Downloader stage
## #################################################################################################################### 
FROM --platform=linux/arm64 debian:buster-slim as downloader

ARG MAPFILE_URL=set_MAPFILE_URL_env_var
ARG GRAPHHOPPER_VERSION=3.2

WORKDIR /download

# fetch graphhopper
ADD https://github.com/graphhopper/graphhopper/releases/download/${GRAPHHOPPER_VERSION}/graphhopper-web-${GRAPHHOPPER_VERSION}.jar graphhopper.jar

# fetch the mapfile
ADD ${MAPFILE_URL} mapfile.osm.pbf

##
# Build stage for generating graphhopper cache
FROM --platform=linux/arm64 public.ecr.aws/docker/library/maven:3.8.4-amazoncorretto-11 as gh-build

WORKDIR /build

COPY --from=downloader /download/graphhopper.jar /build/graphhopper.jar
COPY --from=downloader /download/mapfile.osm.pbf /build/mapfile.osm.pbf

# add the config file
COPY ./graphhopper/config.yml ./
COPY ./graphhopper/graphhopper.sh ./

# build the mapfile cache with graphhopper
RUN \
    mkdir -p /graphhopper-cache \
    && JAVA_OPTS="-Xmx16g -Xms16g" ./graphhopper.sh --action import --config /build/config.yml --graph-cache /graphhopper-cache --input /build/mapfile.osm.pbf --jar /build/graphhopper.jar


### Stage for instant delivery dispatcher
FROM --platform=linux/arm64 public.ecr.aws/amazoncorretto/amazoncorretto:11 as prod

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en'

# Configure the JAVA_OPTIONS, you can add -XshowSettings:vm to also display the heap size.
ENV JAVA_OPTIONS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# mapfile
COPY --from=downloader --chown=1001 /download/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=gh-build --chown=1001 /graphhopper-cache /graphhopper-cache

# app starter
COPY ./start-app.sh /app/start-app.sh
RUN chmod +x /app/start-app.sh

# settings
COPY ./config/application-docker.properties /app/config/application.properties
COPY ./config/instant/sequential/dispatchSolverConfig.xml /app/config/dispatchSolverConfig.xml

# executables
COPY ./*.jar /app

RUN chown -R 1001 /app && chown -R 1001 /graphhopper-cache
WORKDIR /app

EXPOSE 80 8080
VOLUME [ "/app/config-external" ]
USER 1001

ENTRYPOINT [ "/app/start-app.sh" ]
