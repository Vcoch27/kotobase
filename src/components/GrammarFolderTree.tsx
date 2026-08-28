'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { deleteGrammarFolder, updateGrammarFolder } from '@/app/actions/grammar';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  AlertTriangle,
  Type,
  MoreVertical,
} from 'lucide-react';

interface GrammarFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { folderGrammars: number };
}

interface GrammarFolderTreeProps {
  folders: GrammarFolderItem[];
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  onRefresh: () => void;
}

export function GrammarFolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onRefresh,
}: GrammarFolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kotobase_grammar_expanded_folders');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<GrammarFolderItem[]>([]);

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'rename';
    targetId: string;
    targetName: string;
  }>({
    isOpen: false,
    type: 'rename',
    targetId: '',
    targetName: '',
  });
  const [promptValue, setPromptValue] = useState('');
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeMenuFolderId) setActiveMenuFolderId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeMenuFolderId]);

  useEffect(() => {
    if (promptModal.isOpen && promptInputRef.current) {
      setTimeout(() => {
        promptInputRef.current?.focus();
        if (promptModal.type === 'rename') {
          promptInputRef.current?.select();
        }
      }, 50);
    }
  }, [promptModal.isOpen, promptModal.type]);

  useEffect(() => {
    if (selectedFolderId && selectedFolderId !== 'all' && folders.length > 0) {
      const folderMap = new Map<string, GrammarFolderItem>();
      folders.forEach((f) => folderMap.set(f.id, f));

      const newExpanded: Record<string, boolean> = {};
      let current = folderMap.get(selectedFolderId);
      while (current && current.parentId) {
        newExpanded[current.parentId] = true;
        current = folderMap.get(current.parentId);
      }

      if (Object.keys(newExpanded).length > 0) {
        setExpandedFolders((prev) => {
          const updated = { ...prev, ...newExpanded };
          try {
            localStorage.setItem('kotobase_grammar_expanded_folders', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  }, [selectedFolderId, folders]);

  const tree = useMemo(() => {
    const map = new Map<string, any>();
    localFolders.forEach((f) => map.set(f.id, { ...f, children: [] }));
    const root: any[] = [];

    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        root.push(node);
      }
    });
    return root;
  }, [localFolders]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('kotobase_grammar_expanded_folders', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const openRenameModal = (id: string, currentName: string) => {
    setPromptValue(currentName);
    setPromptModal({
      isOpen: true,
      type: 'rename',
      targetId: id,
      targetName: currentName,
    });
  };

  const openDeleteModal = (id: string, name: string) => {
    setPromptValue('');
    setPromptModal({
      isOpen: true,
      type: 'delete',
      targetId: id,
      targetName: name,
    });
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (promptModal.type === 'rename') {
      const newName = promptValue.trim();
      if (!newName || newName === promptModal.targetName) {
        setPromptModal((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      
      setLocalFolders((prev) =>
        prev.map((f) => (f.id === promptModal.targetId ? { ...f, name: newName } : f))
      );
      setPromptModal((prev) => ({ ...prev, isOpen: false }));

      const res = await updateGrammarFolder(promptModal.targetId, newName);
      if (res.success) {
        toast.success('Đã đổi tên thư mục!');
        onRefresh();
      } else {
        toast.error(res.error || 'Lỗi đổi tên');
        setLocalFolders(folders);
      }
    } else if (promptModal.type === 'delete') {
      if (promptValue !== 'XOA') {
        toast.error('Vui lòng gõ XOA để xác nhận');
        return;
      }
      
      setPromptModal((prev) => ({ ...prev, isOpen: false }));
      const res = await deleteGrammarFolder(promptModal.targetId);
      if (res.success) {
        toast.success('Đã xóa thư mục và ngữ pháp bên trong!');
        if (selectedFolderId === promptModal.targetId) onSelectFolder('all');
        onRefresh();
      } else {
        toast.error(res.error || 'Lỗi khi xóa');
      }
    }
  };

  const renderNode = (node: any, depth = 0) => {
    const isExpanded = !!expandedFolders[node.id];
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const grammarCount = node._count?.folderGrammars || 0;

    return (
      <div key={node.id}>
        <div
          onClick={() => onSelectFolder(node.id)}
          className={`group flex items-center justify-between py-2 pr-2.5 rounded-xl transition-all cursor-pointer select-none border-b border-transparent mb-1
            ${isSelected 
              ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300 shadow-sm' 
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button
              onClick={(e) => hasChildren ? toggleExpand(node.id, e) : undefined}
              className={`p-1 rounded-md shrink-0 transition-colors ${hasChildren ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400' : 'opacity-0 cursor-default'}`}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <Folder className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className="text-[13px] font-semibold truncate leading-tight flex-1">{node.name}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              isSelected 
                ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {grammarCount}
            </span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuFolderId(activeMenuFolderId === node.id ? null : node.id);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  activeMenuFolderId === node.id
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100'
                }`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {activeMenuFolderId === node.id && (
                <div 
                  className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50 animate-fadeIn"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setActiveMenuFolderId(null);
                      openRenameModal(node.id, node.name);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    Đổi tên
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenuFolderId(null);
                      openDeleteModal(node.id, node.name);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa thư mục
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800/50" />
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalGrammars = folders.reduce((sum, f) => sum + (f._count?.folderGrammars || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div 
        onClick={() => onSelectFolder('all')}
        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
          selectedFolderId === 'all' 
            ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-300 shadow-sm' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${selectedFolderId === 'all' ? 'bg-violet-200 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400' : 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-500'}`}>
            <Folder className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold">Tất cả ngữ pháp</span>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          selectedFolderId === 'all'
            ? 'bg-violet-200 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {totalGrammars}
        </span>
      </div>

      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
        CÂY THƯ MỤC
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-20">
        {tree.length === 0 ? (
          <div className="p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có thư mục nào.</p>
          </div>
        ) : (
          tree.map(node => renderNode(node, 0))
        )}
      </div>

      {promptModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-slate-100 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  promptModal.type === 'delete' 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' 
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                }`}>
                  {promptModal.type === 'delete' ? <Trash2 className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {promptModal.type === 'delete' ? 'Xác nhận xóa' : 'Đổi tên thư mục'}
                </h3>
              </div>
            </div>

            <form onSubmit={handlePromptSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {promptModal.type === 'delete' 
                    ? `Nhập chữ "XOA" để xóa "${promptModal.targetName}"`
                    : 'Tên thư mục mới'
                  }
                </label>
                <input
                  ref={promptInputRef}
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={promptModal.type === 'delete' ? 'XOA' : 'Nhập tên mới...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none transition-all"
                />
              </div>

              {promptModal.type === 'delete' && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                    Hành động này sẽ xóa thư mục và <b className="font-bold">TOÀN BỘ ngữ pháp</b> bên trong. Không thể khôi phục!
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={promptModal.type === 'delete' ? promptValue !== 'XOA' : !promptValue.trim()}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-sm ${
                    promptModal.type === 'delete'
                      ? 'bg-rose-500 hover:bg-rose-600 disabled:opacity-50'
                      : 'bg-violet-500 hover:bg-violet-600 disabled:opacity-50'
                  }`}
                >
                  {promptModal.type === 'delete' ? 'Xóa vĩnh viễn' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
