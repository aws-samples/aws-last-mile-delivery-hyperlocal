##
# Build stage for generating graphhopper cache
FROM --platform=linux/arm64 maven:3.6.3-jdk-11 as gh-build

ARG MAPFILE_URL=set_MAPFILE_URL_env_var

RUN apt-get install -y git wget
WORKDIR /build

# fetch graphhopper, make some finetune in the pom.xml and build it
RUN \
    git clone --depth 2 https://github.com/graphhopper/graphhopper.git \
    && cd graphhopper \
    && sed -i 's/nodeVersion>v12.3.1/nodeVersion>v17.2.0/' web-bundle/pom.xml \
    && sed -i 's/npmVersion>6.14.5/npmVersion>8.1.4/' web-bundle/pom.xml \
    && mvn clean package --quiet

# fetch the mapfile
RUN mkdir -p /map && wget -O /map/mapfile.osm.pbf ${MAPFILE_URL}

# add the config file
COPY ./graphhopper/config.yml /build/config.yml
COPY ./graphhopper/graphhopper.sh ./graphhopper

# build the mapfile cache with graphhopper
RUN \
    mkdir -p /graphhopper-cache \
    && cd graphhopper \
    && JAVA_OPTS="-Xmx16g -Xms16g" ./graphhopper.sh --action import --config /build/config.yml --graph-cache /graphhopper-cache --input /map/mapfile.osm.pbf


### Stage for instant delivery dispatcher
FROM --platform=linux/arm64 openjdk:11.0-jre as prod

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en'

# Configure the JAVA_OPTIONS, you can add -XshowSettings:vm to also display the heap size.
ENV JAVA_OPTIONS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# mapfile
COPY --from=gh-build /map/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=gh-build /graphhopper-cache /graphhopper-cache

# app starter
COPY ./start-app.sh /app/start-app.sh
RUN chmod +x /app/start-app.sh

# settings
COPY ./config/application-docker.properties /app/config/application.properties
COPY ./config/instant/sequential/dispatchSolverConfig.xml /app/config/instant/sequential/dispatchSolverConfig.xml

# executables
COPY ./*.jar /app

EXPOSE 80 8080
VOLUME [ "/app/config-external" ]
USER 1001

ENTRYPOINT [ "/app/start-app.sh" ]
