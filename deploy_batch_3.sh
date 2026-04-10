#!/bin/bash
set -e
ACCOUNT_ID="328879699877"
REGION="ap-south-1"

echo "Creating CloudTrail Log Bucket..."
aws s3 mb s3://floatchat-cloudtrail-logs-$ACCOUNT_ID --region $REGION || true

aws s3api put-bucket-policy --bucket floatchat-cloudtrail-logs-$ACCOUNT_ID --policy file://cloudtrail-policy.json

echo "Creating CloudTrail..."
aws cloudtrail create-trail \
    --name FloatChatAuditTrail \
    --s3-bucket-name floatchat-cloudtrail-logs-$ACCOUNT_ID \
    --is-multi-region-trail \
    --region $REGION > /dev/null || true

aws cloudtrail start-logging \
    --name FloatChatAuditTrail \
    --region $REGION > /dev/null

echo "Creating CloudWatch Log Group for Lambda..."
aws logs create-log-group \
    --log-group-name /aws/lambda/floatchat-api \
    --region $REGION > /dev/null || true

echo "Creating API Gateway..."
API_ID=$(aws apigateway create-rest-api \
    --name "floatchat-rest-api" \
    --endpoint-configuration types=REGIONAL \
    --region $REGION \
    --query 'id' --output text)
echo "Created API Gateway: $API_ID"
