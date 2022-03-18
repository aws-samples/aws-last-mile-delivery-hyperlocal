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

package dev.aws.proto.core.util.aws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;
import software.amazon.awssdk.services.ssm.model.GetParameterResponse;

public class SsmUtility {
    private static final Logger logger = LoggerFactory.getLogger(SsmUtility.class);

    public static String getParameterValue(String parameterName) {
        AwsCredentialsProvider credentialsProvider = CredentialsHelper.getCredentialsProvider();

        SsmClient ssmClient = SsmClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(CredentialsHelper.getRegion())
                .build();

        GetParameterRequest getParameterRequest = GetParameterRequest.builder()
                .name(parameterName)
                .build();

        try {
            GetParameterResponse getParameterResponse = ssmClient.getParameter(getParameterRequest);
            String result = getParameterResponse.parameter().value();

            logger.info("SSM Parameter successfully retrieved from SSM Parameter Store: {} = {}", parameterName, result);

            return result;
        } catch (AwsServiceException e) {
            logger.error("GetParameter :: AwsServiceException :: {}", e.getMessage());
        } catch (SdkClientException e) {
            logger.error("GetParameter :: SdkClientException :: {}", e.getMessage());
        }

        return null;
    }
}
