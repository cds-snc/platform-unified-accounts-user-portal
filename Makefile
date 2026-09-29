CONFIG ?= downloaded-client-config.ovpn

help:
	@printf '%b\n' \
		'------------------------------------------------------' \
		'\033[35mVPN management\033[0m' \
		'------------------------------------------------------' \
		'Use these commands to connect to the Staging IdP VPN.' \
		'The team can get you the .ovpn config file.' \
		'\n' \
		'  1. \033[36mmake vpn_profile\033[0m \033[33mCONFIG=./path/config.ovpn\033[0m ... Create a VPN profile; only needed once' \
		'  2. \033[36mmake vpn_connect\033[0m ............................. Connect to the VPN' \
		'  3. \033[36mmake vpn_disconnect\033[0m .......................... Disconnect from the VPN'

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