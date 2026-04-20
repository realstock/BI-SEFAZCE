import { 
  ListDatabasesCommand,
  ListTableMetadataCommand
} from "@aws-sdk/client-athena";
import { athenaClient } from "@/lib/athena";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tableName = process.env.ATHENA_TABLE || "combustivel";
    const catalog = "AwsDataCatalog";

    // 1. Get all databases
    const listDbs = new ListDatabasesCommand({ CatalogName: catalog });
    const { DatabaseList } = await athenaClient.send(listDbs);
    const databases = DatabaseList?.map(db => db.Name).filter(Boolean) as string[] || [];

    console.log(`Searching for table "${tableName}" across ${databases.length} databases...`);

    // 2. Scan each database (parallel but with some limit or just sequential for safety)
    for (const db of databases) {
      try {
        const listTables = new ListTableMetadataCommand({
          CatalogName: catalog,
          DatabaseName: db,
          MaxResults: 50 // Check the first 50 tables
        });
        const { TableMetadataList } = await athenaClient.send(listTables);
        
        const found = TableMetadataList?.find(t => t.Name?.toLowerCase() === tableName.toLowerCase());
        if (found) {
          console.log(`Found table "${tableName}" in database "${db}"`);
          return NextResponse.json({ database: db, found: true });
        }
      } catch (e) {
        // Skip databases we can't access
        continue;
      }
    }

    return NextResponse.json({ error: "Table not found in any database", found: false }, { status: 404 });

  } catch (error: any) {
    console.error("Discovery Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
