#!/bin/bash
set -euo pipefail

PROFILE_NAME="platform-unified-accounts-staging"

usage() {
  echo "Usage: $(basename "$0") <path-to-openvpn-config>" >&2
}

if ! command -v aws-vpn-client >/dev/null 2>&1; then
  echo "Error: aws-vpn-client is not installed or is not available on PATH." >&2
  echo "Install AWS VPN Client before running this script." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Error: specify the path to an OpenVPN configuration file." >&2
  usage
  exit 1
fi

VPN_CONFIG_PATH="$1"

if [[ ! -f "$VPN_CONFIG_PATH" ]]; then
  echo "Error: VPN configuration file does not exist: $VPN_CONFIG_PATH" >&2
  usage
  exit 1
fi

VPN_PROFILES="$(aws-vpn-client list-profiles)"
if grep -Fq "\"profile-name\": \"$PROFILE_NAME\"" <<< "$VPN_PROFILES"; then
  echo "Error: VPN profile '$PROFILE_NAME' already exists; please run 'make vpn_connect'." >&2
  exit 0
fi

if aws-vpn-client import-profile --profile-name "$PROFILE_NAME" --config-path "$VPN_CONFIG_PATH"; then
  echo "✅️ Success: VPN profile import for '$PROFILE_NAME'."
else
  echo "💀 Error: VPN profile import failed for '$PROFILE_NAME'." >&2
  exit 1
fi
