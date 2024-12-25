import httpx
import asyncio
import json

async def test_did_api():
    url = "https://api.d-id.com/talks"
    headers = {
        "accept": "application/json",
        "authorization": "Basic VTJGdVpHMWhia0J6WlhOemFXOXVMVFF5TG1OdmJROnB3YldHeGtUZ3I0ZnppRlNqRk81OQ==",
        "content-type": "application/json"
    }
    
    payload = {
        "source_url": "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
        "script": {
            "type": "text",
            "subtitles": False,
            "provider": {
                "type": "microsoft",
                "voice_id": "en-US-JennyNeural"
            },
            "input": "Hello, this is a test message."
        },
        "config": {
            "fluent": False,
            "pad_audio": "0.0"
        }
    }
    
    print("Making request to D-ID API...")
    print(f"URL: {url}")
    print(f"Headers: {json.dumps(headers, indent=2)}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            print(f"\nResponse Status: {response.status_code}")
            print(f"Response Headers: {json.dumps(dict(response.headers), indent=2)}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 201:
                data = response.json()
                print(f"\nSuccess! Talk ID: {data.get('id')}")
                return data.get('id')
            else:
                print(f"\nError: {response.text}")
                return None
                
        except Exception as e:
            print(f"\nError making request: {str(e)}")
            return None

if __name__ == "__main__":
    asyncio.run(test_did_api())