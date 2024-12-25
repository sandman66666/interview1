import { Button } from "~/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";

export default function CompletionPage() {
  const navigate = useNavigate();

  // Prevent direct access to completion page
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 10000); // Redirect after 10 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Interview Completed!</h1>
          <p className="text-slate-400">
            Thank you for completing the interview. Your responses have been
            recorded successfully.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-slate-300">
            You will be redirected to the home page in a few seconds.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}