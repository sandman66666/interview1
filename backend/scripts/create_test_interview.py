#!/usr/bin/env python3
import requests
import json
import sys

def create_interview():
    # Test questions for the interview
    questions = [
        {
            "text": "Tell me about your background and experience.",
            "voice_id": "en-US-JennyNeural",
            "voice_style": "Cheerful"
        },
        {
            "text": "What interests you most about this position?",
            "voice_id": "en-US-JennyNeural",
            "voice_style": "Cheerful"
        },
        {
            "text": "Can you describe a challenging project you've worked on?",
            "voice_id": "en-US-JennyNeural",
            "voice_style": "Cheerful"
        }
    ]

    try:
        # Create the interview
        response = requests.post(
            "http://127.0.0.1:8001/api/v1/interviews/",
            json=questions,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

        response.raise_for_status()  # Raise an exception for bad status codes
        
        interview = response.json()
        print("\nInterview created successfully!")
        print(f"\nInterview ID: {interview['id']}")
        print(f"\nToken: {interview['url_id']}")
        print(f"\nAccess URL: http://localhost:5173/interview/{interview['url_id']}")
        print("\nQuestions:")
        for q in interview['questions']:
            print(f"- {q['text']}")
            
    except requests.exceptions.RequestException as e:
        print(f"\nError creating interview: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status code: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        sys.exit(1)

if __name__ == "__main__":
    create_interview()