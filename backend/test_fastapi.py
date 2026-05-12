from fastapi.testclient import TestClient
from main import app
import sys

client = TestClient(app)

response = client.post(
    "/api/auth/register",
    json={"email": "sitki1903@hotmail.com", "password": "password123"}
)

print(response.status_code)
print(response.text)
