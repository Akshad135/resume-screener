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
            const analysis = screening.skill_match_analysis;
            const executiveSummary =
              analysis?.holistic_analysis?.executive_summary ||
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
                    <p className="text-gray-700 mb-3">{executiveSummary}</p>
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

      {/* Detailed Analysis Modal */}
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
  const analysis = screening.skill_match_analysis;
  const skillAnalysis = analysis?.skill_match_analysis || {};
  const experienceAnalysis = analysis?.experience_match_analysis || {};
  const holisticAnalysis = analysis?.holistic_analysis || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {screening.candidate.full_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
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

          {/* Executive Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Executive Summary
            </h3>
            <p className="text-gray-700">
              {holisticAnalysis.executive_summary}
            </p>
          </div>

          {/* Skills Match */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Skills Match
            </h3>
            {skillAnalysis.matched_skills?.map((skill, idx) => (
              <div key={idx} className="mb-4 p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900 mb-1">
                  {skill.skill}
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  {skill.reasoning}
                </div>
                {skill.evidence && (
                  <div className="text-sm italic text-gray-600 border-l-2 border-green-400 pl-3">
                    "{skill.evidence}"
                  </div>
                )}
              </div>
            ))}

            {skillAnalysis.missing_skills?.length > 0 && (
              <div className="mt-4">
                <div className="font-medium text-gray-900 mb-2">
                  Missing Skills
                </div>
                {skillAnalysis.missing_skills.map((skill, idx) => (
                  <div key={idx} className="mb-2 p-3 bg-gray-100 rounded">
                    <div className="font-medium text-gray-700">
                      {skill.skill}
                    </div>
                    <div className="text-sm text-gray-600">
                      {skill.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experience Match */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Experience Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Required Experience</div>
                <div className="text-xl font-semibold">
                  {experienceAnalysis.required_years || "N/A"} years
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Candidate Experience
                </div>
                <div className="text-xl font-semibold">
                  {experienceAnalysis.calculated_candidate_years || "N/A"} years
                </div>
              </div>
            </div>
            <p className="text-gray-700">{experienceAnalysis.reasoning}</p>
          </div>

          {/* Red Flags */}
          {holisticAnalysis.red_flags?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Red Flags
              </h3>
              {holisticAnalysis.red_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border-l-4 border-red-400 mb-2"
                >
                  <div className="font-medium text-red-900">{flag.flag}</div>
                  <div className="text-sm text-red-700">{flag.reasoning}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
