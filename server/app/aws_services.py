import json
import os
from datetime import datetime

import boto3

REGION = os.getenv("AWS_REGION", "ap-south-1")
BUCKET_NAME = "floatchat-user-data-328879699877"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)

chat_table = dynamodb.Table("ChatHistory")
sessions_table = dynamodb.Table("Sessions")


def save_chat_message(user_id: str, session_id: str, role: str, content: str):
    timestamp = datetime.utcnow().isoformat()
    try:
        chat_table.put_item(
            Item={
                "userId": user_id,
                "timestamp": timestamp,
                "sessionId": session_id,
                "role": role,
                "content": content,
            }
        )
    except Exception as e:
        print(f"DynamoDB Error (save_chat_message): {e}")


def save_session_data(
    user_id: str,
    session_id: str,
    columns: list,
    schema: str,
    sample_data: str,
    filename: str = "",
):
    try:
        sessions_table.put_item(
            Item={
                "userId": user_id,
                "sessionId": session_id,
                "columns": json.dumps(columns),
                "schema": schema,
                "sample_data": sample_data,
                "filename": filename,
                "updatedAt": datetime.utcnow().isoformat(),
            }
        )
    except Exception as e:
        print(f"DynamoDB Error (save_session_data): {e}")


def get_session_data(user_id: str, session_id: str):
    try:
        response = sessions_table.get_item(
            Key={"userId": user_id, "sessionId": session_id}
        )
        item = response.get("Item")
        if item:
            item["columns"] = json.loads(item.get("columns", "[]"))
        return item
    except Exception as e:
        print(f"DynamoDB Error (get_session_data): {e}")
        return None


def get_all_sessions(user_id: str):
    from boto3.dynamodb.conditions import Key

    try:
        response = sessions_table.query(
            KeyConditionExpression=Key("userId").eq(user_id)
        )
        items = response.get("Items", [])
        return items
    except Exception as e:
        print(f"DynamoDB Error (get_all_sessions): {e}")
        return []


def upload_file_to_s3(file_path: str, s3_key: str):
    try:
        s3.upload_file(file_path, BUCKET_NAME, s3_key)
        return True
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return False


def download_file_from_s3(s3_key: str, file_path: str):
    try:
        s3.download_file(BUCKET_NAME, s3_key, file_path)
        return True
    except Exception as e:
        print(f"S3 Download Error: {e}")
        return False
