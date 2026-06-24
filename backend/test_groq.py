import asyncio
from groq import AsyncGroq
import os

async def main():
    try:
        client = AsyncGroq(api_key='YOUR_API_KEY_HERE')
        response = await client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': 'hi'}],
            max_tokens=4096
        )
        print(response)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
