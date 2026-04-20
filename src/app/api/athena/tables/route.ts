import { 
  ListTableMetadataCommand 
} from "@aws-sdk/client-athena";
import { athenaClient } from "@/lib/athena";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const database = searchParams.get("database") || process.env.ATHENA_DATABASE || "default";

    const command = new ListTableMetadataCommand({
      CatalogName: "AwsDataCatalog",
      DatabaseName: database,
    });

    const response = await athenaClient.send(command);
    const tables = response.TableMetadataList?.map(table => ({
      name: table.Name,
      type: table.TableType,
      createdAt: table.CreateTime,
    })) || [];

    return NextResponse.json({ tables });

  } catch (error: any) {
    console.error("Athena List Tables Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
