import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import type { PackingList } from "../types";
import * as api from "../api";
import NewListModal from "./NewListModal";

export default function HomePage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<PackingList[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedLists, setArchivedLists] = useState<PackingList[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeLists = lists.filter((l) => !l.is_template);
  const templates = lists.filter((l) => l.is_template);

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.getLists(false);
      setLists(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArchived = useCallback(async () => {
    const data = await api.getLists(true);
    setArchivedLists(data);
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    if (showArchived) fetchArchived();
  }, [showArchived, fetchArchived]);

  const handleArchive = async (id: number) => {
    await api.updateList(id, { is_archived: 1 });
    fetchLists();
  };

  const handleUnarchive = async (id: number) => {
    await api.updateList(id, { is_archived: 0 });
    fetchLists();
    fetchArchived();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this list permanently?")) return;
    await api.deleteList(id);
    fetchLists();
    fetchArchived();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "Z");
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">My Lists</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium cursor-pointer"
        >
          + New List
        </button>
      </div>

      {activeLists.length === 0 && (
        <p className="text-gray-400 text-sm mb-8">
          No active lists yet. Create one to get started!
        </p>
      )}

      {activeLists.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {activeLists.map((list) => (
            <div
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-800 group-hover:text-primary">
                  {list.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(list.id);
                  }}
                  className="text-gray-300 hover:text-gray-500 text-xs p-1 cursor-pointer"
                  title="Archive"
                >
                  Archive
                </button>
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {list.checked_items ?? 0}/{list.total_items ?? 0} packed
                  </span>
                </div>
                {(list.total_items ?? 0) > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all"
                      style={{
                        width: `${((list.checked_items ?? 0) / (list.total_items ?? 1)) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {formatDate(list.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {templates.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => navigate(`/lists/${tmpl.id}`)}
                className="bg-white rounded-lg border border-gray-200 border-dashed p-4 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <h3 className="font-medium text-gray-800 group-hover:text-primary">
                  {tmpl.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {tmpl.total_items ?? 0} items
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => setShowArchived(!showArchived)}
        className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
      >
        {showArchived ? "Hide Archived" : "Show Archived"}
      </button>

      {showArchived && archivedLists.length > 0 && (
        <div className="mt-3 space-y-2">
          {archivedLists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between bg-gray-100 rounded-lg p-3"
            >
              <span
                onClick={() => navigate(`/lists/${list.id}`)}
                className="text-gray-500 text-sm hover:text-primary cursor-pointer"
              >
                {list.name}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUnarchive(list.id)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Unarchive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showArchived && archivedLists.length === 0 && (
        <p className="text-gray-400 text-sm mt-2">No archived lists.</p>
      )}

      <NewListModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        templates={templates}
        onCreated={(list) => navigate(`/lists/${list.id}`)}
      />
    </div>
  );
}
