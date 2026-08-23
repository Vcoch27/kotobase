'use client';

import React, { useState, useMemo } from 'react';
import { Folder, Check, Search, X, ChevronDown, ChevronRight, Layers, Tag } from 'lucide-react';
import { getFolderFullPath } from '@/lib/folder-utils';

interface FolderItem {
  id: string;
  name: string;
  parentId?: string | null;
}

interface FolderSelectorProps {
  folders: FolderItem[];
  selectedFolderIds: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
}

export function FolderSelector({
  folders,
  selectedFolderIds,
  onChange,
  multiple = true,
}: FolderSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Natural numeric sort helper (e.g. Unit 1, Unit 2, ..., Unit 10, Unit 11)
  const naturalSort = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  // Nhóm các thư mục theo Parent
  const folderGroups = useMemo(() => {
    if (!folders || folders.length === 0) return [];

    const folderMap = new Map<string, FolderItem>();
    folders.forEach(f => folderMap.set(f.id, f));

    // Tìm các thư mục gốc (không có parentId hoặc parentId không tồn tại)
    const roots = folders.filter(f => !f.parentId || !folderMap.has(f.parentId));
    roots.sort((a, b) => naturalSort(a.name, b.name));

    return roots.map(root => {
      const children = folders.filter(f => f.parentId === root.id);
      children.sort((a, b) => naturalSort(a.name, b.name));
      return {
        root,
        children,
      };
    });
  }, [folders]);

  // Toggle chọn thư mục
  const handleToggle = (id: string) => {
    if (!multiple) {
      onChange(selectedFolderIds.includes(id) ? [] : [id]);
      return;
    }
    if (selectedFolderIds.includes(id)) {
      onChange(selectedFolderIds.filter(item => item !== id));
    } else {
      onChange([...selectedFolderIds, id]);
    }
  };

  // Danh sách các folder đã chọn để hiển thị Tag chip
  const selectedFolders = useMemo(() => {
    return folders.filter(f => selectedFolderIds.includes(f.id));
  }, [folders, selectedFolderIds]);

  // Lọc theo search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return folderGroups;
    const q = searchQuery.toLowerCase().trim();

    return folderGroups
      .map(group => {
        const rootMatches = group.root.name.toLowerCase().includes(q);
        const matchingChildren = group.children.filter(c =>
          c.name.toLowerCase().includes(q)
        );

        if (rootMatches) {
          return group;
        }
        if (matchingChildren.length > 0) {
          return {
            ...group,
            children: matchingChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof folderGroups;
  }, [folderGroups, searchQuery]);

  if (folders.length === 0) return null;

  return (
    <div className="space-y-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 p-3.5 border border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 select-none">
          <Folder className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <span>Chọn Thư mục (Playlist / Tag)</span>
          {selectedFolderIds.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              {selectedFolderIds.length} đã chọn
            </span>
          )}
        </label>

        <div className="flex items-center gap-2">
          {selectedFolderIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline transition-colors"
            >
              Bỏ chọn tất cả
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
            title={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Selected Tags Preview */}
      {selectedFolders.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
          {selectedFolders.map(f => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 animate-fadeIn"
            >
              <Folder className="w-3 h-3 opacity-80" />
              <span>{getFolderFullPath(f, folders)}</span>
              <button
                type="button"
                onClick={() => handleToggle(f.id)}
                className="p-0.5 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Gỡ thư mục này"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Expandable Selector Body */}
      {isExpanded && (
        <div className="space-y-3 pt-1 animate-fadeIn">
          {/* Quick Search */}
          {folders.length > 6 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh thư mục (VD: Unit 1, N3, TNCN4...)"
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-1.5 top-1/2 -translate-y-1/2 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Grouped Folder Grid */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {filteredGroups.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                Không tìm thấy thư mục phù hợp với "{searchQuery}"
              </p>
            ) : (
              filteredGroups.map(group => {
                const isRootSelected = selectedFolderIds.includes(group.root.id);
                const hasChildren = group.children.length > 0;

                return (
                  <div
                    key={group.root.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm space-y-2 transition-all"
                  >
                    {/* Root Folder Header / Item */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(group.root.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-left ${
                          isRootSelected
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Folder className={`w-3.5 h-3.5 shrink-0 ${isRootSelected ? 'text-white' : 'text-indigo-500'}`} />
                        <span>{group.root.name}</span>
                        {isRootSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>

                      {hasChildren && (
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {group.children.length} mục con
                        </span>
                      )}
                    </div>

                    {/* Children Items */}
                    {hasChildren && (
                      <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-indigo-100 dark:border-slate-800 ml-2">
                        {group.children.map(child => {
                          const isChildSelected = selectedFolderIds.includes(child.id);
                          return (
                            <button
                              type="button"
                              key={child.id}
                              onClick={() => handleToggle(child.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                isChildSelected
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {isChildSelected && <Check className="w-3 h-3 text-white" />}
                              <span>{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
