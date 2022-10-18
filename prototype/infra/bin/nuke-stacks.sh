#!/bin/bash

# usage:
# for dryrun :: NUKE_DRYRUN=1 ./nuke-stacks.sh hyperlocalAdmin ap-southeast-1
# for wiping :: ./nuke-stacks.sh hyperlocalAdmin ap-southeast-1

echo "Nuke Stack !!! This will force delete all prefixed resources in the account/region specified... use caution!"

read -p "AWS Profile [$1]: " profile
profile=${profile:-$1}

read -p "AWS Region [$2]: " region
region=${region:-$2}

read -p "Namespace [devproto-]: " prefix
prefix=${prefix:-devproto}

account_id=$(aws sts get-caller-identity --query Account --output text --profile $profile)

read -p "Are you sure you want to NUKE \"${prefix}*\" resources in account $account_id ($region)? " -n 1 -r
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

if [ -z "$NUKE_DRYRUN" ]; then
    NUKE_DRYRUN=0
fi

function executeCommand() {
    if [ $NUKE_DRYRUN -eq 1 ]; then
        printf "\n\t[DRYRUN] $1"
        printf "\n\t[DRYRUN] Deleted $2: $3"
    else
        printf "\n\tExecuting: $1"
        X=`eval ${1}`
        printf "\n\tDeleted $2: $3"
    fi
}

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking S3 Buckets ####\n\n"
BUCKET_NAMES_RESP=$(aws s3 ls --profile $profile --region $region | awk '{print $3}' | grep -i "^$prefix-.*")
BUCKET_NAMES=(${BUCKET_NAMES_RESP//:/ })

for bucket in "${BUCKET_NAMES[@]}"
do
    DELETECOMMAND="aws s3 rb s3://${bucket} --force --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "Bucket" "$bucket"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking DynamoDB Tables ####\n\n"
CMD="aws dynamodb list-tables --query 'TableNames[?starts_with(@, \`$prefix-\`) == \`true\`]' --output text --profile $profile --region $region"
TABLENAMES_RESP=`eval ${CMD}`
TABLENAMES=(${TABLENAMES_RESP//:/ })

for table in "${TABLENAMES[@]}"
do
    DELETECOMMAND="aws dynamodb delete-table --table-name $table --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "DDB Table" "$table"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
# printf "\n\n### Nuking SNS Topics ####\n\n"
# ARNPREFIX="arn:aws:sns:$region:$account_id:$prefix-"
# CMD="aws sns list-topics --query 'Topics[?starts_with(TopicArn, \`$ARNPREFIX\`) == \`true\`]' --output text --profile $profile --region $region"
# SNS_RESP=`eval ${CMD}`
# echo $SNS_RESP
# SNS_ARNS=(${SNS_RESP//,/ })

# for topicArn in "${SNS_ARNS[@]}"
# do
#     DELETECOMMAND="aws sns delete-topic --topic-arn $topicArn --profile $profile --region $region"
#     executeCommand "$DELETECOMMAND" "SNS Topic" "$topicArn"
# done
## aws sns list-topics --profile $profile --region $region | jq .'Topics[]' -r | grep -io "arn:.*:$prefix[^\"]*" | xargs -ITABLE -n 1 aws sns delete-topic --output text --topic-arn TABLE --profile $profile --region $region > /dev/null
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking Cognito User Pools"
CMD="aws cognito-idp list-user-pools --max-results 60 --profile $profile --region $region --output text --query 'UserPools[?starts_with(Name, \`$prefix-\`) == \`true\`].Id'"
USERPOOL_RESP=`eval ${CMD}`
USERPOOL_IDS=(${USERPOOL_RESP//:/ })

for userPoolId in "${USERPOOL_IDS[@]}"
do
    DELETECOMMAND="aws cognito-idp delete-user-pool --user-pool-id $userPoolId --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "UserPool" "$userPoolId"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking Cognito Identity Pools"
CMD="aws cognito-identity list-identity-pools --max-results 20 --profile $profile --region $region --output text --query 'IdentityPools[?starts_with(IdentityPoolName, \`$prefix-\`) == \`true\`].IdentityPoolId'"
IDENTITYPOOL_RESP=`eval ${CMD}`
IDENTITYPOOL_IDS=(${IDENTITYPOOL_RESP//=/ })

for identityPoolId in "${IDENTITYPOOL_IDS[@]}"
do
    DELETECOMMAND="aws cognito-identity delete-identity-pool --identity-pool-id $identityPoolId --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "IdentityPool" "$identityPoolId"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
# printf "\n\n### Nuking IOT Certificates ####\n\n"
# CERT_IDS_RESP=$(aws iot list-certificates --query 'certificates[].certificateId' --output text --profile $profile --region $region)
# CERT_IDS=(${CERT_IDS_RESP//:/ })

# for id in "${CERT_IDS[@]}"
# do
#     X=$(aws iot delete-certificate --certificate-id "$id" --profile $profile --region $region)
#     printf "\n\tDeleted IoT Certificate: $id"
# done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking IOT Policies ####\n\n"
CMD="aws iot list-policies --query 'policies[?starts_with(policyName, \`$prefix_\`) == \`true\`].policyName' --output text --profile $profile --region $region"
POLICYNAMES_RESP=`eval ${CMD}`
POLICYNAMES=(${POLICYNAMES_RESP//:/ })

for id in "${POLICYNAMES[@]}"
do
    DELETECOMMAND="aws iot delete-policy --policy-name $id --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "IoT Policy" "$id"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking ECR Repos ####\n\n"
CMD="aws ecr describe-repositories --query 'repositories[?starts_with(repositoryName, \`$prefix-\`) == \`true\`].repositoryName' --output text --profile $profile --region $region"
REPONAMES_RESP=`eval ${CMD}`
REPONAMES=(${REPONAMES_RESP//:/ })

for id in "${REPONAMES[@]}"
do
    DELETECOMMAND="aws ecr delete-repository --repository-name $id --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "ECR Repo" "$id"
done
### --------------------------------------------------------------------------------------------------------------------

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking OpenSearch Domains ####\n\n"
CMD="aws es list-domain-names --query 'DomainNames[?starts_with(DomainName, \`$prefix-\`) == \`true\`].DomainName' --output text --profile $profile --region $region"
DOMAINNAMES_RESP=`eval ${CMD}`
DOMAINNAMES=(${DOMAINNAMES_RESP//:/ })

for id in "${DOMAINNAMES[@]}"
do
    DELETECOMMAND="aws opensearch delete-domain --domain-name $id --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "ES Domain" "$id"
done
### --------------------------------------------------------------------------------------------------------------------

# TODO: add Nuke VPC
# TODO: add Nuke MemoryDB for Redis Cluster + Subnet Group

### --------------------------------------------------------------------------------------------------------------------
printf "\n\n### Nuking Log Groups ####\n\n"
CMD="aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, \`/$prefix-\`) == \`true\`].logGroupName' --output text --profile $profile --region $region"
LOGGROUPS_RESP=`eval ${CMD}`
LOGGROUPNAMES=(${LOGGROUPS_RESP//,/ })

for logGroupName in "${LOGGROUPNAMES[@]}"
do
    DELETECOMMAND="aws logs delete-log-group --log-group-name $logGroupName --profile $profile --region $region"
    executeCommand "$DELETECOMMAND" "Log Group" "$logGroupName"
done
### --------------------------------------------------------------------------------------------------------------------

printf "\n\n Verify Cognito User Pools have been removed"
printf "\n\t - https://$region.console.aws.amazon.com/cognito/users/?region=$region"

printf "\n\nVerify IoT Certificate and Policies need to be deleted manually"
printf "\n\t- https://$region.console.aws.amazon.com/iot/home?region=$region#/certificatehub"
printf "\n\t- https://$region.console.aws.amazon.com/iot/home?region=$region#/policyhub"
printf "\n"
