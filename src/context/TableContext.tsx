"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface TableContextType {
  selectedDatabase: string;
  setSelectedDatabase: (db: string) => void;
  availableDatabases: any[];
  isLoadingDatabases: boolean;
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  availableTables: any[];
  isLoadingTables: boolean;
  discoverDatabase: () => Promise<void>;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export function TableProvider({ children }: { children: React.ReactNode }) {
  const [selectedDatabase, setSelectedDatabase] = useState<string>("default");
  const [availableDatabases, setAvailableDatabases] = useState<any[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState<boolean>(true);

  const [selectedTable] = useState<string>("combustivel");
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);

  // Initialize and Fetch Databases
  useEffect(() => {
    const savedDb = localStorage.getItem("athena_selected_database");
    if (savedDb) {
      setSelectedDatabase(savedDb);
    }

    const fetchDatabases = async () => {
      setIsLoadingDatabases(true);
      try {
        const response = await fetch("/api/athena/databases");
        const data = await response.json();
        if (data.databases) {
          setAvailableDatabases(data.databases);
        }
      } catch (error) {
        console.error("Failed to fetch databases:", error);
      } finally {
        setIsLoadingDatabases(false);
      }
    };

    fetchDatabases();
    discoverDatabase(); // Auto-discover on load
  }, []);

  const discoverDatabase = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch("/api/athena/discover");
      const data = await response.json();
      if (data.database) {
        setSelectedDatabase(data.database);
        localStorage.setItem("athena_selected_database", data.database);
        return data.database;
      }
    } catch (error) {
      console.error("Discovery failed:", error);
    } finally {
      setIsLoadingTables(false);
    }
    return null;
  };

  // Fetch Tables when Database changes
  useEffect(() => {
    const fetchTables = async () => {
      if (!selectedDatabase) return;
      setIsLoadingTables(true);
      try {
        const response = await fetch(`/api/athena/tables?database=${selectedDatabase}`);
        // Note: Update the API route to accept database query param if needed
        const data = await response.json();
        if (data.tables) {
          setAvailableTables(data.tables);
          // If current selected table is NOT in the new database's list, 
          // we don't necessarily reset, but we alert the user via UI
        }
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchTables();
  }, [selectedDatabase]);

  const handleSetSelectedDatabase = (db: string) => {
    setSelectedDatabase(db);
    localStorage.setItem("athena_selected_database", db);
  };

  const handleSetSelectedTable = (table: string) => {
    // Disabled dynamic selection
  };

  return (
    <TableContext.Provider 
      value={{ 
        selectedDatabase,
        setSelectedDatabase: handleSetSelectedDatabase,
        availableDatabases,
        isLoadingDatabases,
        selectedTable, 
        setSelectedTable: handleSetSelectedTable, 
        availableTables, 
        isLoadingTables,
        discoverDatabase
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
}
