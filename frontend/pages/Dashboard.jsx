import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();

      // Fetch candidate counts for each job
      const jobsWithCounts = await Promise.all(
        data.map(async (job) => {
          try {
            const screeningsRes = await fetch(
              `${API_BASE_URL}/jobs/${job.id}/screenings/`
            );
            if (!screeningsRes.ok) {
              console.warn(`Failed to fetch screenings for job ${job.id}`);
              return { ...job, candidate_count: 0, has_error: true };
            }
            const screenings = await screeningsRes.json();
            return {
              ...job,
              candidate_count: screenings.length,
              has_error: false,
            };
          } catch (err) {
            console.warn(`Error fetching screenings for job ${job.id}:`, err);
            return { ...job, candidate_count: 0, has_error: true };
          }
        })
      );

      setJobs(jobsWithCounts);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl text-gray-600">Loading jobs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchJobs();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <Link
              to="/upload"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Upload New Job
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Smart Resume Screener
        </h1>
        <Link
          to="/upload"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          + New Screening
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-4">No jobs screened yet</p>
          <Link
            to="/upload"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Upload Your First Job
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {job.title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-600">
                      {job.candidate_count} candidate
                      {job.candidate_count !== 1 ? "s" : ""} screened
                    </p>
                    {job.has_error && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Data may be incomplete
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
