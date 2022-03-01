package dev.aws.proto.apps.instant.sequential.api;

import dev.aws.proto.apps.appcore.config.SolutionConfig;
import dev.aws.proto.apps.appcore.data.DriverQueryManager;
import dev.aws.proto.core.routing.config.RoutingConfig;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;

@ApplicationScoped
public class DispatchService extends dev.aws.proto.apps.appcore.api.DispatchService {

    @Inject
    RoutingConfig routingConfig;

    @Inject
    SolutionConfig solutionConfig;

    @Inject
    DriverQueryManager driverQueryManager;

//    @Inject
//    DdbAssignmentService assignmentService;


    DispatchService(RoutingConfig routingConfig, SolutionConfig solutionConfig) {
        super(routingConfig, solutionConfig);
    }
}
