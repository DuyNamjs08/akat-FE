import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Settings,
  Route,
  Send,
} from 'lucide-react';
import { useMonitoringStore } from '../store/monitoringStore';
import {
  getModeratedPosts,
  getUserFacebookPages,
  getPageConfig,
  updatePageConfig,
  type FacebookPost,
} from '../lib/contentModeration';

interface MonitoredPage {
  id: string;
  name: string;
  avatarUrl?: string;
  followerCount?: number;
  isMonitored: boolean;
}

function ContentModerationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setPageMonitoring, initializeMonitoring } = useMonitoringStore();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'all' | 'pending' | 'approved' | 'violated'>(
    'all'
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  const [autoHideEnabled, setAutoHideEnabled] = useState(true);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>(['admin@example.com']);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [loadingAutoHide, setLoadingAutoHide] = useState(false);
  const [loadingAutoCorrect, setLoadingAutoCorrect] = useState(false);
  const [hidePost, setHidePost] = useState(false);
  const [editContent, setEditContent] = useState(false);
  const [notifyAdmin, setNotifyAdmin] = useState(false);
  const [email, setEmail] = useState('akamedia@gmail.com');
  const [volume, setVolume] = useState(90);

  const defaultPrompt =
    'You are a content moderation system for Facebook posts. Your task is to analyze the content of posts and determine if they violate community standards.\n' +
    '\n' +
    'Analyze the post for the following violations:\n' +
    '1. Hate speech or discrimination\n' +
    '2. Violence or threats\n' +
    '3. Nudity or sexual content\n' +
    '4. Harassment or bullying\n' +
    '5. Spam or misleading content\n' +
    '6. Illegal activities\n' +
    '7. Self-harm or suicide\n' +
    '8. Misinformation\n' +
    '\n' +
    'Respond with a JSON object in the following format:\n' +
    '{\n' +
    '"violates": boolean,\n' +
    '"category": string or null,\n' +
    '"reason": string or null,\n' +
    '"confidence": number between 0 and 1\n' +
    '}\n' +
    '\n' +
    'Where:\n' +
    '- "violates" is true if the post violates community standards, false otherwise\n' +
    '- "category" is the category of violation (one of the 8 listed above), or null if no violation\n' +
    '- "reason" is a brief explanation of why the post violates standards, or null if no violation\n' +
    '- "confidence" is your confidence level in the assessment (0.0 to 1.0)\n' +
    '\n' +
    'Be thorough but fair in your assessment. If you are unsure, err on the side of caution.';
  const [prompt, setPrompt] = useState(defaultPrompt);

  const toggleAutoHide = async () => {
    const newState = !autoHideEnabled;
    setLoadingAutoHide(true);

    try {
      setAutoHideEnabled(newState);
      await savePageConfig();
    } catch (err) {
      console.error('Error saving auto-hide config:', err);
      setAutoHideEnabled(!newState); // Khôi phục trạng thái nếu lưu thất bại
      alert('Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setLoadingAutoHide(false);
    }
  };

  const toggleAutoCorrect = async () => {
    const newState = !autoCorrectEnabled;
    setLoadingAutoCorrect(true);

    try {
      setAutoCorrectEnabled(newState);
      await savePageConfig();
    } catch (err) {
      console.error('Error saving auto-correct config:', err);
      setAutoCorrectEnabled(!newState); // Khôi phục trạng thái nếu lưu thất bại
      alert('Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setLoadingAutoCorrect(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [currentStatus, page]);

  useEffect(() => {
    if (selectedPage) {
      savePageConfig();
    }
  }, [autoHideEnabled, autoCorrectEnabled, confidenceThreshold]);

  useEffect(() => {
    if (selectedPage) {
      loadPageConfig(selectedPage);
    }
  }, [selectedPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedPages = await getUserFacebookPages();

      const monitoredPages = fetchedPages.map((page) => ({
        id: page.pageId,
        name: page.pageName,
        avatarUrl: page.avatarUrl,
        followerCount: page.followerCount,
        isMonitored: useMonitoringStore.getState().getPageMonitoring(page.pageId) ?? false,
      }));

      setPages(monitoredPages);
      initializeMonitoring(fetchedPages.map((page) => page.pageId));
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const status = currentStatus === 'all' ? undefined : currentStatus;
      const response = await getModeratedPosts(status, page, 10);
      setPosts(response.data);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const togglePageMonitoring = async (pageId: string) => {
    const targetPage = pages.find((page) => page.id === pageId);
    if (!targetPage) return;

    const originalState = targetPage.isMonitored;

    try {
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === pageId ? { ...page, isMonitored: !page.isMonitored } : page
        )
      );

      await setPageMonitoring(pageId, !originalState);
      setShowToggleConfirm(null);
    } catch (err) {
      console.error('Error toggling page monitoring:', err);

      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === pageId ? { ...page, isMonitored: originalState } : page
        )
      );

      alert('Có lỗi xảy ra khi thay đổi trạng thái giám sát.');
    }
  };
  const loadPageConfig = async (pageId: string) => {
    try {
      const config = await getPageConfig(pageId);
      if (config) {
        setAutoHideEnabled(config.auto_moderation ?? false);
        setAutoCorrectEnabled(config.auto_correct ?? false);
        setConfidenceThreshold(config.confidence_threshold ?? 90);
      } else {
        setAutoHideEnabled(true);
        setAutoCorrectEnabled(false);
        setConfidenceThreshold(90);
      }
    } catch (err) {
      console.error('Error loading page config:', err);
    }
  };

  const savePageConfig = async () => {
    if (!selectedPage) return;

    try {
      setSavingConfig(true);
      await updatePageConfig({
        facebook_fanpage_id: selectedPage,
        auto_moderation: autoHideEnabled,
        auto_correct: autoCorrectEnabled,
        confidence_threshold: confidenceThreshold,
        prompt,
        hide_post_violations: hidePost,
        edit_minor_content: editContent,
        notify_admin: notifyAdmin,
        admin_email: email,
        threshold: volume,
      });
    } catch (err) {
      console.error('Error saving page config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const saveConfig = async () => {
    if (!selectedPage) return;
    try {
      setSavingConfig(true);
      await updatePageConfig({
        facebook_fanpage_id: selectedPage,
        auto_moderation: autoHideEnabled,
        auto_correct: autoCorrectEnabled,
        confidence_threshold: confidenceThreshold,
        prompt,
        hide_post_violations: hidePost,
        edit_minor_content: editContent,
        notify_admin: notifyAdmin,
        admin_email: email,
        threshold: volume,
      });
      alert('Cấu hình đã được lưu!');
    } catch (err) {
      console.error('Error saving page config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };
  const addEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newEmail && emailRegex.test(newEmail) && !emails.includes(newEmail)) {
      setEmails([...emails, newEmail]);
      setNewEmail('');
    } else {
      alert('Email không hợp lệ hoặc đã tồn tại!');
    }
  };

  const updateEmail = (oldEmail: string, newValue: string) => {
    setEmails((emails) => emails.map((email) => (email === oldEmail ? newValue : email)));
    setEditingEmail(null);
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails((emails) => emails.filter((email) => email !== emailToRemove));
  };

  const renderPagination = () => {
    const range = 2;
    const pages = [];
    for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
      pages.push(i);
    }
    return pages.map((pageNum) => (
      <button
        key={pageNum}
        onClick={() => setPage(pageNum)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          pageNum === page ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
        }`}
      >
        {pageNum}
      </button>
    ));
  };

  const onClose = () => {
    console.log('Đã nhấn nút Hủy');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Giám sát và kiểm duyệt nội dung</h1>
        <p className="text-gray-600">Tự động giám sát và kiểm duyệt bài viết Facebook bằng AI</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-500" />
              Facebook Pages
            </h2>

            <div className="space-y-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => setSelectedPage(page.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedPage === page.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                      {page.avatarUrl ? (
                        <img
                          src={page.avatarUrl}
                          alt={page.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                          {page.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <h3 className="font-medium">{page.name}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {page.followerCount
                          ? `${page.followerCount.toLocaleString()} followers`
                          : 'No follower data'}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto">
                    {showToggleConfirm === page.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // block sự kiện onClick của parent
                            togglePageMonitoring(page.id);
                          }}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-red-600"
                        >
                          {page.isMonitored ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowToggleConfirm(null);
                          }}
                          className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowToggleConfirm(page.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors w-full sm:w-auto min-w-[120px] text-sm ${
                          page.isMonitored
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page.isMonitored ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Đang giám sát</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Đã tạm dừng</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 min-h-[calc(100vh-24rem)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Bài viết đã kiểm duyệt
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCurrentStatus('all')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentStatus === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setCurrentStatus('pending')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Đang xử lý
                </button>
                <button
                  onClick={() => setCurrentStatus('approved')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentStatus === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Hợp lệ
                </button>
                <button
                  onClick={() => setCurrentStatus('violated')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentStatus === 'violated'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Vi phạm
                </button>
              </div>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4 mb-6">
                {posts.map((post) => (
                  <div key={post.id} className="border rounded-lg overflow-hidden">
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                            {post.page_avatar_url ? (
                              <img
                                src={post.page_avatar_url}
                                alt={post.page_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                {post.page_name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{post.page_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{new Date(post.created_time).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-auto">
                          {post.status === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : post.status === 'violated' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-yellow-500" />
                          )}
                          <span
                            className={`font-medium ${
                              post.status === 'approved'
                                ? 'text-green-600'
                                : post.status === 'violated'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {post.status === 'approved'
                              ? 'Hợp lệ'
                              : post.status === 'violated'
                                ? 'Vi phạm'
                                : 'Đang xử lý'}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-3">{post.message}</p>
                      {post.moderation_result && post.moderation_result.violates && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-red-700">
                            Lý do vi phạm: {post.moderation_result.category}
                          </p>
                          <p className="text-sm text-red-600">{post.moderation_result.reason}</p>
                          {post.moderation_result.confidence && (
                            <p className="text-xs text-red-500 mt-1">
                              Độ tin cậy: {Math.round(post.moderation_result.confidence * 100)}%
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                      <span className="text-sm text-gray-500">ID: {post.post_id}</span>
                      <div className="flex gap-2">
                        <a
                          href={`https://facebook.com/${post.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Xem trên Facebook
                        </a>
                        {post.status === 'violated' && (
                          <button className="text-green-600 text-sm hover:underline">
                            Phê duyệt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có bài viết nào được kiểm duyệt</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100 rounded-lg shadow-sm">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Cấu hình kiểm duyệt nội dung
                </h2>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Tự động kiểm duyệt</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Tự động kiểm duyệt nội dung bài viết và bình luận
                    </p>
                  </div>
                  <button onClick={toggleAutoHide} className="flex items-center">
                    {autoHideEnabled ? (
                      // Bật
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-blue-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                        <circle cx="16" cy="12" r="2"></circle>
                      </svg>
                    ) : (
                      // Tắt
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                        <circle cx="8" cy="12" r="2"></circle>
                      </svg>
                    )}
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Route className="w-5 h-5 text-blue-500" />
                    Hành động tự động
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Tự động ẩn bài vi phạm</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Tự động ẩn bài viết khi phát hiện vi phạm
                        </p>
                      </div>
                      <button onClick={() => setHidePost(!hidePost)} className="text-gray-700">
                        {hidePost ? (
                          // Bật
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="16" cy="12" r="2"></circle>
                          </svg>
                        ) : (
                          // Tắt
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="8" cy="12" r="2"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Tự động sửa nội dung</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Tự động sửa các nội dung vi phạm nhẹ
                        </p>
                      </div>
                      <button
                        onClick={() => setEditContent(!editContent)}
                        className="text-gray-700"
                      >
                        {editContent ? (
                          // Bật
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="16" cy="12" r="2"></circle>
                          </svg>
                        ) : (
                          // Tắt
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="8" cy="12" r="2"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Thông báo cho quản trị viên</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Gửi email thông báo khi phát hiện vi phạm
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifyAdmin(!notifyAdmin)}
                        className="text-gray-700"
                      >
                        {notifyAdmin ? (
                          // Bật
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="16" cy="12" r="2"></circle>
                          </svg>
                        ) : (
                          // Tắt
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="20" height="12" x="2" y="6" rx="6" ry="6"></rect>
                            <circle cx="8" cy="12" r="2"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Phần Email quản trị viên */}
                    <div
                      className={`transition-all duration-1000 overflow-hidden ${
                        notifyAdmin ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        Email quản trị viên
                      </h3>
                      <input
                        type="email"
                        className="w-full p-2 border rounded-lg text-gray-500"
                        placeholder="Nhập email quản trị viên"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    Ngưỡng độ tin cậy để tự động xử lý
                  </label>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="80"
                      max="100"
                      step="5"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600 font-medium">80%</span>
                      <span className="text-blue-600 font-medium">85%</span>
                      <span className="text-blue-600 font-medium">90%</span>
                      <span className="text-gray-600">95%</span>
                      <span className="text-gray-600">100%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-2">Prompt kiểm duyệt</label>
                  <textarea
                    className="w-full p-3 border border-gray-200 rounded-lg h-48 font-mono text-sm"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">
                    Prompt này sẽ được sử dụng để hướng dẫn AI kiểm duyệt nội dung
                  </p>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                    onClick={onClose}
                  >
                    Hủy
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-save w-4 h-4"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Tích hợp trong tương lai</h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">Zalo OA</span>
                </div>
                <p className="text-sm text-gray-500">
                  Tích hợp với Zalo Official Account để quản lý tin nhắn và thông báo
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">Lark</span>
                </div>
                <p className="text-sm text-gray-500">
                  Tích hợp với Lark để quản lý tin nhắn và thông báo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentModerationPage;
