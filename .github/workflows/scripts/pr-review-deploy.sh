#!/bin/bash
set -euo pipefail

# Usage: pr-review-deploy.sh <function-name> <image-uri> <role-arn> <subnet-ids> <security-group-ids> <zitadel-api-url> <hcaptcha-site-key> <hcaptcha-secret>
# Outputs the function URL to stdout

FUNCTION_NAME="$1"
IMAGE_URI="$2"
ROLE_ARN="$3"
SUBNET_IDS="$4"
SECURITY_GROUP_IDS="$5"
ZITADEL_API_URL="$6"
HCAPTCHA_SITE_KEY="$7"
HCAPTCHA_SECRET="$8"
ENVIRONMENT="Variables={ZITADEL_API_URL=$ZITADEL_API_URL,NEXT_PUBLIC_HCAPTCHA_SITE_KEY=$HCAPTCHA_SITE_KEY,HCAPTCHA_SECRET=$HCAPTCHA_SECRET}"

if aws lambda get-function --function-name "$FUNCTION_NAME" > /dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" > /dev/null 2>&1
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --role "$ROLE_ARN" \
    --timeout 30 \
    --memory-size 2048 \
    --architectures "arm64" \
    --code "ImageUri=$IMAGE_URI" \
    --environment "$ENVIRONMENT" \
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

  aws lambda create-function-url-config --function-name "$FUNCTION_NAME" --auth-type NONE > /dev/null 2>&1

  aws logs create-log-group --log-group-name "/aws/lambda/$FUNCTION_NAME" > /dev/null 2>&1
  aws logs put-retention-policy \
    --log-group-name "/aws/lambda/$FUNCTION_NAME" \
    --retention-in-days 14 > /dev/null 2>&1

  aws lambda put-function-concurrency \
  --function-name "$FUNCTION_NAME" \
  --reserved-concurrent-executions 10 > /dev/null 2>&1
fi

aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "$ENVIRONMENT" > /dev/null 2>&1

aws lambda wait function-updated --function-name "$FUNCTION_NAME" > /dev/null 2>&1
URL="$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" | jq -r .FunctionUrl)"
echo "$URL"
