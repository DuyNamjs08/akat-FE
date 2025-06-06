import React from 'react';
import { Search, Bot } from 'lucide-react';

interface Page {
  id: string;
  name: string;
  avatar?: string;
  followerCount?: number;
}

interface PageSelectorProps {
  onPageSelect: (page: Page) => void;
  onClose: () => void;
  data?: any;
}

function PageSelector({ onPageSelect, onClose, data }: PageSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Chọn Page để đăng bài</h2>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm page..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          {/* Pages List */}
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {data.map((page: any) => (
              <button
                key={page.id}
                onClick={() => onPageSelect(page)}
                className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {page.image_url ? (
                  <img
                    src={page.image_url}
                    alt={page.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{page.name}</h3>
                  {page.follows && (
                    <p className="text-sm text-gray-600">
                      {page.follows.toLocaleString()} người theo dõi
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

export default PageSelector;
