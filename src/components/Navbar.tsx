import React from 'react';
import { Sparkles, LogOut, Plus, BookOpen, Cloud, CloudOff, Loader2, TrendingUp } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: 'journal' | 'insights';
  onSelectTab: (tab: 'journal' | 'insights') => void;
  onSignOut: () => void;
  onNewEntry: () => void;
  entriesCount: number;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  toggleSidebar?: () => void;
  showSidebar?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onSignOut,
  onNewEntry,
  entriesCount,
  saveStatus,
  toggleSidebar,
  showSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#161618] border-b border-[#2A2A2E] text-[#E0E0E0] backdrop-blur-md bg-opacity-95 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Actions */}
        <div className="flex items-center space-x-4">
          {toggleSidebar && activeTab === 'journal' && (
            <button
              id="toggle-sidebar-btn"
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-lg text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#1A1A1D] border border-transparent hover:border-[#2A2A2E] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              title="Toggle Entries Sidebar"
              aria-label="Toggle Entries Sidebar"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onSelectTab('journal')}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-950/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-lg text-[#E0E0E0] tracking-tight">ReflectAI</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Gemini 3.6
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] font-sans hidden sm:block">Mindful Reflection & Cloud Journal</p>
            </div>
          </div>
        </div>

        {/* Center / Navigation Tabs & Sync Status */}
        {user && (
          <div className="flex items-center space-x-1 sm:space-x-2 bg-[#1A1A1D] p-1 rounded-xl border border-[#2A2A2E]">
            <button
              id="nav-tab-journal-btn"
              onClick={() => onSelectTab('journal')}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2E]/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              <span>Journal</span>
            </button>

            <button
              id="nav-tab-insights-btn"
              onClick={() => onSelectTab('insights')}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#2A2A2E]/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              <span>Insights</span>
              <span className="ml-1.5 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 rounded">
                Mood
              </span>
            </button>
          </div>
        )}

        {/* Right Actions & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Sync Status */}
          {user && (
            <div className="hidden xl:flex items-center space-x-2 text-xs">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center text-indigo-300 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-700/50 text-[11px]">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Syncing
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40 text-[11px]">
                  <Cloud className="w-3 h-3 mr-1" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-800/40 text-[11px]">
                  <CloudOff className="w-3 h-3 mr-1" />
                  Save Error
                </span>
              )}
            </div>
          )}

          {activeTab === 'journal' && (
            <button
              id="new-reflection-btn"
              onClick={onNewEntry}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-sm shadow-indigo-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">New Reflection</span>
              <span className="xs:hidden">New</span>
            </button>
          )}

          {user && (
            <div className="flex items-center pl-2 border-l border-[#2A2A2E] space-x-2">
              <div className="flex items-center space-x-2 bg-[#1A1A1D] px-2.5 py-1.5 rounded-lg border border-[#2A2A2E]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full border border-[#3A3A3F]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-[#E0E0E0] font-medium max-w-[100px] truncate hidden md:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#E0E0E0] hover:bg-[#1A1A1D] border border-transparent hover:border-[#2A2A2E] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

