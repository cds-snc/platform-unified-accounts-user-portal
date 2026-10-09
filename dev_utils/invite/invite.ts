import "dotenv/config";

import { confirm, intro, log, select, text } from "@clack/prompts";
import { GCNotifyConnector } from "@gcforms/connectors";

import { getServiceForHost } from "@lib/service";
import { listUsers } from "@lib/zitadel";

const apiKey = process.env.NOTIFY_API_KEY;
const templateId = process.env.TEMPLATE_ID;
const organizationId = process.env.ZITADEL_ORGANIZATION;
const devHost = process.env.DEV_HOST_DOMAIN;
const stagingHost = process.env.STAGING_HOST_DOMAIN;
const productionHost = process.env.PRODUCTION_HOST_DOMAIN;

function capitalizeFirstLetter(str: string) {
  if (!str) return ""; // Handle empty strings or null/undefined
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const inviteMain = async () => {
  intro("Invite User: Checking all systems go...");

  if (!apiKey || !templateId || !organizationId || !devHost || !stagingHost || !productionHost) {
    log.error("Missing required Environment Variables");
    return;
  }

  const envHost = await select({
    message: "Please choose which environment we are inviting the user too:",
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

  const userManagement = await getServiceForHost("UserService");

  const inviteEmail = await text({
    message: "What email address do you want to invite?",
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
    return val;
  });

  const [givenName, familyName] = inviteEmail.split("@")[0].split(".");

  log.message(
    `Inviting user: ${capitalizeFirstLetter(givenName)} ${capitalizeFirstLetter(familyName)}`
  );

  const { id: userId } = await userManagement
    .createUser({
      organizationId,
      username: inviteEmail,
      userType: {
        case: "human",
        value: {
          email: {
            email: inviteEmail,
            verification: {
              case: "isVerified",
              value: false,
            },
          },
          passwordType: {
            case: undefined,
          },
          profile: {
            givenName,
            familyName,
          },
        },
      },
    })
    .catch(async (e) => {
      if (e instanceof Error && e.message.indexOf("[already_exists]") !== -1) {
        return listUsers({ email: inviteEmail }).then(({ result }) => {
          if (result.length < 1) {
            throw new Error("Something went wrong... User exists but cannot be found");
          }
          return { id: result[0].userId };
        });
      }
      throw e;
    });

  const shouldContinue = await confirm({
    message: `Are you sure you want to invite ${inviteEmail}? `,
  });

  const { inviteCode } = await userManagement.createInviteCode({
    userId,
    verification: {
      case: "returnCode",
      value: {},
    },
  });

  if (typeof shouldContinue === "symbol" || !shouldContinue) {
    log.warn("Exiting without inviting user");

    return;
  }

  const registerParam = Buffer.from(JSON.stringify({ inviteCode, inviteEmail }), "utf8").toString(
    "base64"
  );

  const gcNotify = GCNotifyConnector.default(apiKey);
  await gcNotify.sendEmail(inviteEmail, templateId, {
    subject: "You're Invited | Vous êtes invités",
    formResponse: `
  **You're Invited | Vous êtes invités**

  You're invited to try out this new super cool GCPlatform single sign on service!
  Click on this [registration link to continue](http${envHost.includes("localhost") ? "" : "s"}://${envHost}/register?invite=${registerParam})

  ---

  {{French translation to follow}}`,
  });
};

inviteMain();
