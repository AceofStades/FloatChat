#!/bin/bash
set -e
ACCOUNT_ID="328879699877"
REGION="ap-south-1"

echo "Creating Cognito User Pool..."
POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name FloatChatUsers \
    --auto-verified-attributes email \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
    --query 'UserPool.Id' --output text)
echo "Created User Pool: $POOL_ID"

echo "Creating Cognito App Client..."
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $POOL_ID \
    --client-name FloatChatWebClient \
    --no-generate-secret \
    --query 'UserPoolClient.ClientId' --output text)
echo "Created App Client: $CLIENT_ID"

echo "Creating CloudFront Distribution..."
aws cloudfront create-distribution \
    --origin-domain-name "floatchat-frontend-$ACCOUNT_ID.s3-website.$REGION.amazonaws.com" \
    --default-root-object index.html > /dev/null
echo "Created CloudFront Distribution"

echo "Creating WAF Web ACL..."
aws wafv2 create-web-acl \
    --name FloatChatWAF \
    --scope REGIONAL \
    --default-action Allow={} \
    --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=FloatChatWAFMetrics \
    --region $REGION > /dev/null
echo "Created WAF Web ACL"

echo "Creating ECR Repository..."
aws ecr create-repository \
    --repository-name floatchat-backend \
    --region $REGION > /dev/null || true
echo "Created ECR Repository"
