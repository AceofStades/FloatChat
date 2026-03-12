import pandas as pd
import xarray as xr
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from app.ai_core import (
    VectorDB,
    classify_intent,
    generate_chitchat_response,
    llm_nlp_to_sql,
)
from app.database import execute_sql_query, store_to_sqlite

# Import the new and updated functions
from app.processing import get_schema_from_dataframe, nc_to_dataframe
from app.visualizations import generate_chart_html, map_html

# --- Application Setup (Unchanged) ---
app = FastAPI(title="FloatChat Conversational AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global State ---
vector_store = VectorDB()
data_loaded = False
current_data_context = "No data loaded. Please upload a NetCDF file."
# --- NEW: A clean list to store column names ---
current_column_names = []


@app.get("/")
@app.get("/default/")
def root():
    return {"message": "FloatChat API is running and ready to connect to Ollama."}


@app.post("/upload-data")
@app.post("/default/upload-data")
async def upload_data(file: UploadFile = File(...)):
    global data_loaded, current_data_context, current_column_names
    try:
        temp_file_path = f"/tmp/temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
        ds = xr.open_dataset(temp_file_path)
        df = nc_to_dataframe(ds)
        if df.empty:
            raise ValueError(
                "Processed DataFrame is empty or contains only NaN values."
            )
        store_to_sqlite(df, table_name="data")

        # --- MODIFIED: Store the clean column list ---
        current_column_names = df.columns.tolist()

        schema = get_schema_from_dataframe(df)
        sample_data = df.head(3).to_string()
        current_data_context = f"Table Name: data\n\nSchema:\n{schema}\n\nData Sample (first 3 rows):\n{sample_data}"
        vector_store.add_metadata(
            f"The user has uploaded a file. The data table contains the columns: {', '.join(current_column_names)}",
            "DATASET_SUMMARY",
        )

        data_loaded = True
        return {
            "message": f"Success! Data from '{file.filename}' processed. The columns are: {', '.join(current_column_names)}."
        }
    except Exception as e:
        data_loaded = False
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/chatbot-response")
@app.post("/default/chatbot-response")
async def chatbot_response(query: str = Form(...)):
    intent_result = classify_intent(query)
    intent = intent_result.get("intent", "chitchat")

    if not data_loaded and intent in ["metadata_query", "data_query"]:
        print(f"🔍 Intent: {intent} (But no data loaded)")
        prompt = f"The user asked: '{query}'. However, no NetCDF data file is uploaded yet. Friendly and nicely explain that you need them to upload a data file first so you can help them with this specific question. Do not answer their data question, just ask for the file."
        chitchat_response = generate_chitchat_response(
            prompt, data_loaded=False, columns=[]
        )
        return JSONResponse(content={"message": chitchat_response})

    # --- MODIFIED: Simplified and corrected metadata logic ---
    if intent == "metadata_query":
        print(f"🔍 Intent: Metadata Query")
        if current_column_names:
            response_message = f"The dataset contains the following variables: {', '.join(current_column_names)}."
        else:
            response_message = "I can see the data is loaded, but I'm having trouble reading the specific variable names."
        return JSONResponse(content={"message": response_message})

    elif intent == "data_query":
        print(f"🔍 Intent: Data Query")
        sql_query = llm_nlp_to_sql(query, current_data_context)
        df_results = execute_sql_query(sql_query)

        if df_results.empty:
            return JSONResponse(content={"message": "I found no data for that query."})

        if "map" in query.lower() or "location" in query.lower():
            try:
                map_content = map_html(df_results)
                return HTMLResponse(content=map_content, media_type="text/html")
            except Exception as e:
                return JSONResponse(
                    content={
                        "message": f"Could not generate a map. The data might be missing latitude/longitude columns. Error: {e}"
                    }
                )
        elif (
            "graph" in query.lower()
            or "chart" in query.lower()
            or "plot" in query.lower()
        ):
            try:
                chart_content = generate_chart_html(df_results)
                return HTMLResponse(content=chart_content, media_type="text/html")
            except Exception as e:
                return JSONResponse(
                    content={"message": f"Could not generate a chart. Error: {e}"}
                )
        else:
            return JSONResponse(
                content={
                    "message": f"Query processed successfully. Found {len(df_results)} records.",
                    "sql_used": sql_query,
                    "preview": df_results.head(5).to_dict(orient="records"),
                }
            )
    else:  # Handles 'chitchat'
        print(f"Intent: Chitchat")
        chitchat_response = generate_chitchat_response(
            query, data_loaded=data_loaded, columns=current_column_names
        )
        return JSONResponse(content={"message": chitchat_response})

        # --- AWS Lambda Handler ---


from mangum import Mangum

handler = Mangum(
    app,
    api_gateway_base_path="/default",
    text_mime_types=[
        MIME_TYPE
        for MIME_TYPE in [
            "text/event-stream",
            "text/plain",
            "text/html",
            "application/json",
            "multipart/form-data",
            "application/x-www-form-urlencoded",
        ]
    ],
)
