import React, { useEffect, useState } from "react";
import { KeyRound, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreationItem } from "../components/CreationItem";
import { useApi, unwrap } from "../lib/useApi";
import { useApiKeyStatus } from "../lib/apiKeyContext";

const Dashboard = () => {
  const [creation, setCreation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const api = useApi();
  const navigate = useNavigate();
  const { credentials } = useApiKeyStatus();

  useEffect(() => {
    let cancelled = false;

    const getDashboardData = async () => {
      try {
        const { data } = await api.get("/api/ai/get-user-creations");
        if (!cancelled) setCreation(unwrap(data).creations);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getDashboardData();
    return () => { cancelled = true };
  }, [api]);

  return (
    <div className="h-full overflow-y-scroll p-6">
      <div className="flex justify-start gap-4 flex-wrap">
        {/* Total Creation Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div className="text-slate-600">
            <p className="text-sm">Total Creation</p>
            <h2 className="text-xl font-semibold">{creation.length}</h2>
          </div>

          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#3588F2] to-[#0BB087] text-white flex justify-center items-center">
            <Sparkles className="w-5 text-white" />
          </div>
        </div>

        {/* API Key Card */}
        <button type="button" onClick={() => navigate('/ai/api-key')}
          className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200 text-left cursor-pointer hover:border-gray-300">
          <div className="text-slate-600">
            <p className="text-sm">API Key</p>
            <h2 className={`text-xl font-semibold ${credentials ? '' : 'text-red-600'}`}>
              {credentials ? `••••${credentials.last4}` : "Not set"}
            </h2>
          </div>

          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#5044E5] to-[#9E53EE] text-white flex justify-center items-center">
            <KeyRound className="w-5 text-white" />
          </div>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-3/4">
          <span className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="mt-6 mb-4">Recent Creation</p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!error && creation.length === 0 && (
            <p className="text-sm text-gray-400">Nothing here yet. Use one of the tools to get started.</p>
          )}

          {creation.map((item) => (
            <CreationItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
