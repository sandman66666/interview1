import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { toast } from "sonner";
import { config } from "~/config";
import { QuestionForm } from "~/components/Interview/QuestionForm";
import { useState, useEffect } from "react";

interface Question {
  text: string;
  voice_id: string;
  voice_style: string;
  order_number: number;
}

interface ActionData {
  success?: boolean;
  data?: {
    id: string;
    url_id: string;
    [key: string]: any;
  };
  error?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const questionsJson = formData.get("questions") as string;
  
  if (!questionsJson) {
    return json<ActionData>(
      { error: "No questions provided" },
      { status: 400 }
    );
  }

  const questions = JSON.parse(questionsJson);
  const apiUrl = `${config.apiBaseUrl}${config.endpoints.interviews}`;
  console.log('Making API request to:', apiUrl);
  console.log('Request body:', JSON.stringify(questions, null, 2));
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(questions),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      console.error('API error:', data);
      return json<ActionData>(
        { error: data.detail || "Failed to create interview" },
        { status: response.status }
      );
    }

    // The backend returns a JWT token in the url_id
    if (data.url_id) {
      const token = data.url_id.split('/').pop();
      if (token) {
        return redirect(`/interview/${token}`);
      }
    }

    console.error('No token in response:', data);
    return json<ActionData>(
      { error: "Invalid response from server" },
      { status: 500 }
    );
  } catch (error) {
    console.error('Action error:', error);
    return json<ActionData>(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Interview Platform</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Interview</h2>
        <p className="text-gray-600 mb-6">
          Customize your interview questions below. You can add, remove, or modify questions as needed.
          Once you're ready, click "Create Interview" to generate a unique interview URL.
        </p>
      </div>

      <Form method="post" className="w-full max-w-4xl mx-auto">
        <input 
          type="hidden" 
          name="questions" 
          value={JSON.stringify(currentQuestions)}
        />
        <QuestionForm onQuestionsChange={setCurrentQuestions} />
      </Form>
      
      {actionData?.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{actionData.error}</p>
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-lg">Creating interview...</p>
          </div>
        </div>
      )}
    </div>
  );
}