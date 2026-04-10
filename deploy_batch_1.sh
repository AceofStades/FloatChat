#!/bin/bash
set -e

ACCOUNT_ID="328879699877"
REGION="ap-south-1"
FRONTEND_BUCKET="floatchat-frontend-$ACCOUNT_ID"
USER_DATA_BUCKET="floatchat-user-data-$ACCOUNT_ID"

echo "Creating DynamoDB tables..."
aws dynamodb create-table --table-name Users --attribute-definitions AttributeName=userId,AttributeType=S --key-schema AttributeName=userId,KeyType=HASH --billing-mode PAY_PER_REQUEST --region $REGION || true
aws dynamodb create-table --table-name ChatHistory --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=timestamp,AttributeType=S --key-schema AttributeName=userId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE --billing-mode PAY_PER_REQUEST --region $REGION || true
aws dynamodb create-table --table-name Sessions --attribute-definitions AttributeName=sessionId,AttributeType=S --key-schema AttributeName=sessionId,KeyType=HASH --billing-mode PAY_PER_REQUEST --region $REGION || true

echo "Setting up Frontend S3 bucket ($FRONTEND_BUCKET)..."
aws s3 mb s3://$FRONTEND_BUCKET --region $REGION || true
aws s3api put-public-access-block --bucket $FRONTEND_BUCKET --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

cat <<POL > frontend-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::$FRONTEND_BUCKET/*"]
    }
  ]
}
POL
aws s3api put-bucket-policy --bucket $FRONTEND_BUCKET --policy file://frontend-policy.json
aws s3 website s3://$FRONTEND_BUCKET --index-document index.html --error-document 404/index.html

echo "Syncing Frontend Build to S3..."
aws s3 sync out/ s3://$FRONTEND_BUCKET > /dev/null

echo "Setting up User Data S3 bucket ($USER_DATA_BUCKET)..."
aws s3 mb s3://$USER_DATA_BUCKET --region $REGION || true
aws s3api put-public-access-block --bucket $USER_DATA_BUCKET --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "Batch 1 Complete."
