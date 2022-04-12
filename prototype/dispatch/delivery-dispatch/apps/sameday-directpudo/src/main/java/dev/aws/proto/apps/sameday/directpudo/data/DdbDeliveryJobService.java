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

package dev.aws.proto.apps.sameday.directpudo.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.aws.proto.apps.appcore.api.response.DeliverySegment;
import dev.aws.proto.apps.appcore.api.response.Segment;
import dev.aws.proto.apps.appcore.data.DdbServiceBase;
import dev.aws.proto.apps.sameday.directpudo.api.response.DeliveryJob;
import dev.aws.proto.apps.sameday.directpudo.config.DdbProperties;
import dev.aws.proto.core.util.aws.SsmUtility;
import org.bk.aws.dynamo.util.JsonAttributeValueUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.model.*;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB CRUD for Jobs, using the {@link DdbServiceBase} base.
 */
@ApplicationScoped
public class DdbDeliveryJobService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbDeliveryJobService.class);

    /**
     * Config properties for DDB connection.
     */
    @Inject
    DdbProperties ddbProperties;

    /**
     * The DDB table name.
     */
    final String tableName;

    /**
     * The index name for the query
     */
    final String solverJobIdIndexName;

    DdbDeliveryJobService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;
        this.tableName = SsmUtility.getParameterValue(ddbProperties.deliveryJobsTableParameterName());
        this.solverJobIdIndexName = SsmUtility.getParameterValue(ddbProperties.deliveryJobsTableSolverJobIdIndexParameterName());
        this.dbClient = super.createDBClient();

        logger.trace("DdbDeliveryJobService instantiated :: tableName = {} :: indexName = {}", tableName, solverJobIdIndexName);
    }

    @Override
    protected String getTableName() {
        return this.tableName;
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object deliveryJob_) {
        DeliveryJob deliveryJob = (DeliveryJob) deliveryJob_;
        ObjectMapper objectMapper = new ObjectMapper();

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("ID", AttributeValue.builder().s(deliveryJob.getId().toString()).build());
        item.put("createdAt", AttributeValue.builder().n(String.valueOf(deliveryJob.getCreatedAt())).build());
        item.put("solverJobId", AttributeValue.builder().s(deliveryJob.getSolverJobId().toString()).build());
        item.put("segments", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(deliveryJob.getSegments())));
        item.put("route", JsonAttributeValueUtil.toAttributeValue(objectMapper.valueToTree(deliveryJob.getRoute())));

        return item;
    }

    /**
     * Retreives delivery jobs for a solverJobId. Uses the DDB index for the query.
     *
     * @param solverJobId The solverJobId.
     * @return List of Delivery jobs
     */
    public List<DeliveryJob> retrieveDeliveryJobsForSolverJobId(UUID solverJobId) {
        logger.debug("Loading delivery jobs for solverJobId {}", solverJobId);

        Map<String, String> expressionAttributeNames = new HashMap<>();
        String idAttributeName = "solverJobId";
        expressionAttributeNames.put("#" + idAttributeName, idAttributeName);

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":" + idAttributeName + "Value", AttributeValue.builder().s(solverJobId.toString()).build());

        QueryRequest queryRequest = QueryRequest.builder()
                .tableName(this.tableName)
                .indexName(this.solverJobIdIndexName)
                .keyConditionExpression(String.format("#%s = :%sValue", idAttributeName, idAttributeName))
                .expressionAttributeNames(expressionAttributeNames)
                .expressionAttributeValues(expressionAttributeValues)
                .build();

        List<Map<String, AttributeValue>> dbItems = dbClient.query(queryRequest).items();

        if (dbItems.size() == 0) {
            logger.info("No delivery jobs found for solverJobId {}", solverJobId);
            return new ArrayList<>();
        }

        ObjectMapper mapper = new ObjectMapper();
        List<DeliveryJob> deliveryJobs = new ArrayList<>();

        for (Map<String, AttributeValue> dbItem : dbItems) {
            List<DeliverySegment> segments = dbItem.get("segments").l().stream().map(s -> {
                JsonNode node = JsonAttributeValueUtil.fromAttributeValue(s);
                try {
                    return mapper.treeToValue(node, DeliverySegment.class);
                } catch (JsonProcessingException e) {
                    e.printStackTrace();
                }
                return null;
            }).collect(Collectors.toList());

            DeliveryJob deliveryJob = DeliveryJob.builder()
                    .id(UUID.fromString(dbItem.get("ID").s()))
                    .createdAt(Long.parseLong(dbItem.get("createdAt").n()))
                    .solverJobId(UUID.fromString(dbItem.get("solverJobId").s()))
                    .segments(segments)
                    .build();

            try {
                deliveryJob.setRoute(mapper.treeToValue(JsonAttributeValueUtil.fromAttributeValue(dbItem.get("route")), Segment.class));
            } catch (JsonProcessingException e) {
                logger.error("Error parsing ddbItem :: route", e);
            }

            deliveryJobs.add(deliveryJob);
        }

        logger.debug("{} delivery jobs loaded for solverJobId {}", deliveryJobs.size(), solverJobId);

        return deliveryJobs;
    }

    /**
     * Saves the list of delivery jobs for a solver job.
     * In the implementation, we use chunks of 25 items due to {@link BatchWriteItemRequest} limitations.
     * {@see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html}
     *
     * @param solverJobId  The solver job id.
     * @param deliveryJobs The list of delivery jobs generated by the solver job.
     */
    public void saveJobsForSolverJobId(UUID solverJobId, List<DeliveryJob> deliveryJobs) {

        /*
            A single call to BatchWriteItem can transmit up to 16MB of data over the network, consisting of up to 25
            item put or delete operations. While individual items can be up to 400 KB once stored.
         */
        int MAX_CHUNK_SIZE = 25;
        int iterations = (deliveryJobs.size() / MAX_CHUNK_SIZE) + 1;

        for (int i = 0; i < iterations; i++) {
            int fromIdx = i * MAX_CHUNK_SIZE;
            int toIdx = (i + 1) * MAX_CHUNK_SIZE;
            if (toIdx > deliveryJobs.size()) {
                toIdx = deliveryJobs.size();
            }

            List<DeliveryJob> chunk = deliveryJobs.subList(fromIdx, toIdx);

            Map<String, List<WriteRequest>> requestItems = new HashMap<>();

            List<WriteRequest> writeRequests = new ArrayList<>();
            for (DeliveryJob deliveryJob : chunk) {
                writeRequests.add(WriteRequest.builder()
                        .putRequest(PutRequest.builder().item(this.getPutItemMap(deliveryJob)).build())
                        .build()
                );
            }
            requestItems.put(tableName, writeRequests);

            BatchWriteItemRequest batchWriteItemRequest = BatchWriteItemRequest.builder()
                    .requestItems(requestItems)
                    .build();

            BatchWriteItemResponse response = super.dbClient.batchWriteItem(batchWriteItemRequest);
            logger.debug("BatchWrite Iteration {} :: {}", i, response);
        }

        logger.info("{} deliveryJobs saved for solverJobId {}", deliveryJobs.size(), solverJobId);
    }
}
