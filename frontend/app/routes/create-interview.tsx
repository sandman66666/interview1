import { ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { Button } from '~/components/ui/button';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, axiosConfig } from '~/config';

interface Question {
  text: string;
  voice_id: string;
}

interface InterviewResponse {
  url_id: string;
  id: string;
  status: string;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const questions: Question[] = [
    { 
      text: "Tell me about your background and experience.",
      voice_id: "en-US-JennyNeural"
    },
    { 
      text: "What are your greatest strengths and how do they align with this role?",
      voice_id: "en-US-JennyNeural"
    },
    { 
      text: "Can you describe a challenging situation you faced at work and how you handled it?",
      voice_id: "en-US-JennyNeural"
    }
  ];

  try {
    console.log('Making request to:', `${API_BASE_URL}/interviews`);
    console.log('Request payload:', { questions });
    
    const response = await axios.post<InterviewResponse>(
      `${API_BASE_URL}/interviews`,
      { questions },
      axiosConfig
    );

    console.log('Response:', response.data);

    if (!response.data) {
      throw new Error('No response data received');
    }

    // Check if we have a token in the URL
    if (response.data.url_id && response.data.url_id.includes('/interview/')) {
      const token = response.data.url_id.split('/interview/')[1];
      return redirect(`/interview/${token}`);
    }

    // If we have just the token
    if (response.data.url_id) {
      return redirect(`/interview/${response.data.url_id}`);
    }

    throw new Error('Invalid response format: no URL or token found');
  } catch (error) {
    console.error('Error creating interview:', error);
    
    if (error instanceof AxiosError) {
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      return json({ 
        error: 'Failed to create interview',
        details: error.response?.data 
      }, { 
        status: error.response?.status || 500 
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return json({ 
      error: 'Failed to create interview',
      details: errorMessage 
    }, { 
      status: 500 
    });
  }
}

export default function CreateInterview() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-200 mb-8">
          Create New Interview
        </h1>
        <Form method="post">
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
            Start New Interview
          </Button>
        </Form>
      </div>
    </div>
  );
}