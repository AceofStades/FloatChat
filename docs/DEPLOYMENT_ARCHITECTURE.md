# FloatChat AWS Deployment Architecture

This document outlines the complete, 8-service, decoupled architecture designed to host FloatChat entirely within the **AWS Free Tier**. 

By utilizing a serverless approach for the frontend and backend, and isolating the AI processing to a dedicated instance, this architecture ensures high performance, minimal costs, and enterprise-grade scalability.

## Architecture Overview

The system is broken down into four distinct phases of deployment:

1. **The AI Brain (EC2)**
2. **The Frontend (S3 + CloudFront)**
3. **The Serverless Backend (API Gateway + Lambda)**
4. **Data & Security (DynamoDB + Cognito)**

---

## 1. The AI Brain (Compute)
* **Service:** Amazon EC2 (`t2.micro`)
* **Role:** Dedicated AI microservice running Ollama.
* **Details:** 
  * Because local Large Language Models (LLMs) require significant RAM (often 4GB to 8GB+), standard Free Tier instances typically crash when running them. 
  * **The Solution:** We run Ollama on a `t2.micro` (1GB RAM) but use the `glm-5:cloud` model. This acts as a passthrough API proxy. Zero model weights are loaded into the EC2 instance's RAM, keeping the server completely stable while delivering lightning-fast, high-intelligence responses.
  * **Networking:** An **AWS Elastic IP** is attached to this instance so the backend always has a static, unchanging endpoint to communicate with (`http://<ELASTIC_IP>:11434/api/generate`).

## 2. The Frontend (Static Hosting & CDN)
* **Services:** Amazon S3 + Amazon CloudFront
* **Role:** Hosting the Next.js Single Page Application (SPA).
* **Details:**
  * **S3:** The Next.js application is compiled using `next build` (with `output: 'export'` configured). This turns the React application into plain, static HTML, CSS, and JS files, which are uploaded to an S3 bucket configured for "Static Website Hosting".
  * **CloudFront:** A global Content Delivery Network (CDN) sits in front of the S3 bucket. This provides two massive benefits:
    1. It caches the UI at Edge locations worldwide, ensuring instant load times for users everywhere.
    2. It provides enterprise-grade HTTPS/SSL encryption for the application out of the box.

## 3. The Serverless Backend (API & Compute)
* **Services:** AWS Lambda + Amazon API Gateway + Amazon CloudWatch
* **Role:** Handling business logic, routing, and database interactions.
* **Details:**
  * **AWS Lambda:** The Python FastAPI backend (`main.py`, `ai_core.py`, data processing scripts) is packaged and deployed as a Serverless function. 
    * *Why Lambda?* It scales to zero. You only consume compute time (and Free Tier credits) during the exact milliseconds it takes to process a chat message or upload a file. 
  * **API Gateway:** Acts as the public front-door for the Lambda function. The React frontend sends HTTP POST requests (like `/chatbot-response`) to the API Gateway endpoint, which instantly triggers the Lambda function.
  * **CloudWatch:** Automatically collects and centralizes all backend logs, `print()` statements, and Python traceback errors, making debugging straightforward without needing to SSH into servers.

## 4. Data & Security (State Management)
* **Services:** Amazon DynamoDB + Amazon Cognito
* **Role:** Persistent memory and user authentication.
* **Details:**
  * **DynamoDB:** A highly scalable NoSQL database. Instead of relying on local SQLite files (which get erased when Lambda functions spin down), chat history, uploaded file metadata, and schema information are stored here. This gives the AI persistent "memory" across sessions.
  * **Cognito:** Manages the user pools. It handles secure user registration, login, password recovery, and issues JWT tokens to ensure only authenticated users can trigger the API Gateway.

---

## Data Flow Diagram

1. **User interaction:** A user visits the FloatChat URL. The static assets are served instantly via **CloudFront** and **S3**.
2. **Action:** The user types a message or uploads a `.nc` file in the Next.js UI.
3. **Routing:** The Next.js app sends an HTTPS request to the **API Gateway**.
4. **Logic:** API Gateway triggers the **AWS Lambda** Python function.
5. **State Retrieval:** Lambda quickly queries **DynamoDB** to retrieve the user's previous chat history and uploaded file context.
6. **AI Processing:** Lambda constructs the prompt and sends an internal HTTP request to the **EC2 instance** running Ollama.
7. **Generation:** Ollama passes the request to the `glm-5:cloud` API, streams the response back to Lambda.
8. **Response:** Lambda streams the AI response back through API Gateway to the user's browser in real-time, while asynchronously saving the new message to DynamoDB.