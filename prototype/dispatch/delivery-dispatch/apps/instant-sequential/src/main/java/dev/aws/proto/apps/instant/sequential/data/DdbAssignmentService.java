/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package dev.aws.proto.apps.instant.sequential.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.aws.proto.apps.appcore.data.DdbServiceBase;
import dev.aws.proto.apps.instant.sequential.api.response.DispatchResult;
import dev.aws.proto.apps.instant.sequential.config.DdbProperties;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.util.aws.CredentialsHelper;
import dev.aws.proto.core.util.aws.SsmUtility;
import org.bk.aws.dynamo.util.JsonAttributeValueUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * DynamoDB CRUD for Assignments, using the {@link DdbServiceBase} base.
 */
@ApplicationScoped
public class DdbAssignmentService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbAssignmentService.class);

    /**
     * Config properties for DDB connection.
     */
    @Inject
    DdbProperties ddbProperties;

    /**
     * The DDB client.
     */
    DynamoDbClient dbClient;

    /**
     * The DDB table name.
     */
    final String tableName;

    DdbAssignmentService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;
        this.tableName = SsmUtility.getParameterValue(ddbProperties.assignmentsTableParameterName());
        this.dbClient = DynamoDbClient.builder()
                .credentialsProvider(CredentialsHelper.getCredentialsProvider())
                .region(CredentialsHelper.getRegion())
                .build();
    }

    @Override
    protected String getTableName() {
        return this.tableName;
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object assignment_) {
        DispatchResult assignment = (DispatchResult) assignment_;
        ObjectMapper objectMapper = new ObjectMapper();

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("ID", AttributeValue.builder().s(assignment.getProblemId().toString()).build());
        item.put("score", AttributeValue.builder().s(assignment.getScore()).build());
        item.put("state", AttributeValue.builder().s(assignment.getState()).build());
        item.put("createdAt", AttributeValue.builder().n(String.valueOf(assignment.getCreatedAt())).build());
        item.put("executionId", AttributeValue.builder().s(assignment.getExecutionId()).build());
        item.put("solverDurationInMs", AttributeValue.builder().n(String.valueOf(assignment.getSolverDurationInMs())).build());

        item.put("distanceMatrixMetrics", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.getDistanceMatrixMetrics())));
        item.put("assigned", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.getAssigned())));
        item.put("unassigned", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.getUnassigned())));

        return item;
    }

    /**
     * Retrieve an assignment based on its ID.
     *
     * @param problemId The ID of the assignment.
     * @return The result object saved in DDB.
     */
    public DispatchResult getAssignment(UUID problemId) {

        List<Map<String, AttributeValue>> dbItems = dbClient.query(this.getQueryRequest("ID", problemId)).items();
        if (dbItems.size() == 0) {
            return null;
        }

        Map<String, AttributeValue> dbItem = dbItems.get(0);
        ObjectMapper mapper = new ObjectMapper();

        List<DispatchResult.Assignment> assigned = dbItem.get("assigned").l().stream().map(av -> {
            JsonNode node = JsonAttributeValueUtil.fromAttributeValue(av);
            try {
                return mapper.treeToValue(node, DispatchResult.Assignment.class);
            } catch (JsonProcessingException e) {
                e.printStackTrace();
            }
            return null;
        }).collect(Collectors.toList());

        List<String> unassigned = dbItem.get("unassigned").l().stream().map(AttributeValue::s).collect(Collectors.toList());

        DispatchResult result = DispatchResult.builder()
                .problemId(problemId)
                .createdAt(Long.parseLong(dbItem.get("createdAt").n()))
                .score(dbItem.get("score").s())
                .solverDurationInMs(Long.parseLong(dbItem.get("solverDurationInMs").n()))
                .state(dbItem.get("state").s())
                .executionId(dbItem.get("executionId").s())
                .assigned(assigned)
                .unassigned(unassigned)
                .build();

        try {
            result.setDistanceMatrixMetrics(mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("distanceMatrixMetrics")), DistanceMatrix.Metrics.class));
        } catch (JsonProcessingException e) {
            logger.error("Error parsing ddbItem :: distanceMatrixMetrics", e);
        }

        return result;
    }

    /**
     * Save the assignment item to DDB.
     *
     * @param assignment The item to save.
     */
    public void saveAssignment(DispatchResult assignment) {
        dbClient.putItem(putRequest(assignment));
    }
}
