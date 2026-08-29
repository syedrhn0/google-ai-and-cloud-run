import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Trash2,
  Plus,
  Sparkles,
  Calendar,
  MessageSquare,
  Filter,
  X,
  Compass,
  Lightbulb,
  HeartHandshake,
  Target,
  PenTool,
} from 'lucide-react';
import type { JournalEntry, ReflectionMode } from '../types';

interface SidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  onToggleFavorite: (entryId: string, isFav: boolean) => void;
  onCloseMobile?: () => void;
}

const MODE_LABELS: Record<ReflectionMode, { label: string; icon: any; color: string }> = {
  deep_reflection: { label: 'Deep Reflection', icon: Compass, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/50' },
  brainstorming: { label: 'Brainstorming', icon: Lightbulb, color: 'text-amber-400 bg-amber-950/60 border-amber-800/50' },
  gratitude: { label: 'Gratitude', icon: HeartHandshake, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50' },
  problem_solving: { label: 'Problem Solving', icon: Target, color: 'text-sky-400 bg-sky-950/60 border-sky-800/50' },
  freeform: { label: 'Freeform', icon: PenTool, color: 'text-[#A0A0A0] bg-[#1A1A1D] border-[#2A2A2E]' },
};

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  onToggleFavorite,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'favorites' | ReflectionMode>('all');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Filter entries based on search and selected mode/favorites
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.tags && entry.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      if (selectedFilter === 'favorites') return Boolean(entry.isFavorite);
      if (selectedFilter === 'all') return true;
      return entry.mode === selectedFilter;
    });
  }, [entries, searchQuery, selectedFilter]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-[#161618] border-r border-[#2A2A2E] text-[#E0E0E0] select-none">
      {/* Header & New Entry */}
      <div className="p-4 border-b border-[#2A2A2E] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="font-serif font-bold text-sm text-[#E0E0E0]">Reflection History</span>
            <span className="text-xs text-[#9CA3AF] bg-[#1A1A1D] border border-[#2A2A2E] px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-[#9CA3AF] hover:text-[#E0E0E0] rounded-lg hover:bg-[#1A1A1D] border border-transparent hover:border-[#2A2A2E] cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          id="sidebar-new-entry-btn"
          onClick={() => {
            onNewEntry();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Journal Reflection</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#6B7280]" />
          <input
            id="search-entries-input"
            type="text"
            placeholder="Search entries, keywords, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[#1A1A1D] border border-[#2A2A2E] rounded-lg text-xs text-[#E0E0E0] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#9CA3AF] hover:text-[#E0E0E0]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedFilter('favorites')}
            className={`inline-flex items-center px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedFilter === 'favorites'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0]'
            }`}
          >
            <Star className="w-3 h-3 mr-1 fill-current text-amber-400" />
            Favorites
          </button>
          <button
            onClick={() => setSelectedFilter('deep_reflection')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedFilter === 'deep_reflection'
                ? 'bg-indigo-500 text-white font-bold'
                : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0]'
            }`}
          >
            Deep
          </button>
          <button
            onClick={() => setSelectedFilter('brainstorming')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedFilter === 'brainstorming'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0]'
            }`}
          >
            Ideas
          </button>
          <button
            onClick={() => setSelectedFilter('gratitude')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedFilter === 'gratitude'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0]'
            }`}
          >
            Gratitude
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2E]/60 p-2 space-y-1">
        {filteredEntries.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center text-[#6B7280] mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400/70" />
            </div>
            <p className="text-sm font-medium text-[#E0E0E0]">No reflections found</p>
            <p className="text-xs text-[#9CA3AF] mt-1 max-w-[200px] mx-auto">
              {searchQuery ? 'Try adjusting your search query' : 'Start your first mindful dialogue with Gemini'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const modeConfig = MODE_LABELS[entry.mode] || MODE_LABELS.deep_reflection;
            const ModeIcon = modeConfig.icon;

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => {
                  onSelectEntry(entry.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group relative p-3 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1A1A1D] border border-indigo-500/40 shadow-sm'
                    : 'hover:bg-[#1A1A1D]/60 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#E0E0E0] line-clamp-1 flex-1 font-serif">
                    {entry.title || 'Untitled Reflection'}
                  </h4>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(entry.id, !entry.isFavorite);
                      }}
                      className={`p-1 rounded hover:bg-[#2A2A2E] transition-colors ${
                        entry.isFavorite ? 'text-amber-400' : 'text-[#6B7280] hover:text-[#E0E0E0]'
                      }`}
                      title={entry.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    >
                      <Star className={`w-3.5 h-3.5 ${entry.isFavorite ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry.id);
                      }}
                      className="p-1 rounded text-[#6B7280] hover:text-rose-400 hover:bg-[#2A2A2E] transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Snippet */}
                <p className="text-[11px] text-[#9CA3AF] line-clamp-2 mt-1 leading-relaxed">
                  {entry.content || (entry.messages && entry.messages[0]?.content) || 'Empty reflection...'}
                </p>

                {/* Footer Metadata */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#6B7280]">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] border font-medium ${modeConfig.color}`}>
                      <ModeIcon className="w-2.5 h-2.5 mr-1" />
                      {modeConfig.label}
                    </span>

                    {entry.messages && entry.messages.length > 0 && (
                      <span className="inline-flex items-center text-[#9CA3AF]">
                        <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                        {entry.messages.length}
                      </span>
                    )}
                  </div>

                  <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1D] border border-[#2A2A2E] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-[#E0E0E0]">
            <h3 className="text-base font-serif font-bold text-[#E0E0E0]">Delete this reflection?</h3>
            <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
              This action cannot be undone. This entry will be permanently deleted from your private Cloud Firestore storage.
            </p>
            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3 py-1.5 text-xs rounded-lg text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2E] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-entry-btn"
                onClick={() => {
                  if (entryToDelete) {
                    onDeleteEntry(entryToDelete);
                    setEntryToDelete(null);
                  }
                }}
                className="px-3.5 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shadow-sm transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
