import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Results() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [uploadingResumes, setUploadingResumes] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingScreeningId, setDeletingScreeningId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchScreenings();
  }, [jobId]);

  const fetchScreenings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/screenings/`);

      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch screenings");
      }

      const data = await response.json();
      setScreenings(data);
      setNotFound(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingResumes(false);
    }
  };

  const handleDeleteScreening = async (screeningId, candidateName, e) => {
    e.stopPropagation();

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

      await fetchScreenings();
    } catch (err) {
      alert(`Error deleting screening: ${err.message}`);
    } finally {
      setDeletingScreeningId(null);
    }
  };

  // Helper function to get score color
  const getScoreColor = (score) => {
    if (score >= 70) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  // Helper function to get score background
  const getScoreBg = (score) => {
    if (score >= 70) return "bg-emerald-50 border-emerald-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  // Helper function to get rank badge color
  const getRankBadge = (index) => {
    if (index === 0)
      return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white";
    if (index === 1)
      return "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800";
    if (index === 2)
      return "bg-gradient-to-r from-orange-400 to-amber-600 text-white";
    return "bg-gradient-to-r from-indigo-500 to-purple-600 text-white";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <div className="text-xl text-gray-600">Loading results...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white border border-yellow-200 rounded-2xl p-8 max-w-md text-center shadow-xl">
          <svg
            className="mx-auto h-16 w-16 text-amber-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Job Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The job you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md text-center shadow-xl">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Error Loading Results
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchScreenings();
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const jobTitle =
    screenings.length > 0 ? screenings[0].job.title : "Job Results";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
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

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {jobTitle}
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-indigo-500"
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
                  {screenings.length} candidate
                  {screenings.length !== 1 ? "s" : ""} ranked
                </p>
              </div>

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
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 transition flex items-center gap-2 shadow-md"
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
                  <p className="text-sm text-gray-600">
                    Analyzing new resumes...
                  </p>
                )}
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {uploadError}
            </div>
          )}
        </div>

        {/* Candidates List */}
        {screenings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-500 text-lg mb-4">
              No candidates screened for this job yet
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-md"
            >
              Add Candidates
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {screenings.map((screening, index) => {
              const summary =
                screening.skill_match_analysis?.executive_summary ||
                "Executive summary not available for this screening.";
              const score = parseFloat(screening.final_score);

              return (
                <div
                  key={screening.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 relative group"
                >
                  <div className="flex items-start justify-between gap-6">
                    {/* Left: Rank & Info */}
                    <div className="flex gap-4 flex-1">
                      <span
                        className={`${getRankBadge(
                          index
                        )} text-sm font-bold px-4 py-2 rounded-lg shadow-md flex items-center justify-center min-w-[50px] h-fit`}
                      >
                        #{index + 1}
                      </span>

                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {screening.candidate.full_name || "Unknown Candidate"}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                          {summary}
                        </p>
                        <button
                          onClick={() => setSelectedCandidate(screening)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 transition"
                        >
                          View Detailed Analysis
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
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Right: Score & Delete */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`${getScoreBg(
                          score
                        )} border rounded-xl px-6 py-4 text-center min-w-[100px]`}
                      >
                        <div
                          className={`text-4xl font-bold ${getScoreColor(
                            score
                          )}`}
                        >
                          {score.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 font-medium">
                          Score
                        </div>
                      </div>

                      <button
                        onClick={(e) =>
                          handleDeleteScreening(
                            screening.id,
                            screening.candidate.full_name,
                            e
                          )
                        }
                        disabled={deletingScreeningId === screening.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg disabled:bg-gray-400 shadow-md"
                        title="Remove candidate"
                      >
                        {deletingScreeningId === screening.id ? (
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

  // Separate matched and missing skills
  const matchedMustHave = mustHaveMatches.filter(
    (skill) => skill.proficiency_level > 0
  );
  const missingMustHave = mustHaveMatches.filter(
    (skill) => skill.proficiency_level === 0
  );

  const matchedNiceToHave = niceToHaveMatches.filter(
    (skill) => skill.proficiency_level > 0
  );
  const missingNiceToHave = niceToHaveMatches.filter(
    (skill) => skill.proficiency_level === 0
  );

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

  // Get proficiency color - TONED DOWN
  const getProficiencyColor = (level) => {
    switch (level) {
      case 0:
        return "bg-red-50 text-red-700 border border-red-200";
      case 1:
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case 2:
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case 3:
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Simple Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {screening.candidate.full_name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Detailed Skill Analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Score Overview - Simple */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 mb-1">Final Score</div>
                <div className="text-4xl font-bold text-indigo-600">
                  {parseFloat(screening.final_score).toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">
                  Quality Multiplier
                </div>
                <div className="text-3xl font-semibold text-gray-900">
                  {parseFloat(screening.quality_multiplier).toFixed(2)}x
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mb-6 bg-indigo-50 rounded-lg p-5 border-l-4 border-indigo-400">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Executive Summary
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {screening.skill_match_analysis?.executive_summary ||
                "No summary available"}
            </p>
          </div>

          {/* Must-Have Skills - Matched */}
          {matchedMustHave.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ✓ Matched Required Skills ({matchedMustHave.length})
              </h3>
              <div className="space-y-3">
                {matchedMustHave.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400"
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

          {/* Must-Have Skills - Missing */}
          {missingMustHave.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ✗ Missing Required Skills ({missingMustHave.length})
              </h3>
              <div className="space-y-3">
                {missingMustHave.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400"
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
                    <div className="text-sm text-red-600 mt-2">
                      No evidence found in resume
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nice-to-Have Skills */}
          {(matchedNiceToHave.length > 0 || missingNiceToHave.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Additional Skills (Nice-to-Have)
              </h3>
              <div className="space-y-3">
                {matchedNiceToHave.map((skill, idx) => (
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

          {/* Red Flags Section*/}
          {screening.quality_assessment?.red_flags &&
            screening.quality_assessment.red_flags.length > 0 && (
              <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-sm font-semibold text-red-800">
                    Resume Quality Concerns
                  </div>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {screening.quality_assessment.red_flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Contact Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
