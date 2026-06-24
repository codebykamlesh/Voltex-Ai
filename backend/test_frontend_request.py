import asyncio
import httpx
import json

async def test_stream():
    url = "http://localhost:8000/api/chat"
    
    import base64
    header = base64.urlsafe_b64encode(b'{"alg":"none"}').decode('utf-8').rstrip("=")
    payload = base64.urlsafe_b64encode(b'{"uid":"test-user-123", "email":"test@test.com"}').decode('utf-8').rstrip("=")
    token = f"{header}.{payload}."
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    body = {
        "conversation_id": "26740a37-5225-4a4b-bbd5-7d37f7a6730c",
        "message": "hi",
        "model": "llama-3.3-70b-versatile"
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=body, headers=headers) as response:
            print("Status:", response.status_code)
            if response.status_code != 200:
                print("Error:", await response.aread())
                return
            async for line in response.aiter_lines():
                print(line)

if __name__ == "__main__":
    asyncio.run(test_stream())
