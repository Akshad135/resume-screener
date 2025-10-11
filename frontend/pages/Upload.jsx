import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Upload() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    jobTitle: "",
    jdFile: null,
    resumeFiles: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.jdFile) {
      setError("Please upload a job description");
      setLoading(false);
      return;
    }
    if (formData.resumeFiles.length === 0) {
      setError("Please upload at least one resume");
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();

      if (formData.jobTitle) {
        data.append("job_title", formData.jobTitle);
      }

      data.append("jd_file", formData.jdFile);

      formData.resumeFiles.forEach((file) => {
        data.append("resume_files", file);
      });

      const response = await fetch(`${API_BASE_URL}/screen/`, {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const screenings = await response.json();

      if (screenings && screenings.length > 0) {
        navigate(`/jobs/${screenings[0].job_id}`);
      } else {
        throw new Error("No screenings were created");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeResumeFile = (indexToRemove) => {
    setFormData({
      ...formData,
      resumeFiles: formData.resumeFiles.filter(
        (_, index) => index !== indexToRemove
      ),
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Screening</h1>
        <p className="text-gray-600 mt-2">
          Upload a job description and resumes to begin screening
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title (Optional)
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) =>
              setFormData({ ...formData, jobTitle: e.target.value })
            }
            placeholder="e.g., Senior Software Engineer"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            If left blank, it will be extracted from the JD
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) =>
              setFormData({ ...formData, jdFile: e.target.files[0] })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={loading}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Accepted formats: .pdf, .txt
          </p>
          {formData.jdFile && (
            <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {formData.jdFile.name}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resumes <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => {
              const newFiles = Array.from(e.target.files);
              setFormData({
                ...formData,
                resumeFiles: [...formData.resumeFiles, ...newFiles],
              });
              e.target.value = "";
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Select multiple files at once or add them one by one
          </p>

          {formData.resumeFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {formData.resumeFiles.length} resume
                {formData.resumeFiles.length !== 1 ? "s" : ""} selected:
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {formData.resumeFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                  >
                    <span className="text-gray-700 truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeResumeFile(index)}
                      className="text-red-600 hover:text-red-800 ml-2 font-medium flex-shrink-0"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
        >
          {loading ? "Processing..." : "Start Screening"}
        </button>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">
              Analyzing {formData.resumeFiles.length} resume
              {formData.resumeFiles.length !== 1 ? "s" : ""}...
            </p>
            <p className="text-sm text-gray-500 mt-1">
              This may take a few minutes
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
