import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Plus, Trash2, Loader } from 'lucide-react';
import { keyService } from '../services/api';
import type { KeyItem } from '../types/user';

const Keys: React.FC = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await keyService.getKeys();
      setKeys(data);
    } catch (err: any) {
      console.error('Failed to load keys:', err);
      setError(err.response?.data?.detail || 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!newKey.trim()) {
      setError('Key value cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await keyService.createKey({ key: newKey.trim() });
      setNewKey('');
      await loadKeys();
    } catch (err: any) {
      console.error('Failed to create key:', err);
      setError(err.response?.data?.detail || 'Failed to create key');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    const confirmed = window.confirm('Delete this key? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setSaving(true);
      await keyService.deleteKey(keyId);
      await loadKeys();
    } catch (err: any) {
      console.error('Failed to delete key:', err);
      setError(err.response?.data?.detail || 'Failed to delete key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
              <Key className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold">API Keys</p>
              <h1 className="text-3xl font-bold text-slate-900">Manage Keys</h1>
              <p className="mt-1 text-slate-500">Add and manage your API keys</p>
            </div>
          </div>

          {/* Add Key Form */}
          <form onSubmit={handleAddKey} className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto]">
            <input
              id="new-key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              disabled={saving}
              placeholder="Enter a new key value..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              <Plus className="h-4 w-4" />
              Add Key
            </button>
          </form>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-5 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Keys Grid */}
          <div>
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-20 text-center">
                <Loader className="mx-auto h-12 w-12 animate-spin text-sky-500" />
                <p className="mt-4 text-slate-600 font-medium">Loading keys...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-20 text-center">
                <Key className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 font-medium">No keys found</p>
                <p className="text-slate-500 text-sm mt-2">Add your first key to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {keys.map((keyItem) => (
                  <div
                    key={keyItem.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
                        <Key className="h-5 w-5" />
                      </div>
                      <button
                        onClick={() => handleDeleteKey(keyItem.id)}
                        disabled={saving}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="font-mono text-sm font-medium text-slate-900 break-all leading-relaxed">
                        {keyItem.key}
                      </p>
                      <p className="text-xs text-slate-500">ID: {keyItem.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Keys;