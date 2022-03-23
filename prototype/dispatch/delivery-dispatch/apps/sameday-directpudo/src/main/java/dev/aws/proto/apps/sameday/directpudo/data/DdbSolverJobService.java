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

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.aws.proto.apps.appcore.data.DdbServiceBase;
import dev.aws.proto.apps.sameday.directpudo.api.response.SolverJob;
import dev.aws.proto.apps.sameday.directpudo.config.DdbProperties;
import dev.aws.proto.core.util.aws.SsmUtility;
import io.vertx.core.impl.logging.Logger;
import io.vertx.core.impl.logging.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class DdbSolverJobService extends DdbServiceBase {
    private static final Logger logger = LoggerFactory.getLogger(DdbSolverJobService.class);

    /**
     * Config properties for DDB connection.
     */
    @Inject
    DdbProperties ddbProperties;

    /**
     * The DDB table name.
     */
    final String tableName;

    DdbSolverJobService(DdbProperties ddbProperties) {
        this.ddbProperties = ddbProperties;
        this.tableName = SsmUtility.getParameterValue(ddbProperties.solverJobsTableParameterName());
        super.dbClient = super.createDBClient();
    }

    @Override
    protected String getTableName() {
        return this.tableName;
    }

    @Override
    protected Map<String, AttributeValue> getPutItemMap(Object solverJob_) {
        SolverJob solverJob = (SolverJob) solverJob_;

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("ID", AttributeValue.builder().s(solverJob.getProblemId().toString()).build());
        item.put("score", AttributeValue.builder().s(solverJob.getScore()).build());
        item.put("state", AttributeValue.builder().s(solverJob.getState()).build());
        item.put("createdAt", AttributeValue.builder().n(String.valueOf(solverJob.getCreatedAt())).build());
        item.put("executionId", AttributeValue.builder().s(solverJob.getExecutionId()).build());
        item.put("solverDurationInMs", AttributeValue.builder().n(String.valueOf(solverJob.getSolverDurationInMs())).build());

        return item;
    }

    public void save(SolverJob solverJob) {
        super.dbClient.putItem(super.putRequest(solverJob));
    }

    public SolverJob getItem(UUID problemId) {
        List<Map<String, AttributeValue>> dbItems = super.dbClient.query(this.getQueryRequest("ID", problemId)).items();
        if (dbItems.size() == 0) {
            return null;
        }

        Map<String, AttributeValue> dbItem = dbItems.get(0);
        ObjectMapper mapper = new ObjectMapper();

        SolverJob result = SolverJob.builder()
                .problemId(problemId)
                .createdAt(Long.parseLong(dbItem.get("createdAt").n()))
                .score(dbItem.get("score").s())
                .solverDurationInMs(Long.parseLong(dbItem.get("solverDurationInMs").n()))
                .state(dbItem.get("state").s())
                .executionId(dbItem.get("executionId").s())
                .build();

        return result;
    }
}
