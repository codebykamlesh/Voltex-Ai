import asyncio
from groq import AsyncGroq

async def test():
    client = AsyncGroq(api_key='YOUR_API_KEY_HERE')
    res = await client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{'role': 'user', 'content': 'hello'}, {'role': 'user', 'content': 'hi'}],
        max_tokens=10
    )
    print("Success")

if __name__ == "__main__":
    asyncio.run(test())
