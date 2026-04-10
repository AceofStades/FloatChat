#!/bin/bash
set -e
ACCOUNT_ID="328879699877"
REGION="ap-south-1"

echo "Creating Lambda Execution Role..."
aws iam create-role \
    --role-name floatchat-lambda-role \
    --assume-role-policy-document file://trust-policy.json > /dev/null || true

aws iam attach-role-policy \
    --role-name floatchat-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole || true
aws iam attach-role-policy \
    --role-name floatchat-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess || true
aws iam attach-role-policy \
    --role-name floatchat-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess || true

echo "Waiting for IAM role to propagate..."
sleep 5

echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

echo "Building Docker image (this may take a moment)..."
# Disable BuildKit as it's missing or broken on the host
DOCKER_BUILDKIT=0 docker build -t floatchat-backend ./server

echo "Tagging and pushing Docker image..."
docker tag floatchat-backend:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/floatchat-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/floatchat-backend:latest

echo "Creating Lambda Function..."
aws lambda create-function \
    --function-name floatchat-api \
    --package-type Image \
    --code ImageUri=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/floatchat-backend:latest \
    --role arn:aws:iam::$ACCOUNT_ID:role/floatchat-lambda-role \
    --memory-size 1024 \
    --timeout 300 \
    --region $REGION > /dev/null || true

echo "Backend Deployment Complete!"
