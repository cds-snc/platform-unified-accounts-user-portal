import "dotenv/config";

import { confirm, intro, log, select, text } from "@clack/prompts";
import { TextQueryMethod } from "@zitadel/proto/zitadel/object_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";

import { getServiceForHost } from "@lib/service";

const apiKey = process.env.NOTIFY_API_KEY;
const templateId = process.env.TEMPLATE_ID;
const organizationId = process.env.ZITADEL_ORGANIZATION;
const devHost = process.env.DEV_HOST_DOMAIN;
const stagingHost = process.env.STAGING_HOST_DOMAIN;
const productionHost = process.env.PRODUCTION_HOST_DOMAIN;
const zitadelApi = process.env.ZITADEL_API_URL;

const unlockMain = async () => {
  intro("Unlock User: Checking all systems go...");

  if (!apiKey || !templateId || !organizationId || !devHost || !stagingHost || !productionHost) {
    log.error("Missing required Environment Variables");
    return;
  }

  const envHost = await select({
    message: "Please choose which environment we are unlocking a user too:",
    options: [
      {
        label: "Local Env",
        value: devHost,
      },
      {
        label: "Staging Env",
        value: stagingHost,
      },
      {
        label: "Production Env",
        value: productionHost,
      },
    ],
  });

  if (typeof envHost === "symbol") {
    log.warn("Exiting without selecting Environment");

    return;
  }

  // Guard Check to ensure that the Zitadel env is correctly set for the chosen environment.

  switch (envHost) {
    case devHost:
    case stagingHost: {
      if (!zitadelApi?.includes(stagingHost)) {
        throw new Error(
          "You are trying to use the wrong version of the Zitadel API for the Staging and Local Dev environment"
        );
      }
      break;
    }
    case productionHost:
      {
        if (!zitadelApi?.includes(productionHost)) {
          throw new Error(
            "You are trying to use the wrong version of the Zitadel API for the Production environment"
          );
        }
      }
      break;
    default: {
      throw new Error("Environment does not match any of the known selections");
    }
  }

  const userManagement = await getServiceForHost("UserService");

  const userEmail = await text({
    message: "What user's email address do you want to unlock?",
    validate: (value) => {
      if (value && value?.indexOf("@") > 0) {
        return undefined;
      }
      return "Email must contain the '@' character";
    },
  }).then((val) => {
    if (typeof val !== "string") {
      throw new Error("Email must not be empty");
    }
    return val.toLocaleLowerCase();
  });

  const inactiveUserAccounts = await userManagement
    .listUsers({
      queries: [
        {
          query: {
            value: {
              emailAddress: userEmail,
              method: TextQueryMethod.EQUALS_IGNORE_CASE,
            },
            case: "emailQuery",
          },
        },
        {
          query: {
            case: "notQuery",
            value: {
              query: {
                query: {
                  case: "stateQuery",
                  value: { state: UserState.ACTIVE },
                },
              },
            },
          },
        },
      ],
    })
    .then((response) => {
      return response.result.map(({ userId, username, state }) => ({
        userId,
        username,
        state,
      }));
    });

  if (inactiveUserAccounts.length > 0) {
    log.info(
      `${inactiveUserAccounts[0].username} is current in the state of ${UserState[inactiveUserAccounts[0].state]}`
    );
  } else {
    log.info(`${userEmail} is currently not locked or does not exist`);
    return;
  }

  const account = inactiveUserAccounts[0];

  const shouldContinue = await confirm({
    message: `Are you sure you want to unlock ${account.username}? `,
  });

  if (typeof shouldContinue === "symbol" || !shouldContinue) {
    log.warn("Exiting without unlocking user");

    return;
  }
  await userManagement.unlockUser({ userId: account.userId });
};

unlockMain();
