##
# Build stage for generating graphhopper cache
FROM --platform=linux/arm64 maven:3.6.3-jdk-11 as gh-build

ARG MAPFILE_URL=set_MAPFILE_URL_env_var

RUN apt-get install -y git wget
WORKDIR /build

# fetch graphhopper executable
RUN wget https://github.com/graphhopper/graphhopper/releases/download/3.2/graphhopper-web-3.2.jar -O graphhopper.jar

# fetch the mapfile
RUN mkdir -p /map && wget -O /map/mapfile.osm.pbf ${MAPFILE_URL}
# COPY ./graphhopper/mapfile.osm.pbf /map/mapfile.osm.pbf

# add the config file
COPY ./graphhopper/config.yml ./
COPY ./graphhopper/graphhopper.sh ./

# build the mapfile cache with graphhopper
RUN \
    mkdir -p /graphhopper-cache \
    && JAVA_OPTS="-Xmx16g -Xms16g" ./graphhopper.sh --action import --config /build/config.yml --graph-cache /graphhopper-cache --input /map/mapfile.osm.pbf --jar /build/graphhopper.jar


### Stage for instant delivery dispatcher
FROM --platform=linux/arm64 openjdk:11.0-jre as prod

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en'

# Configure the JAVA_OPTIONS, you can add -XshowSettings:vm to also display the heap size.
ENV JAVA_OPTIONS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# mapfile
COPY --from=gh-build --chown=1001 /map/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=gh-build --chown=1001 /graphhopper-cache /graphhopper-cache

# app starter
COPY ./start-app.sh /app/start-app.sh
RUN chmod +x /app/start-app.sh

# settings
COPY ./config/application-docker.properties /app/config/application.properties
COPY ./config/instant/sequential/dispatchSolverConfig.xml /app/config/instant/sequential/dispatchSolverConfig.xml

# executables
COPY ./*.jar /app

RUN chown -R 1001 /app
RUN chown -R 1001 /app && chown -R 1001 /graphhopper-cache
WORKDIR /app

EXPOSE 80 8080
VOLUME [ "/app/config-external" ]
USER 1001

ENTRYPOINT [ "/app/start-app.sh" ]
