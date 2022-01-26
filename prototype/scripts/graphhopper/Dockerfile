FROM maven:3.6.3-jdk-11 as build

RUN apt-get install -y wget
WORKDIR /graphhopper
ADD graphhopper ./
RUN ./graphhopper.sh build

FROM openjdk:11.0-jre

ENV JAVA_OPTS "-Xmx3g -Xms3g -Ddw.server.application_connectors[0].bind_host=0.0.0.0 -Ddw.server.application_connectors[0].port=80"
RUN mkdir -p /data
COPY ./map/indonesia-latest.osm.pbf /data/indonesia-latest.osm.pbf
COPY ./graph-cache /data/indonesia-latest.osm-gh

WORKDIR /graphhopper
COPY --from=build /graphhopper/web/target/*.jar ./web/target/
# pom.xml is used to get the jar file version. see https://github.com/graphhopper/graphhopper/pull/1990#discussion_r409438806
COPY ./graphhopper/graphhopper.sh ./graphhopper/pom.xml ./
COPY ./config-indonesia.yml ./config.yml

VOLUME [ "/data" ]

EXPOSE 80

ENTRYPOINT [ "./graphhopper.sh", "web", "/data/indonesia-latest.osm.pbf" ]
# ENTRYPOINT [ "java", "-Xmx4g" "-Xms4g", "-jar", "graphhopper.jar", "server", "config.yml", "<&- &" ]
# java -Xmx4g -Xms4g -jar web/target/graphhopper-web-4.0-SNAPSHOT.jar server config.yml