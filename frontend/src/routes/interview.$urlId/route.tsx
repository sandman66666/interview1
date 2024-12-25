import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import axios from "axios";
import { API_BASE_URL, axiosConfig } from "../../config/api";
import { InterviewContainer } from "../../components/Interview/InterviewContainer";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export async function loader({ params }: LoaderFunctionArgs) {
  const { urlId } = params;
  
  if (!urlId) {
    throw new Response('Interview token is required', { status: 400 });
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/interviews/url/${urlId}`,
      axiosConfig
    );

    if (response.status === 404) {
      throw new Response('Interview not found', { 
        status: 404,
        statusText: 'Not Found'
      });
    }

    if (!response.data) {
      throw new Response('Invalid response from server', { status: 500 });
    }

    // Return the interview data with sorted questions
    return json({
      interview: {
        ...response.data,
        questions: response.data.questions?.sort((a: any, b: any) => a.order_number - b.order_number) || []
      }
    });
  } catch (error) {
    console.error('Error loading interview:', error);
    if (error instanceof Response) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
      if (error.response?.status === 404) {
        throw new Response('Interview not found', { 
          status: 404,
          statusText: 'Not Found'
        });
      }
    }
    throw new Response('Failed to load interview. Please try again later.', { 
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
}

export default function Interview() {
  const { interview } = useLoaderData<typeof loader>();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950">
        <InterviewContainer interview={interview} />
      </div>
    </QueryClientProvider>
  );
}

// Error boundary
export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          Something went wrong
        </h1>
        <p className="text-slate-400 mb-4">
          We couldn't load the interview. Please check the URL and try again.
        </p>
        <a 
          href="/"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}

// Loading state
export function HydrationBoundary() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">
        Loading interview...
      </div>
    </div>
  );
}