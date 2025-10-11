import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE_URL from "../api/config";

export default function Results() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

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
        <h1 className="text-3xl font-bold text-gray-900">{jobTitle}</h1>
        <p className="text-gray-600 mt-2">
          {screenings.length} candidates ranked
        </p>
      </div>

      {screenings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No candidates found for this job</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {screenings.map((screening, index) => {
            // Generate a simple summary from must_have skills
            const mustHaveSkills =
              screening.skill_match_analysis?.skill_match_analysis
                ?.must_have_matches || [];
            const matchedCount = mustHaveSkills.filter(
              (s) => s.proficiency_level > 0
            ).length;
            const totalRequired = mustHaveSkills.length;

            const summary =
              screening.skill_match_analysis?.executive_summary ||
              "No summary available";

            return (
              <div
                key={screening.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
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
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {parseFloat(screening.final_score).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">Score</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
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
                      className={`text-xs font-semibold px-2 py-1 rounded ${getProficiencyColor(
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
                        className={`text-xs font-semibold px-2 py-1 rounded ${getProficiencyColor(
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
