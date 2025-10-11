import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Results() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [uploadingResumes, setUploadingResumes] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [deletingScreeningId, setDeletingScreeningId] = useState(null);

  useEffect(() => {
    fetchScreenings();
  }, [jobId]);

  const fetchScreenings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/screenings/`);
      if (!response.ok) throw new Error("Failed to fetch screenings");
      const data = await response.json();
      setScreenings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScreening = async (screeningId, candidateName, e) => {
    e.stopPropagation(); // Prevent opening modal

    if (
      !confirm(
        `Are you sure you want to remove "${candidateName}" from this job screening?`
      )
    ) {
      return;
    }

    setDeletingScreeningId(screeningId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/screenings/${screeningId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete screening");
      }

      // Refresh the screenings list
      await fetchScreenings();
    } catch (err) {
      alert(`Error deleting screening: ${err.message}`);
    } finally {
      setDeletingScreeningId(null);
    }
  };

  const handleAddResumes = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingResumes(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("resume_files", file);
      });

      const response = await fetch(
        `${API_BASE_URL}/jobs/${jobId}/add-candidates/`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add resumes");
      }

      await fetchScreenings();

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingResumes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading results...</div>
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

  const jobTitle =
    screenings.length > 0 ? screenings[0].job.title : "Job Results";

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Dashboard
        </button>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{jobTitle}</h1>
            <p className="text-gray-600 mt-2">
              {screenings.length} candidates ranked
            </p>
          </div>

          {/* Add Resume Button */}
          <div className="flex flex-col items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleAddResumes}
              className="hidden"
              disabled={uploadingResumes}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingResumes}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center gap-2"
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
              {uploadingResumes ? "Processing..." : "Add More Candidates"}
            </button>
            {uploadingResumes && (
              <p className="text-sm text-gray-600">Analyzing new resumes...</p>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {uploadError}
          </div>
        )}
      </div>

      {screenings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No candidates found for this job</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {screenings.map((screening, index) => {
            const summary =
              screening.skill_match_analysis?.executive_summary ||
              "Executive summary not available for this screening.";

            return (
              <div
                key={screening.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                        #{index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {screening.candidate.full_name || "Unknown Candidate"}
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-3">{summary}</p>
                    <button
                      onClick={() => setSelectedCandidate(screening)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View Detailed Analysis →
                    </button>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {parseFloat(screening.final_score).toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-500">Score</div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) =>
                        handleDeleteScreening(
                          screening.id,
                          screening.candidate.full_name,
                          e
                        )
                      }
                      disabled={deletingScreeningId === screening.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                      title="Remove candidate"
                    >
                      {deletingScreeningId === screening.id ? (
                        <svg
                          className="w-4 h-4 animate-spin"
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
                          className="w-4 h-4"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCandidate && (
        <AnalysisModal
          screening={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}

// AnalysisModal component
function AnalysisModal({ screening, onClose }) {
  const analysis = screening.skill_match_analysis?.skill_match_analysis || {};
  const mustHaveMatches = analysis.must_have_matches || [];
  const niceToHaveMatches = analysis.nice_to_have_matches || [];

  // Get proficiency label
  const getProficiencyLabel = (level) => {
    switch (level) {
      case 0:
        return "Not Found";
      case 1:
        return "Mentioned";
      case 2:
        return "Used in Project";
      case 3:
        return "Central Skill";
      default:
        return "Unknown";
    }
  };

  // Get proficiency color
  const getProficiencyColor = (level) => {
    switch (level) {
      case 0:
        return "bg-red-100 text-red-800";
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-green-100 text-green-800";
      case 3:
        return "bg-green-200 text-green-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {screening.candidate.full_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Score Overview */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Final Score</div>
                <div className="text-3xl font-bold text-blue-600">
                  {parseFloat(screening.final_score).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Quality Multiplier</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {parseFloat(screening.quality_multiplier).toFixed(2)}x
                </div>
              </div>
            </div>
          </div>

          {/* Must-Have Skills */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Required Skills
            </h3>
            <div className="space-y-3">
              {mustHaveMatches.map((skill, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    skill.proficiency_level === 0
                      ? "bg-red-50 border-red-400"
                      : "bg-green-50 border-green-400"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">
                      {skill.skill}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${getProficiencyColor(
                        skill.proficiency_level
                      )}`}
                    >
                      {getProficiencyLabel(skill.proficiency_level)}
                    </span>
                  </div>
                  {skill.evidence_from_resume && (
                    <div className="text-sm text-gray-700 italic mt-2 pl-3 border-l-2 border-gray-300">
                      "{skill.evidence_from_resume}"
                    </div>
                  )}
                  {!skill.evidence_from_resume &&
                    skill.proficiency_level === 0 && (
                      <div className="text-sm text-red-600 mt-2">
                        No evidence found in resume
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Nice-to-Have Skills */}
          {niceToHaveMatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Additional Skills (Nice-to-Have)
              </h3>
              <div className="space-y-3">
                {niceToHaveMatches.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {skill.skill}
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${getProficiencyColor(
                          skill.proficiency_level
                        )}`}
                      >
                        {getProficiencyLabel(skill.proficiency_level)}
                      </span>
                    </div>
                    {skill.evidence_from_resume && (
                      <div className="text-sm text-gray-700 italic mt-2 pl-3 border-l-2 border-gray-300">
                        "{skill.evidence_from_resume}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Contact Information</div>
            <div className="text-gray-900 font-medium">
              {screening.candidate.contact_info}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
