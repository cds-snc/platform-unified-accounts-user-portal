#!/bin/bash
set -euo pipefail

PROFILE_NAME="platform-unified-accounts-staging"

usage() {
  echo "Usage: $(basename "$0") <connect|disconnect>" >&2
}

if [[ $# -ne 1 ]]; then
  echo "Error: specify whether to connect or disconnect." >&2
  usage
  exit 1
fi

ACTION="$1"
if [[ "$ACTION" != "connect" && "$ACTION" != "disconnect" ]]; then
  echo "Error: action must be either 'connect' or 'disconnect'." >&2
  usage
  exit 1
fi

if ! command -v aws-vpn-client >/dev/null 2>&1; then
  echo "Error: aws-vpn-client is not installed or is not available on PATH." >&2
  echo "Install AWS VPN Client before running this script." >&2
  exit 1
fi

VPN_PROFILES="$(aws-vpn-client list-profiles)"
if ! grep -Fq "\"profile-name\": \"$PROFILE_NAME\"" <<< "$VPN_PROFILES"; then
  echo "Error: VPN profile '$PROFILE_NAME' does not exist; please run 'make vpn-profile-import'."
  exit 1
fi

if aws-vpn-client "$ACTION" --profile-name "$PROFILE_NAME"; then
  echo "✅️ Success: VPN $ACTION for profile '$PROFILE_NAME'."
else
  echo "💀 Error: VPN $ACTION failed for profile '$PROFILE_NAME'." >&2
  exit 1
fi
