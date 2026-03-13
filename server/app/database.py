import sqlite3

import pandas as pd


def store_to_sqlite(df: pd.DataFrame, table_name: str = "data", db_path: str = "/tmp/argo_data.db"):
    """Stores DataFrame into a specific SQLite table."""
    conn = sqlite3.connect(db_path)
    # Use the provided table_name argument
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    conn.close()
    print(f"Data stored in SQLite table '{table_name}' at {db_path}.")


def execute_sql_query(sql_query: str, db_path: str = "/tmp/argo_data.db"):
    """Executes a SQL query against the SQLite database."""
    conn = sqlite3.connect(db_path)
    try:
        df = pd.read_sql_query(sql_query, conn)
        return df
    except Exception as e:
        print(f"SQL Execution Error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()
