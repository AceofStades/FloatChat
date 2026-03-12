import sqlite3

import pandas as pd

DB_PATH = "/tmp/argo_data.db"


def store_to_sqlite(df: pd.DataFrame, table_name: str = "data"):
    """Stores DataFrame into a specific SQLite table."""
    conn = sqlite3.connect(DB_PATH)
    # Use the provided table_name argument
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    conn.close()
    print(f"Data stored in SQLite table '{table_name}'.")


def execute_sql_query(sql_query: str):
    """Executes a SQL query against the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query(sql_query, conn)
        return df
    except Exception as e:
        print(f"SQL Execution Error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()
