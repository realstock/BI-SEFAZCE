import { 
  StartQueryExecutionCommand, 
  GetQueryExecutionCommand, 
  GetQueryResultsCommand,
  QueryExecutionState
} from "@aws-sdk/client-athena";
import { athenaClient } from "@/lib/athena";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { sql, database, filters } = await request.json();

    if (!sql) {
      return NextResponse.json({ error: "Missing SQL query" }, { status: 400 });
    }

    const db = database || process.env.ATHENA_DATABASE || "default";
    const workgroup = process.env.ATHENA_WORKGROUP;

    // Build the final SQL with filters if applicable
    let finalSql = sql;
    
    // Simple dynamic filter embedding
    if (filters && Object.keys(filters).length > 0) {
      const filterClauses = Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
        .map(([column, value]) => {
          if (Array.isArray(value)) {
            if (value.length === 0) return null;
            const values = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(", ");
            return `"${column}" IN (${values})`;
          }
          return `"${column}" = '${String(value).replace(/'/g, "''")}'`;
        })
        .filter(c => c !== null);

      if (filterClauses.length > 0) {
        const whereClause = filterClauses.join(" AND ");
        // If the query already has a WHERE, append with AND, else add WHERE
        if (finalSql.toUpperCase().includes("WHERE")) {
          // This is a naive implementation, assuming the WHERE is at the end or before LIMIT
          if (finalSql.toUpperCase().includes("LIMIT")) {
            finalSql = finalSql.replace(/LIMIT/i, `AND ${whereClause} LIMIT`);
          } else {
            finalSql += ` AND ${whereClause}`;
          }
        } else {
          if (finalSql.toUpperCase().includes("LIMIT")) {
            finalSql = finalSql.replace(/LIMIT/i, `WHERE ${whereClause} LIMIT`);
          } else {
            finalSql += ` WHERE ${whereClause}`;
          }
        }
      }
    }

    console.log("Executing SQL:", finalSql);

    // 1. Start execution
    const startCommand = new StartQueryExecutionCommand({
      QueryString: finalSql,
      QueryExecutionContext: { Database: db },
      WorkGroup: workgroup,
    });

    const { QueryExecutionId } = await athenaClient.send(startCommand);

    if (!QueryExecutionId) {
      throw new Error("Failed to start query execution");
    }

    // 2. Poll for completion
    let status: QueryExecutionState | string | undefined = QueryExecutionState.RUNNING;
    let attempts = 0;
    const maxAttempts = 30;

    while (
      (status === QueryExecutionState.RUNNING || status === QueryExecutionState.QUEUED) && 
      attempts < maxAttempts
    ) {
      const getCommand = new GetQueryExecutionCommand({ QueryExecutionId });
      const { QueryExecution } = await athenaClient.send(getCommand);
      status = QueryExecution?.Status?.State as QueryExecutionState;

      if (status === QueryExecutionState.SUCCEEDED) break;
      if (status === QueryExecutionState.FAILED || status === QueryExecutionState.CANCELLED) {
        throw new Error(`Query ${status}: ${QueryExecution?.Status?.StateChangeReason}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= maxAttempts) {
      throw new Error("Query timed out");
    }

    // 3. Get results
    const resultsCommand = new GetQueryResultsCommand({ QueryExecutionId });
    const results = await athenaClient.send(resultsCommand);

    const rows = results.ResultSet?.Rows || [];
    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const headers = rows[0].Data?.map(d => d.VarCharValue) || [];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      row.Data?.forEach((cell, i) => {
        obj[headers[i] || `col${i}`] = cell.VarCharValue;
      });
      return obj;
    });

    return NextResponse.json({ data, queryId: QueryExecutionId });

  } catch (error: any) {
    console.error("Athena Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
