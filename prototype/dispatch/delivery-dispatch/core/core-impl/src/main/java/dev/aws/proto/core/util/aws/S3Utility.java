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
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.nio.file.Path;

public class S3Utility {
    private static final Logger logger = LoggerFactory.getLogger(S3Utility.class);

    public static void downloadFile(String bucketName, String keyPath, Path localFilePath) {
        AwsCredentialsProvider credentialsProvider = CredentialsHelper.getCredentialsProvider();

        S3Client s3Client = S3Client.builder()
                .credentialsProvider(credentialsProvider)
                .region(CredentialsHelper.getRegion())
                .build();

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(keyPath)
                .build();

        try {
            logger.debug("Downloading s3://{}/{} to {}", bucketName, keyPath, localFilePath);
            GetObjectResponse getObjectResponse = s3Client.getObject(getObjectRequest, localFilePath);
            logger.info("{} from {} was downloaded to {} ({} bytes)", keyPath, bucketName, localFilePath, getObjectResponse.contentLength());
        } catch (NoSuchKeyException e) {
            logger.error("Key ({}) doesn't exist in S3 Bucket: {}", getObjectRequest.key(), e.getMessage());
        } catch (AwsServiceException | SdkClientException e) {
            logger.error("Error while downloading file from S3 bucket '{}/{}': {}", bucketName, keyPath, e.getMessage());
        } catch (Exception e) {
            logger.error("Generic error :: {}", e.getMessage());
        }
    }

    public static void uploadFile(String bucketName, String keyPath, Path localFilePath) {
        AwsCredentialsProvider credentialsProvider = CredentialsHelper.getCredentialsProvider();

        S3Client s3Client = S3Client.builder()
                .credentialsProvider(credentialsProvider)
                .region(CredentialsHelper.getRegion())
                .build();

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(keyPath)
                .build();

        try {
            logger.debug("Uploading {} to s3://{}/{}", localFilePath, putObjectRequest.bucket(), putObjectRequest.key());
            PutObjectResponse putObjectResponse = s3Client.putObject(putObjectRequest, localFilePath);
            logger.info("{} was uploaded to {}/{}", localFilePath.getFileName(), putObjectRequest.bucket(), putObjectRequest.key());
        } catch (AwsServiceException | SdkClientException e) {
            logger.error("Error while uploading file {} to S3 bucket '{}/{}': {}", localFilePath.getFileName(), bucketName, putObjectRequest.key(), e.getMessage());
        }
    }
}
