import { ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { Button } from '../../components/ui/button';
import axios from 'axios';
import { API_BASE_URL, axiosConfig } from '../../config/api';

export async function action({ request }: ActionFunctionArgs) {
  const questions = [
    { 
      text: "Tell me about your background and experience.",
      avatar_video_status: "pending",
      avatar_video_url: null,
      avatar_video_id: null,
      order_number: 1
    },
    { 
      text: "What are your greatest strengths and how do they align with this role?",
      avatar_video_status: "pending",
      avatar_video_url: null,
      avatar_video_id: null,
      order_number: 2
    },
    { 
      text: "Can you describe a challenging situation you faced at work and how you handled it?",
      avatar_video_status: "pending",
      avatar_video_url: null,
      avatar_video_id: null,
      order_number: 3
    }
  ];

  try {
    const response = await axios.post(
      `${API_BASE_URL}/interviews`,
      { questions },
      axiosConfig
    );

    return redirect(`/interview/${response.data.url_id}`);
  } catch (error) {
    console.error('Error creating interview:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
    }
    return json({ error: 'Failed to create interview' }, { status: 500 });
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