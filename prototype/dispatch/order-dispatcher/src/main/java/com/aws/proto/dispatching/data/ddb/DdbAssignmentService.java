/*-
 * ========================LICENSE_START=================================
 * Order Dispatcher
 * %%
 * Copyright (C) 2006 - 2022 Amazon Web Services
 * %%
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * =========================LICENSE_END==================================
 */
package com.aws.proto.dispatching.data.ddb;

import com.aws.proto.dispatching.api.response.DispatcherResult;
import com.aws.proto.dispatching.api.response.DispatcherResult.AssignedOrders;
import com.aws.proto.dispatching.config.DdbProperties;
import com.aws.proto.dispatching.util.aws.CredentialsHelper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.mutiny.Uni;
import org.bk.aws.dynamo.util.JsonAttributeValueUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DdbAssignmentService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbAssignmentService.class);

    @Inject
    DdbProperties ddbProperties;

    DynamoDbClient dbClient;

    DdbAssignmentService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;

        dbClient = DynamoDbClient.builder()
          .credentialsProvider(CredentialsHelper.getCredentialsProvider())
          .region(CredentialsHelper.getRegion())
          .build();

    }

    @Override
    protected String getTableName() {
        return ddbProperties.assignmentsTableName();
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object assignment_) {
        DispatcherResult assignment = (DispatcherResult) assignment_;
        ObjectMapper objectMapper = new ObjectMapper();

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("ID", AttributeValue.builder().s(assignment.problemId.toString()).build());
        item.put("score", AttributeValue.builder().s(assignment.score).build());
        item.put("state", AttributeValue.builder().s(assignment.state).build());
        item.put("createdAt", AttributeValue.builder().n(assignment.createdAt.toString()).build());
        item.put("executionId", AttributeValue.builder().s(assignment.executionId).build());
        item.put("solverDurationInMs", AttributeValue.builder().n(assignment.solverDurationInMs.toString()).build());

        item.put("distanceMatrixMetrics", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.distanceMatrixMetrics)));
        item.put("assigned", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.assigned)));
        item.put("unassigned", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(assignment.unassigned)));

        return item;
    }

    public DispatcherResult getAssignment(UUID problemId) {
//        return Uni.createFrom().completionStage(() -> dbClient.query(this.getQueryRequest("ID", problemId)))
//          .onItem().transform(res -> {
//
//              if(!res.hasItems()) {
//                  return null;
//              }
//              Map<String, AttributeValue> dbItem = res.items().get(0);
//
//              ObjectMapper mapper = new ObjectMapper();
//              List<AssignedOrders> assigned = dbItem.get("assigned").l().stream().map(av -> {
//                  JsonNode node = JsonAttributeValueUtil.fromAttributeValue(av);
//                  try {
//                      return mapper.treeToValue(node, AssignedOrders.class);
//                  } catch (JsonProcessingException e) {
//                      e.printStackTrace();
//                  }
//                  return null;
//              }).collect(Collectors.toList());
//
//              List<String> unassigned = dbItem.get("unassigned").l().stream().map(AttributeValue::s).collect(Collectors.toList());
//              Long createdAt = Long.parseLong(dbItem.get("createdAt").n());
//              String executionId = dbItem.get("executionId").s();
//              String state = dbItem.get("state").s();
//              String score = dbItem.get("score").s();
//
//              return new DispatcherResult(problemId, executionId, createdAt, assigned, unassigned, state, score);
//        });

        List<Map<String, AttributeValue>> dbItems = dbClient.query(this.getQueryRequest("ID", problemId)).items();
        if (dbItems.size() == 0) {
            return null;
        }

        Map<String, AttributeValue> dbItem = dbItems.get(0);
        ObjectMapper mapper = new ObjectMapper();
        List<AssignedOrders> assigned = dbItem.get("assigned").l().stream().map(av -> {
            JsonNode node = JsonAttributeValueUtil.fromAttributeValue(av);
            try {
                return mapper.treeToValue(node, AssignedOrders.class);
            } catch (JsonProcessingException e) {
                e.printStackTrace();
            }
            return null;
        }).collect(Collectors.toList());

        List<String> unassigned = dbItem.get("unassigned").l().stream().map(AttributeValue::s).collect(Collectors.toList());
        Long createdAt = Long.parseLong(dbItem.get("createdAt").n());
        String executionId = dbItem.get("executionId").s();
        String state = dbItem.get("state").s();
        String score = dbItem.get("score").s();

        DispatcherResult result = new DispatcherResult(problemId, executionId, createdAt, assigned, unassigned, state, score);
        result.executionId = dbItem.get("executionId").s();
        result.solverDurationInMs = Long.parseLong(dbItem.get("solverDurationInMs").n());
        try {
            result.distanceMatrixMetrics = mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("distanceMatrixMetrics")), DispatcherResult.DistanceMatrixMetrics.class);
        } catch(JsonProcessingException e) {
            logger.error("Error parsing ddbItem :: distanceMatrixMetrics", e);
        }

        return result;

    }

    public void saveAssignment(DispatcherResult assignment) {
        dbClient.putItem(putRequest(assignment));
    }
}
