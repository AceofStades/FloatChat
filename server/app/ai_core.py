import json

import faiss
import numpy as np
import requests


# --- Helper functions (Unchanged) ---
def get_ollama_embedding(text: str) -> np.ndarray:
    try:
        response = requests.post(
            "http://15.207.52.175:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=30,
        )
        response.raise_for_status()
        embedding = response.json().get("embedding")
        return np.array([embedding], dtype="float32")
    except requests.RequestException as e:
        print(f"Error getting Ollama embedding: {e}")
        return np.zeros((1, 768), dtype="float32")


def _call_ollama_generate(
    prompt, system_message, format="", stream=False, model="glm-5:cloud"
):
    try:
        response = requests.post(
            "http://15.207.52.175:11434/api/generate",
            json={
                "model": model,
                "system": system_message,
                "prompt": prompt,
                "format": format,
                "stream": stream,
            },
            stream=stream,
            timeout=300,
        )
        response.raise_for_status()

        if stream:

            def generate_stream():
                for line in response.iter_lines():
                    if line:
                        yield line.decode("utf-8") + "\n"

            return generate_stream()
        else:
            return response.json().get("response", "").strip()
    except requests.RequestException as e:
        print(f"Error calling Ollama generate: {e}")
        error_message = (
            "Error: Could not connect to the AI model. Ensure Ollama is running."
        )
        if stream:

            def error_stream():
                yield json.dumps({"error": error_message}) + "\n"

            return error_stream()
        return f'{{"error": "{error_message}"}}' if format == "json" else error_message


# --- VectorDB (Unchanged) ---
class VectorDB:
    def __init__(self, embedding_dim=768):
        self.embedding_dim = embedding_dim
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.metadata = []

    def add_metadata(self, text, source):
        self.index.reset()
        self.metadata.clear()
        embedding = get_ollama_embedding(text)
        self.index.add(embedding)
        self.metadata.append({"text": text, "source": source})

    def retrieve_context(self, query, k=1):
        if self.index.ntotal == 0:
            return "No metadata available."
        query_embedding = get_ollama_embedding(query)
        _, I = self.index.search(query_embedding, k)
        return "\n---\n".join([self.metadata[idx]["text"] for idx in I[0] if idx != -1])


# --- AI Functions for Conversation (classify_intent and generate_chitchat_response are unchanged) ---
def classify_intent(user_query: str) -> dict:
    system_message = """Your job is to classify the user's intent into one of three categories and respond with a JSON object.
1. 'chitchat': For greetings, pleasantries, or questions not related to the data.
2. 'metadata_query': If the user is asking about the dataset's structure, like column names, variables, or what kind of data is available.
3. 'data_query': If the user is asking a specific question that requires querying the data values, like finding a maximum, minimum, average, or filtering for specific conditions. If the user asks to plot, chart, or graph the data, classify it as a data_query.

Example 1: User says "hi how are you" -> {"intent": "chitchat"}
Example 2: User says "what are the columns in this file?" -> {"intent": "metadata_query"}
Example 3: User says "show me the highest temperature" -> {"intent": "data_query"}
Example 4: User says "plot a graph of the temperature" -> {"intent": "data_query"}"""
    response_str = _call_ollama_generate(
        user_query,
        system_message,
        format="json",
        model="glm-5:cloud",
    )
    try:
        return json.loads(response_str)
    except json.JSONDecodeError:
        return {"intent": "chitchat"}


def generate_chitchat_response(
    user_query: str, data_loaded: bool = False, columns: list = None
) -> str:
    data_context = (
        f"A NetCDF file IS currently loaded with columns: {columns}."
        if data_loaded
        else "NO data file is currently loaded."
    )
    system_message = (
        "You are FloatChat, an AI assistant built to help marine biologists and researchers analyze oceanographic data (specifically NetCDF files from Argo floats). "
        "The user is talking to you. Keep your answers concise, friendly, and professional. "
        "Do not overthink or over-explain simple greetings or pleasantries. "
        f"IMPORTANT SYSTEM STATE: {data_context} If the user asks to plot or analyze data, but their request is too vague, nicely ask them to specify which columns they want to look at."
    )
    return _call_ollama_generate(user_query, system_message, stream=False)


# --- MODIFIED: llm_nlp_to_sql now has a much more advanced prompt ---
def llm_nlp_to_sql(user_query: str, db_schema_and_sample: str) -> str:
    """Uses the AI to convert a data query into SQL, now with advanced capabilities."""
    system_message = f"""You are a world-class SQLite expert. Your job is to convert a user's question into a single, precise SQLite query.
- Use aggregate functions like MIN(), MAX(), AVG(), SUM(), and COUNT() when asked for ranges, averages, totals, or counts.
- Use GROUP BY to categorize results.
- Use ORDER BY to sort results.
- The table is always named `data`.
- Respond ONLY with the SQLite query, ending in a semicolon. Do not add any explanation.

--- DATABASE CONTEXT ---
{db_schema_and_sample}
--- END CONTEXT ---

--- EXAMPLES ---
User Question: "what is the range of the t2m column?"
SQL Query: SELECT MIN(t2m), MAX(t2m) FROM data;

User Question: "what is the average latitude?"
SQL Query: SELECT AVG(latitude) FROM data;

User Question: "count how many entries there are for each 'number' and show the top 5"
SQL Query: SELECT number, COUNT(*) FROM data GROUP BY number ORDER BY COUNT(*) DESC LIMIT 5;

User Question: "plot a graph of the data"
SQL Query: SELECT * FROM data LIMIT 1000;
--- END EXAMPLES ---
"""
    sql_query = _call_ollama_generate(user_query, system_message)
    if not sql_query.lower().startswith("select") or not sql_query.endswith(";"):
        return "SELECT 'Error: AI failed to generate a valid SQL query. Please rephrase your question.';"
    return sql_query
