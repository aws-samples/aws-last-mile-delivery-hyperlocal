# Kibana access

## Resources

* <https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-dashboards-vpc-cognito/>
* <https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-outside-vpc-nginx/>

## Current solution [DEV]

1. We create an `internal` cognito user pool and setup access policies (`cognito-auth/InternalIdentityStack`)
2. Setup HTTPS access through `DMZ`, `Redis` security groups
3. Add `nginx` to proxy HTTPS request on bastion host (`prototype/scripts/nginx-proxy-bastion-kibana.sh`)
