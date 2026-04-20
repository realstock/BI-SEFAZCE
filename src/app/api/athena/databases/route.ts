import { 
  ListDatabasesCommand 
} from "@aws-sdk/client-athena";
import { athenaClient } from "@/lib/athena";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const command = new ListDatabasesCommand({
      CatalogName: "AwsDataCatalog",
    });

    const response = await athenaClient.send(command);
    const databases = response.DatabaseList?.map(db => ({
      name: db.Name,
      description: db.Description,
    })) || [];

    return NextResponse.json({ databases });

  } catch (error: any) {
    console.error("Athena List Databases Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
