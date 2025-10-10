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
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();

      // Fetch candidate counts for each job
      const jobsWithCounts = await Promise.all(
        data.map(async (job) => {
          try {
            const screeningsRes = await fetch(
              `${API_BASE_URL}/jobs/${job.id}/screenings/`
            );
            const screenings = await screeningsRes.json();
            return { ...job, candidate_count: screenings.length };
          } catch {
            return { ...job, candidate_count: 0 };
          }
        })
      );

      setJobs(jobsWithCounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
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
          <p className="text-gray-500 text-lg mb-4">No jobs screened yet</p>
          <Link to="/upload" className="text-blue-600 hover:underline">
            Upload your first job description and resumes
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
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {job.title}
                  </h2>
                  <p className="text-gray-600">
                    {job.candidate_count} candidate
                    {job.candidate_count !== 1 ? "s" : ""} screened
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(job.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
