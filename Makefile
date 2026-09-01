CONFIG ?= downloaded-client-config.ovpn

help:
	@printf '%s\n' \
		'VPN management: ' \
		'Use these commands when developing with the Staging IdP.' \
		'Ask the team for the .ovpn config file:' \
		'  1. make vpn_profile CONFIG=./path/config.ovpn --- Create a VPN profile; only needed once' \
		'  2. make vpn_connect ----------------------------- Connect to the VPN' \
		'  3. make vpn_disconnect -------------------------- Disconnect from the VPN'

vpn_connect:
	@./scripts/vpn-connect.sh connect

vpn_disconnect:
	@./scripts/vpn-connect.sh disconnect

vpn_profile:
	@./scripts/vpn-profile-import.sh ${CONFIG}

.PHONY: \
	help \
	vpn_connect \
	vpn_disconnect \
	vpn_profile