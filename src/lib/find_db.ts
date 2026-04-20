import { 
  ListDatabasesCommand 
} from "@aws-sdk/client-athena";
import { athenaClient } from "./athena";

async function findDatabase() {
  try {
    const command = new ListDatabasesCommand({
      CatalogName: "AwsDataCatalog",
    });

    const response = await athenaClient.send(command);
    console.log("Databases found:");
    response.DatabaseList?.forEach(db => {
      console.log(`- ${db.Name}`);
    });
  } catch (error) {
    console.error("Error listing databases:", error);
  }
}

findDatabase();
