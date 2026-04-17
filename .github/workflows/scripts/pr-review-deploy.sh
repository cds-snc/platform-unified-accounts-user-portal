#!/bin/bash
set -euo pipefail

# Usage: pr-review-deploy.sh <function-name> <image-uri> <role-arn> <subnet-ids> <security-group-ids> 
# Outputs the function URL to stdout when a new function is created.

FUNCTION_NAME="$1"
IMAGE_URI="$2"
ROLE_ARN="$3"
SUBNET_IDS="$4"
SECURITY_GROUP_IDS="$5"

if aws lambda get-function --function-name "$FUNCTION_NAME" > /dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" > /dev/null 2>&1
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --role "$ROLE_ARN" \
    --timeout 15 \
    --memory-size 2048 \
    --architectures "arm64" \
    --code "ImageUri=$IMAGE_URI" \
    --description "cds-snc/platform-unified-accounts-user-portal" \
    --vpc-config "SubnetIds=$SUBNET_IDS,SecurityGroupIds=$SECURITY_GROUP_IDS" > /dev/null 2>&1

  aws lambda wait function-active --function-name "$FUNCTION_NAME" > /dev/null 2>&1

  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id AllowPublicInvokeFunctionUrl \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE > /dev/null 2>&1
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id AllowPublicInvokeFunction \
    --action lambda:InvokeFunction \
    --principal "*" > /dev/null 2>&1

  URL="$(aws lambda create-function-url-config --function-name "$FUNCTION_NAME" --auth-type NONE | jq -r .FunctionUrl)"
  echo "$URL"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "Variables={NEXTAUTH_URL=$URL}" > /dev/null 2>&1

  aws logs create-log-group --log-group-name "/aws/lambda/$FUNCTION_NAME" > /dev/null 2>&1
  aws logs put-retention-policy \
    --log-group-name "/aws/lambda/$FUNCTION_NAME" \
    --retention-in-days 14 > /dev/null 2>&1
fi

aws lambda wait function-updated --function-name "$FUNCTION_NAME" > /dev/null 2>&1
aws lambda put-function-concurrency \
  --function-name "$FUNCTION_NAME" \
  --reserved-concurrent-executions 10 > /dev/null 2>&1
