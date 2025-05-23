import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { disconnectFacebookPage } from '../lib/facebook';
import { useMonitoringStore } from '../store/monitoringStore';
import axios from 'axios';
import { BaseUrl } from '../constants';

export interface ConnectedPage {
  id: string;
  page_id: string;
  page_name: string;
  status: 'connected' | 'disconnected';
  last_sync: string;
  created_at: string;
  access_token?: string;
  page_avatar_url?: string | null;
  follower_count?: number | null;
  page_type?: 'classic' | 'new' | null;
  facebook_fanpage_id: string;
  user_id: string;
}
interface DeleteConfirmationProps {
  page: ConnectedPage;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}
function DeleteConfirmation({ page, onConfirm, onCancel, isLoading }: DeleteConfirmationProps) {
  return (
    <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="p-4 text-center">
        <h4 className="font-medium text-gray-900 mb-2">Xác nhận ngắt kết nối</h4>
        <p className="text-sm text-gray-600 mb-4">
          Bạn có chắc chắn muốn ngắt kết nối với page &quot;{page.page_name}&quot;?
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Ngắt kết nối</span>
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
function ConnectedPages({
  pages,
  loading,
  setRefreshKey,
  fanPages,
}: {
  pages: ConnectedPage[];
  loading: boolean;
  setRefreshKey: Dispatch<SetStateAction<number>>;
  fanPages: any;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<ConnectedPage | null>(null);
  const { syncing } = useMonitoringStore();
  const handleDisconnect = async (page: ConnectedPage) => {
    try {
      setActionInProgress(page.page_id);
      setError(null);
      await axios
        .delete(`${BaseUrl}/facebook-connection/${page.id}`)
        .then((res) => setRefreshKey((prev) => prev + 1))
        .catch((err) => setRefreshKey((prev) => prev + 1));
      setPageToDelete(null);

      await axios.post(`${BaseUrl}/facebook-page-insight/connection`, {
        facebook_fanpage_id: page.facebook_fanpage_id,
        user_id: page.user_id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect page');
    } finally {
      setActionInProgress(null);
    }
  };
  const handleRefresh = async (page: ConnectedPage) => {
    if (!page.access_token) {
      setError('No access token available for this page');
      return;
    }
    try {
      setRefreshKey((prev) => prev + 1);
      setActionInProgress(page.page_id);
      setError(null);
    } catch (err) {
      console.error('Refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh connection');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Facebook Pages đã kết nối</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pages.length > 0 ? (
          pages.map((page) => (
            <div
              key={page.id}
              className="relative flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {page.page_avatar_url ? (
                    <img
                      src={page.page_avatar_url}
                      alt={page.page_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-600">
                      {page?.page_name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">
                    {fanPages?.find((item: any) => item?.id == page?.facebook_fanpage_id)
                      ?.page_name || ''}
                    {page.page_type && (
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          page.page_type === 'new'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page.page_type === 'new' ? 'New Page' : 'Classic'}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    {page.status === 'connected' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={page.status === 'connected' ? 'text-green-600' : 'text-red-600'}
                    >
                      {page.status === 'connected' ? 'Đang kết nối' : 'Đã ngắt kết nối'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      Cập nhật: {new Date(page.created_at).toLocaleDateString()}
                    </span>
                    {page.follower_count && page.follower_count > 0 && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          {page.follower_count.toLocaleString()} followers
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfig(page.page_id)}
                  className="p-2 text-gray-600 hover:text-blue-600 rounded transition-colors"
                  title="Thêm API key và lưu"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRefresh(page)}
                  disabled={
                    actionInProgress === page.page_id || pageToDelete?.id === page.id || syncing
                  }
                  className={`p-2 text-gray-600 hover:text-blue-600 rounded transition-colors ${
                    actionInProgress === page.page_id || pageToDelete?.id === page.id || syncing
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title="Làm mới kết nối"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${actionInProgress === page.page_id ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setPageToDelete(page)}
                  disabled={actionInProgress === page.page_id || pageToDelete?.id === page.id}
                  className={`p-2 text-gray-600 hover:text-red-600 rounded transition-colors ${
                    actionInProgress === page.page_id || pageToDelete?.id === page.id
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title="Ngắt kết nối"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {pageToDelete?.id === page.id && (
                <DeleteConfirmation
                  page={page}
                  onConfirm={() => handleDisconnect(page)}
                  onCancel={() => setPageToDelete(null)}
                  isLoading={actionInProgress === page.page_id}
                />
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <XCircle className="w-12 h-12 text-gray-300 mx-auto" />
            </div>
            <p className="text-lg font-medium mb-2">Chưa có Facebook Page nào được kết nối</p>
            <p className="text-sm text-gray-400">Vui lòng kết nối Facebook Page để quản lý</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectedPages;
