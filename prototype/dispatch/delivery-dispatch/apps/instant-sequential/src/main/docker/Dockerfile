##
# Build stage for generating graphhopper cache
FROM --platform=linux/arm64 maven:3.6.3-jdk-11 as gh-build

ARG MAPFILE_URL=set_MAPFILE_URL_env_var
ARG GRAPHHOPPER_VERSION=3.2
ARG JAR_FINALNAME=delivery-dispatch-instant-sequential

WORKDIR /build

#RUN \
#  apt-get install -y wget


# fetch graphhopper
ADD https://github.com/graphhopper/graphhopper/releases/download/${GRAPHHOPPER_VERSION}/graphhopper-web-${GRAPHHOPPER_VERSION}.jar /build/graphhopper.jar

# fetch the mapfile
ADD ${MAPFILE_URL} /build/mapfile.osm.pbf
#RUN mkdir -p /map && wget -O /map/mapfile.osm.pbf ${MAPFILE_URL}

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
        import /build/config.yml


### Stage for instant-sequential delivery dispatcher
FROM --platform=linux/arm64 openjdk:11.0-jre as prod

ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en'

# Configure the JAVA_OPTIONS
ENV JAVA_OPTIONS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# mapfile
COPY --from=gh-build /build/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=gh-build /graphhopper-cache /graphhopper-cache

# settings
COPY ./config/application.properties /app/config/application.properties
COPY ./config/solver-config.xml /app/solver-config.xml

# executables
COPY ./*.jar /app

RUN chown -R 1001 /app
WORKDIR /app

EXPOSE 80 8080
USER 1001

ENTRYPOINT [ "java", "-jar", "/app/${JAR_FINALNAME}-runner.jar" ]
