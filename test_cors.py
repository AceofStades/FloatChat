import requests

url = "https://w5s8ggat48.execute-api.ap-south-1.amazonaws.com/prod/upload-data"
file_path = "server/temp_cvl.area-subset.31.5.81.1.28.7.77.5.nc"

with open(file_path, "rb") as f:
    files = {"file": f}
    data = {"user_id": "anonymous", "session_id": "1234"}
    
    # Simulate a browser OPTIONS request first
    options_resp = requests.options(url, headers={
        "Origin": "http://floatchat-frontend.s3-website.ap-south-1.amazonaws.com",
        "Access-Control-Request-Method": "POST",
    })
    print(f"OPTIONS Status: {options_resp.status_code}")
    print(f"OPTIONS Headers: {options_resp.headers}")

    # Now simulate the actual POST request from the browser
    headers = {"Origin": "http://floatchat-frontend.s3-website.ap-south-1.amazonaws.com"}
    post_resp = requests.post(url, files=files, data=data, headers=headers)
    print(f"POST Status: {post_resp.status_code}")
    print(f"POST Headers: {post_resp.headers}")
    print(f"POST Body: {post_resp.text}")
