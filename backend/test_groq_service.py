import asyncio
import sys

# Add backend dir to python path to import app modules
sys.path.append("c:\\Users\\Kamlesh\\VS CODE\\voltex-ai\\backend")

from app.services.groq_service import chat_completion_stream
from app.config import settings
settings.groq_api_key = 'YOUR_API_KEY_HERE'

async def main():
    messages = [{'role': 'user', 'content': 'hi'}]
    async for chunk in chat_completion_stream(messages, model='llama-3.3-70b-versatile', temperature=0.7, max_tokens=4096):
        print(chunk)

if __name__ == "__main__":
    asyncio.run(main())
