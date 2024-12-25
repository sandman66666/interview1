import { Button } from "~/components/ui/button";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import axios from "axios";
import { API_BASE_URL, axiosConfig } from "~/config";
import { json, type ActionFunctionArgs } from "@remix-run/node";

interface InterviewResponse {
  url_id: string;
  id: string;
  status: string;
}

interface SuccessResponse {
  token: string;
}

interface ErrorResponse {
  error: string;
}

type ActionData = SuccessResponse | ErrorResponse;

function isSuccessResponse(data: ActionData): data is SuccessResponse {
  return 'token' in data;
}

function isErrorResponse(data: ActionData): data is ErrorResponse {
  return 'error' in data;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Default questions for testing
    const questions = [
      {
        text: "Please introduce yourself and tell us about your background.",
        voice_id: "en-US-JennyNeural",
        voice_style: "Cheerful"
      },
      {
        text: "What interests you about this position?",
        voice_id: "en-US-JennyNeural",
        voice_style: "Cheerful"
      },
      {
        text: "Can you describe a challenging project you've worked on?",
        voice_id: "en-US-JennyNeural",
        voice_style: "Cheerful"
      }
    ];

    const response = await axios.post<InterviewResponse>(
      `${API_BASE_URL}/interviews/`,
      questions,
      axiosConfig
    );

    if (response.data && response.data.url_id) {
      return json<SuccessResponse>({ token: response.data.url_id });
    }

    throw new Error("Invalid response from server");
  } catch (error) {
    console.error("Error creating interview:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return json<ErrorResponse>(
      { error: "Failed to create interview. Please try again." },
      { status: 500 }
    );
  }
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // If we have a token, redirect to the interview
  if (actionData && isSuccessResponse(actionData)) {
    window.location.href = `/interview/${actionData.token}`;
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-4 text-slate-200">
          Interview Platform
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Start a new interview session with our AI-powered interviewer.
        </p>
        <Form method="post" className="flex flex-col items-center gap-4">
          {actionData && isErrorResponse(actionData) && (
            <div className="text-red-500 text-center mb-4">
              {actionData.error}
            </div>
          )}
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Interview..." : "Start New Interview"}
          </Button>
        </Form>
      </div>
    </div>
  );
}