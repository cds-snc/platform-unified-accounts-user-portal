import { styleText } from "node:util";
import * as client from "openid-client";
import readline from "readline";

import serverConfig from "../openid-configuration.json";

import "dotenv/config";

function getValue(query: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function start() {
  const clientId = process.env.RP_CLIENT_ID; // Client identifier at the Authorization Server
  if (!clientId) {
    throw new Error("RP Client ID is not configured in .env");
  }
  const config = new client.Configuration(serverConfig, clientId);

  // Needed to allow insecure requests (always shows as depreceated)
  client.allowInsecureRequests(config);

  console.info("[Server Configuration] Complete");
  /**
   * Value used in the authorization request as the redirect_uri parameter, this
   * is typically pre-registered at the Authorization Server.
   */
  const redirect_uri = process.env.RP_CALLBACK_URL;
  if (!redirect_uri) {
    throw new Error("RP Callback URL is not defined in .env");
  }
  const scope = "openid email profile"; // Scope of the access request

  const requestedFlow = await getValue(
    "Flow to Initiate:  [0] Register || [1] Select Account: "
  ).then((ans) => (ans === "1" ? "select_account" : "create"));

  /**
   * PKCE: The following MUST be generated for every redirect to the
   * authorization_endpoint. You must store the code_verifier and state in the
   * end-user session such that it can be recovered as the user gets redirected
   * from the authorization server back to your application.
   */

  console.info("[PKCE] Code Creation");
  const code_verifier: string = client.randomPKCECodeVerifier();
  const code_challenge: string = await client.calculatePKCECodeChallenge(code_verifier);

  const parameters: Record<string, string> = {
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method: "S256",
    prompt: requestedFlow,
  };

  console.info("[PKCE] Request Created");

  const redirectTo: URL = client.buildAuthorizationUrl(config, parameters);

  const response = await fetch(redirectTo);
  if (!response.redirected) {
    console.error("Something when wrong...");
    console.error(response);
  }
  const redirectedURL = response.url.replace(
    "https://auth.cdssandbox.xyz",
    "http://localhost:3002"
  );
  console.info(
    styleText(
      "bold",
      `Copy and paste this URL into a new tab to initiate ${requestedFlow} flow: \n`
    )
  );
  console.info(styleText(["underline", "green"], redirectedURL));
}

start();
