import os

import pandas as pd
import xarray as xr
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from app.ai_core import (
    VectorDB,
    classify_intent,
    generate_chitchat_response,
    llm_nlp_to_sql,
)
from app.aws_services import (
    boto3,
    chat_table,
    download_file_from_s3,
    get_session_data,
    save_chat_message,
    save_session_data,
    upload_file_to_s3,
)
from app.database import execute_sql_query, store_to_sqlite
from app.processing import get_schema_from_dataframe, nc_to_dataframe
from app.visualizations import generate_chart_html, map_html

# --- Application Setup ---
app = FastAPI(title="FloatChat Conversational AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vector_store = VectorDB()


@app.get("/")
@app.get("/default/")
def root():
    return {"message": "FloatChat API is running and ready."}


@app.post("/upload-data")
@app.post("/default/upload-data")
async def upload_data(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
    session_id: str = Form("default"),
):
    try:
        temp_file_path = f"/tmp/temp_{session_id}_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())

        ds = xr.open_dataset(temp_file_path)
        df = nc_to_dataframe(ds)
        if df.empty:
            raise ValueError(
                "Processed DataFrame is empty or contains only NaN values."
            )

        db_path = f"/tmp/{session_id}.db"
        store_to_sqlite(df, table_name="data", db_path=db_path)

        current_column_names = df.columns.tolist()
        schema = get_schema_from_dataframe(df)
        sample_data = df.head(3).to_string()

        # Save to S3
        upload_file_to_s3(temp_file_path, f"{user_id}/{session_id}/{file.filename}")
        upload_file_to_s3(db_path, f"{user_id}/{session_id}.db")

        # Save to DynamoDB
        save_session_data(
            user_id, session_id, current_column_names, schema, sample_data
        )

        # Clean up tmp NetCDF
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        return {
            "message": f"Success! Data from '{file.filename}' processed. The columns are: {', '.join(current_column_names)}."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/chatbot-response")
@app.post("/default/chatbot-response")
async def chatbot_response(
    query: str = Form(...),
    user_id: str = Form("anonymous"),
    session_id: str = Form("default"),
):
    intent_result = classify_intent(query)
    intent = intent_result.get("intent", "chitchat")

    session_data = get_session_data(user_id, session_id)
    data_loaded = session_data is not None
    current_column_names = session_data.get("columns", []) if data_loaded else []

    response_message = ""
    html_content = None

    if not data_loaded and intent in ["metadata_query", "data_query"]:
        print(f"🔍 Intent: {intent} (But no data loaded)")
        prompt = f"The user asked: '{query}'. However, no NetCDF data file is uploaded yet. Friendly and nicely explain that you need them to upload a data file first so you can help them with this specific question. Do not answer their data question, just ask for the file."
        response_message = generate_chitchat_response(
            prompt, data_loaded=False, columns=[]
        )

    elif intent == "metadata_query":
        print(f"🔍 Intent: Metadata Query")
        if current_column_names:
            response_message = f"The dataset contains the following variables: {', '.join(current_column_names)}."
        else:
            response_message = "I can see the data is loaded, but I'm having trouble reading the specific variable names."

    elif intent == "data_query":
        print(f"🔍 Intent: Data Query")
        db_path = f"/tmp/{session_id}.db"
        if not os.path.exists(db_path):
            success = download_file_from_s3(f"{user_id}/{session_id}.db", db_path)
            if not success:
                response_message = "I lost track of the database file for this session. Please re-upload your data file."

        if not response_message:
            schema = session_data.get("schema", "")
            sample_data = session_data.get("sample_data", "")
            current_data_context = f"Table Name: data\n\nSchema:\n{schema}\n\nData Sample (first 3 rows):\n{sample_data}"

            sql_query = llm_nlp_to_sql(query, current_data_context)
            df_results = execute_sql_query(sql_query, db_path=db_path)

            if df_results.empty:
                response_message = "I found no data for that query."
            elif "map" in query.lower() or "location" in query.lower():
                try:
                    html_content = map_html(df_results)
                except Exception as e:
                    response_message = f"Could not generate a map. Error: {e}"
            elif (
                "graph" in query.lower()
                or "chart" in query.lower()
                or "plot" in query.lower()
            ):
                try:
                    html_content = generate_chart_html(df_results)
                except Exception as e:
                    response_message = f"Could not generate a chart. Error: {e}"
            else:
                response_message = f"Query processed successfully. Found {len(df_results)} records. Preview: {df_results.head(5).to_dict(orient='records')}"

    else:
        print(f"Intent: Chitchat")
        response_message = generate_chitchat_response(
            query, data_loaded=data_loaded, columns=current_column_names
        )

    # Save to chat history
    save_chat_message(user_id, session_id, "user", query)
    save_chat_message(
        user_id,
        session_id,
        "assistant",
        response_message if response_message else "Generated interactive content",
    )

    if html_content:
        return HTMLResponse(content=html_content, media_type="text/html")

    return JSONResponse(content={"message": response_message})


@app.get("/chat-history/{user_id}/{session_id}")
@app.get("/default/chat-history/{user_id}/{session_id}")
def get_history(user_id: str, session_id: str):
    from boto3.dynamodb.conditions import Key

    try:
        response = chat_table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
            FilterExpression=boto3.dynamodb.conditions.Attr("sessionId").eq(session_id),
        )
        items = response.get("Items", [])
        items = sorted(items, key=lambda x: x["timestamp"])
        return JSONResponse(content={"history": items})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
