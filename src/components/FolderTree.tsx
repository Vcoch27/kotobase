"use client";

import React, { useState, useMemo } from "react";
import { assignVocabularyToFolder } from "@/app/actions/vocabulary";
import { Folder, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { folderVocabularies: number };
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  onRefresh: () => void;
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onRefresh }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Build tree from flat list
  const tree = useMemo(() => {
    const map = new Map<string, any>();
    folders.forEach(f => map.set(f.id, { ...f, children: [] }));
    const root: any[] = [];
    
    map.forEach(node => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        root.push(node);
      }
    });
    return root;
  }, [folders]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault(); // Phải có để cho phép Drop
    if (dragOverFolderId !== folderId) setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const vocabId = e.dataTransfer.getData("vocabId");
    if (!vocabId) return;

    const res = await assignVocabularyToFolder(vocabId, targetFolderId);
    if (res.success) {
      onRefresh();
    } else {
      alert("Lỗi khi chuyển thư mục!");
    }
  };

  // Render recursive
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders[node.id];
      const isSelected = selectedFolderId === node.id;
      const hasChildren = node.children.length > 0;
      const isDragOver = dragOverFolderId === node.id;

      return (
        <div key={node.id} className="w-full">
          <div
            onClick={() => onSelectFolder(node.id)}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.id)}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            className={`flex items-center gap-2 py-1.5 pr-2 my-0.5 rounded-lg cursor-pointer transition-all ${
              isSelected ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30" : 
              isDragOver ? "bg-amber-500/20 border-2 border-dashed border-amber-500 text-amber-300" :
              "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent"
            }`}
          >
            <div 
              className={`w-4 h-4 flex items-center justify-center rounded-md shrink-0 ${hasChildren ? 'hover:bg-slate-700' : 'opacity-0'}`}
              onClick={(e) => hasChildren && toggleExpand(node.id, e)}
            >
              {hasChildren && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
            </div>
            
            <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-400" : isDragOver ? "text-amber-400" : "text-slate-500"}`} />
            
            <span className="text-xs truncate flex-1">{node.name}</span>
            <span className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded shrink-0">
              {node._count?.folderVocabularies || 0}
            </span>
          </div>
          
          {hasChildren && isExpanded && (
            <div className="w-full">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-full">
      <div 
        onClick={() => onSelectFolder("all")}
        className={`flex items-center gap-2 px-2 py-2 mb-2 rounded-lg cursor-pointer transition-all ${
          selectedFolderId === "all" ? "bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30" : "text-slate-400 hover:bg-slate-800 border border-transparent"
        }`}
      >
        <Folder className="w-4 h-4" />
        <span className="text-xs flex-1">Tất cả từ vựng</span>
        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
          {folders.reduce((acc, f) => acc + (f._count?.folderVocabularies || 0), 0)}
        </span>
      </div>
      
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
        Cây Thư Mục (Kéo thả vào đây)
      </div>
      
      {folders.length === 0 ? (
        <div className="text-xs text-slate-500 italic px-2">Chưa có thư mục nào.</div>
      ) : (
        <div className="custom-scrollbar overflow-y-auto max-h-[60vh] pr-1">
          {renderTree(tree)}
        </div>
      )}
    </div>
  );
}
