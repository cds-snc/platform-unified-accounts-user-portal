import "dotenv/config";

import { TextQueryMethod } from "@zitadel/proto/zitadel/object_pb";
import { styleText } from "node:util";

import { getServiceForHost } from "@lib/service";

import { getValue } from "../cli_utils";

const manage = async () => {
  const userManagement = await getServiceForHost("UserService");

  const devEmail = await getValue("What email address is your main account? \n");

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
      ],
    })
    .then((response) => {
      return response.result.map(({ userId, username }) => ({
        userId,
        username,
      }));
    });

  console.info("Do you want to delete the following accounts?");
  const accountsToDelete = userAccounts.filter((val) => val.username !== devEmail);
  accountsToDelete.forEach((account) => {
    console.info(styleText("bold", `username: ${account.username}`));
  });
  const confirmDelete = await getValue("(y / n): ").then((ans) => (ans === "y" ? true : false));

  if (!confirmDelete) {
    console.info("Exiting without making any changes to accounts");
    return;
  }

  const deletePromises = accountsToDelete.map(async (account) => {
    return userManagement.deleteUser({ userId: account.userId });
  });

  await Promise.all(deletePromises);

  console.info(styleText(["bold", "green"], "Accounts deleted"));
};

manage();
