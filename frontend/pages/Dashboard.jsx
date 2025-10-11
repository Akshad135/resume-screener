import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);

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
      setJobs(data);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId, jobTitle, e) => {
    e.preventDefault();

    if (
      !confirm(
        `Are you sure you want to delete "${jobTitle}" and all its candidate screenings?`
      )
    ) {
      return;
    }

    setDeletingJobId(jobId);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      setJobs(jobs.filter((job) => job.id !== jobId));
    } catch (err) {
      alert(`Error deleting job: ${err.message}`);
    } finally {
      setDeletingJobId(null);
    }
  };

  const totalCandidates = jobs.reduce(
    (sum, job) => sum + job.candidate_count,
    0
  );
  const latestJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md text-center shadow-lg">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchJobs();
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Retry
            </button>
            <Link
              to="/upload"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Upload New Job
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Smart Resume Screener
              </h1>
              <p className="text-gray-600">
                AI-powered candidate screening and ranking
              </p>
            </div>
            <Link
              to="/upload"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center gap-2 shadow-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Screening
            </Link>
          </div>

          {jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {jobs.length}
                    </p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Total Candidates
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {totalCandidates}
                    </p>
                  </div>
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Latest Job</p>
                    <p
                      className="text-lg font-semibold text-gray-900 truncate"
                      title={latestJob?.title}
                    >
                      {latestJob?.title || "N/A"}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <svg
                      className="w-8 h-8 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow border border-gray-200">
            <div className="mb-6">
              <svg
                className="mx-auto h-20 w-20 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No jobs screened yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload a job description and resumes to get started
            </p>
            <Link
              to="/upload"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Upload Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 border border-gray-200 group"
              >
                <Link to={`/jobs/${job.id}`} className="block p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition">
                        {job.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>
                            {job.candidate_count} candidate
                            {job.candidate_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteJob(job.id, job.title, e);
                        }}
                        disabled={deletingJobId === job.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg disabled:bg-gray-400 shadow-md"
                        title="Delete job"
                      >
                        {deletingJobId === job.id ? (
                          <svg
                            className="w-5 h-5 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>

                      <svg
                        className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
