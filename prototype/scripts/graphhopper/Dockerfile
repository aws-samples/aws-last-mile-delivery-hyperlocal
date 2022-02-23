FROM --platform=linux/arm64 maven:3.6.3-jdk-11 as build

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
COPY config-docker.yml /build/config.yml
COPY ./gh-script/graphhopper.sh ./graphhopper

# build the mapfile cache with graphhopper
RUN \
    mkdir -p /graphhopper-cache \
    && cd graphhopper \
    && JAVA_OPTS="-Xmx16g -Xms16g" ./graphhopper.sh --action import --config /build/config.yml --graph-cache /graphhopper-cache --input /map/mapfile.osm.pbf \
    && sleep 2
    # && java -Ddw.graphhopper.datareader.file=/map/mapfile.osm.pbf -Ddw.graphhopper.graph.location=/graphhopper-cache -Xmx16g -Xms16g -jar web/target/graphhopper-web-*.jar server /build/config.yml

FROM --platform=linux/arm64 openjdk:11.0-jre

ENV JAVA_OPTS "-Xmx6g -Xms6g -Ddw.server.application_connectors[0].bind_host=0.0.0.0 -Ddw.server.application_connectors[0].port=80"
WORKDIR /graphhopper

# mapfile
COPY --from=build /map/mapfile.osm.pbf /map/mapfile.osm.pbf

# graphhopper cache
COPY --from=build /graphhopper-cache /graphhopper-cache

# pom.xml is used to get the jar file version. see https://github.com/graphhopper/graphhopper/pull/1990#discussion_r409438806
COPY --from=build /build/graphhopper/pom.xml ./

# graphhopper executables
COPY --from=build /build/graphhopper/web/target/*.jar ./web/target/

# graphhopper script
COPY ./gh-script/graphhopper.sh ./

# config file
COPY ./config-docker.yml ./config.yml

VOLUME [ "/data" ]

EXPOSE 80

ENTRYPOINT [ "./graphhopper.sh", "--action", "web", "--config", "/graphhopper/config.yml", "--graph-cache", "/graphhopper-cache", "--input", "/map/mapfile.osm.pbf" ]