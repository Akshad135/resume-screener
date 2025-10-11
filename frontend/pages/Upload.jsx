import { useState, useEffect } from "react";
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
  const [progressSteps, setProgressSteps] = useState([]);

  useEffect(() => {
    if (!loading) {
      setProgressSteps([]);
      return;
    }

    const steps = [
      { text: "Deconstructing job description...", delay: 300 },
      { text: "✓ Job description analyzed", delay: 1500 },
    ];
    formData.resumeFiles.forEach((file, idx) => {
      steps.push(
        { text: `Processing ${file.name}...`, delay: 2000 + idx * 5000 },
        { text: `  • Extracting text from PDF...`, delay: 2300 + idx * 5000 },
        { text: `  • Analyzing skills...`, delay: 2800 + idx * 5000 },
        { text: `  • Parsing experience data...`, delay: 3500 + idx * 5000 },
        { text: `  • Assessing resume quality...`, delay: 4200 + idx * 5000 },
        { text: `  • Calculating match score...`, delay: 4800 + idx * 5000 },
        { text: `✓ ${file.name} analyzed`, delay: 5500 + idx * 5000 }
      );
    });

    const timers = steps.map((step, index) => {
      return setTimeout(() => {
        setProgressSteps((prev) => [...prev, step.text]);
      }, step.delay);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [loading, formData.resumeFiles]);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2 transition"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            New Screening
          </h1>
          <p className="text-gray-600">
            Upload a job description and resumes to begin screening
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 border border-gray-200"
        >
          {/* Job Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) =>
                setFormData({ ...formData, jobTitle: e.target.value })
              }
              placeholder="e.g., Senior Software Engineer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              If left blank, it will be extracted from the JD
            </p>
          </div>

          {/* Job Description */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              disabled={loading}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Accepted formats: .pdf, .txt
            </p>
            {formData.jdFile && (
              <div className="mt-2 text-sm text-green-600">
                ✓ {formData.jdFile.name}
              </div>
            )}
          </div>

          {/* Resumes */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Accepted format: .pdf (You can select multiple files at once or
              add them one by one)
            </p>

            {formData.resumeFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {formData.resumeFiles.length} file
                  {formData.resumeFiles.length !== 1 ? "s" : ""} selected:
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {formData.resumeFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                    >
                      <span className="text-gray-700 truncate">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeResumeFile(index)}
                        className="text-red-600 hover:text-red-800 ml-2 font-medium"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {loading ? "Processing..." : "Start Screening"}
          </button>

          {/* Real-time Progress */}
          {loading && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-3">
                <svg
                  className="animate-spin h-6 w-6 text-indigo-600 flex-shrink-0"
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
                <h3 className="font-semibold text-gray-900">
                  Processing {formData.resumeFiles.length} Resume
                  {formData.resumeFiles.length !== 1 ? "s" : ""}...
                </h3>
              </div>

              {/* Only show last 2 progress steps */}
              <div className="bg-white rounded border border-gray-200 p-3">
                <div className="font-mono text-xs space-y-1">
                  {progressSteps.slice(-2).map((step, index) => {
                    const isNew = index === progressSteps.slice(-2).length - 1;
                    return (
                      <div
                        key={progressSteps.length - 2 + index}
                        className={`${
                          step.startsWith("✓")
                            ? "text-green-600 font-semibold"
                            : step.startsWith("  •")
                            ? "text-gray-600"
                            : "text-gray-900"
                        } ${
                          isNew ? "animate-fadeIn" : "opacity-70"
                        } transition-opacity duration-300`}
                      >
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
