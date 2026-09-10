import "dotenv/config";

import { confirm, intro, multiselect, outro, text } from "@clack/prompts";
import { TextQueryMethod } from "@zitadel/proto/zitadel/object_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";

import { getServiceForHost } from "@lib/service";

const manage = async () => {
  intro("User Management");
  const userManagement = await getServiceForHost("UserService");

  const devEmail = await text({
    message: "What email address is your main account?",
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

  const searchCriteria = devEmail.split("@")[0];

  const userAccounts = await userManagement
    .listUsers({
      queries: [
        {
          query: {
            value: { emailAddress: searchCriteria, method: TextQueryMethod.CONTAINS },
            case: "emailQuery",
          },
        },
        {
          query: {
            case: "stateQuery",
            value: { state: UserState.ACTIVE },
          },
        },
      ],
    })
    .then((response) => {
      return response.result.map(({ userId, username }) => ({
        userId,
        username,
      }));
    });

  const selectedAccounts = await multiselect({
    message: "Select which accounts from the following you would like to flag for deletion",
    options: userAccounts
      .filter((val) => val.username !== devEmail)
      .map((val) => ({
        value: val.userId,
        label: val.username,
      })),
    required: false,
  });

  if (typeof selectedAccounts !== "object") {
    outro("No Accounts selected");
    return;
  }

  const shouldContinue = await confirm({
    message: "Are you sure you want to delete the accounts",
  });

  if (typeof shouldContinue === "symbol" || !shouldContinue) {
    console.info("Exiting without making any changes to accounts");
    return;
  }

  const deletePromises = selectedAccounts.map(async (accountId) => {
    const factors = await userManagement.listAuthenticationFactors({ userId: accountId });

    await Promise.all(
      factors.result.map(async (factor) => {
        switch (factor.type.case) {
          case "otp":
            return userManagement.removeTOTP({ userId: accountId });

          case "u2f":
            return userManagement.removeU2F({ userId: accountId, u2fId: factor.type.value.id });
        }
      })
    );
    return userManagement.deactivateUser({ userId: accountId });
  });
  await Promise.all(deletePromises);
  outro("Selected Accounts marked as inactive and MFA deleted");
};

manage();
