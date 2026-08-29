import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithGoogle,
  logOut,
  subscribeToAuthState,
  subscribeToUserEntries,
  saveJournalEntry,
  deleteJournalEntry,
  toggleEntryFavorite,
} from './lib/firebase';
import type { JournalEntry, UserProfile, ReflectionMode } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { ReflectionEditor } from './components/ReflectionEditor';
import { InsightsDashboard } from './components/InsightsDashboard';
import { Loader2, Sparkles } from 'lucide-react';

function createNewEntry(userId: string): JournalEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: 'Mindful Morning Reflection',
    content: '',
    mode: 'deep_reflection',
    tags: ['mindfulness', 'journal'],
    mood: 'Reflective',
    sentimentScore: 7,
    themes: ['mindfulness', 'reflection'],
    isFavorite: false,
    messages: [],
    summary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'journal' | 'insights'>('journal');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to user's real-time entries from Firestore
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setActiveEntry(null);
      setSelectedEntryId(null);
      return;
    }

    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);

        // If no active entry selected, select the latest or create a new draft
        if (!selectedEntryId) {
          if (fetchedEntries.length > 0) {
            setSelectedEntryId(fetchedEntries[0].id);
            setActiveEntry(fetchedEntries[0]);
          } else {
            const initial = createNewEntry(user.uid);
            setActiveEntry(initial);
            setSelectedEntryId(initial.id);
            // Save initial entry
            saveJournalEntry(user.uid, initial).catch((err) =>
              console.error('Initial entry save error:', err)
            );
          }
        } else {
          // Keep active entry synchronized if it exists in fetched list
          const current = fetchedEntries.find((e) => e.id === selectedEntryId);
          if (current && (!activeEntry || current.updatedAt > activeEntry.updatedAt)) {
            setActiveEntry(current);
          }
        }
      },
      (error) => {
        console.error('Firestore entries subscription error:', error);
        setSaveStatus('error');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setIsLoggingIn(true);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error?.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Auto-Save / Debounced Save to Firestore
  const triggerAutoSave = useCallback(
    (entryToSave: JournalEntry) => {
      if (!user) return;
      setSaveStatus('saving');

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveJournalEntry(user.uid, entryToSave);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
          console.error('Failed to save journal entry to Firestore:', error);
          setSaveStatus('error');
        }
      }, 1000);
    },
    [user]
  );

  // Update active entry state
  const handleUpdateEntry = (updated: JournalEntry) => {
    setActiveEntry(updated);
    // Optimistically update list
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
    triggerAutoSave(updated);
  };

  // Manual save handler
  const handleManualSave = async () => {
    if (!user || !activeEntry) return;
    try {
      setSaveStatus('saving');
      await saveJournalEntry(user.uid, activeEntry);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('error');
    }
  };

  // Create a new reflection entry
  const handleNewEntry = async () => {
    if (!user) return;
    const newEntry = createNewEntry(user.uid);
    setActiveEntry(newEntry);
    setSelectedEntryId(newEntry.id);
    setActiveTab('journal');
    setEntries((prev) => [newEntry, ...prev]);

    try {
      setSaveStatus('saving');
      await saveJournalEntry(user.uid, newEntry);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (error) {
      console.error('Failed to create new entry in Firestore:', error);
      setSaveStatus('error');
    }
  };

  // Select an existing entry
  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    const found = entries.find((e) => e.id === entryId);
    if (found) {
      setActiveEntry(found);
    }
    setShowMobileSidebar(false);
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);

      if (selectedEntryId === entryId) {
        if (remaining.length > 0) {
          setSelectedEntryId(remaining[0].id);
          setActiveEntry(remaining[0]);
        } else {
          handleNewEntry();
        }
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (entryId: string, isFav: boolean) => {
    if (!user) return;
    try {
      await toggleEntryFavorite(user.uid, entryId, isFav);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, isFavorite: isFav } : e))
      );
      if (activeEntry && activeEntry.id === entryId) {
        setActiveEntry({ ...activeEntry, isFavorite: isFav });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Initial Auth Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center text-[#E0E0E0]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#9CA3AF]">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Verifying authentication status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0F10] text-[#E0E0E0] font-sans">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        entriesCount={entries.length}
        saveStatus={saveStatus}
        toggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
        showSidebar={showMobileSidebar}
      />

      {/* Main View: Landing or Dashboard */}
      {!user ? (
        <LandingPage
          onSignIn={handleGoogleSignIn}
          isLoading={isLoggingIn}
          authError={authError}
          onClearAuthError={() => setAuthError(null)}
        />
      ) : activeTab === 'insights' ? (
        <main className="flex-1 flex overflow-hidden relative">
          <InsightsDashboard
            entries={entries}
            onSelectEntry={(entryId) => {
              handleSelectEntry(entryId);
              setActiveTab('journal');
            }}
            onNewEntry={handleNewEntry}
          />
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden relative">
          {/* Desktop & Mobile Sidebar */}
          <div
            className={`fixed inset-y-16 left-0 z-20 w-80 md:static md:w-80 lg:w-96 transition-transform duration-300 transform ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <Sidebar
              entries={entries}
              selectedEntryId={selectedEntryId}
              onSelectEntry={handleSelectEntry}
              onNewEntry={handleNewEntry}
              onDeleteEntry={handleDeleteEntry}
              onToggleFavorite={handleToggleFavorite}
              onCloseMobile={() => setShowMobileSidebar(false)}
            />
          </div>

          {/* Backdrop for mobile sidebar */}
          {showMobileSidebar && (
            <div
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 z-10 bg-black/60 backdrop-blur-xs md:hidden"
            />
          )}

          {/* Main Workspace */}
          {activeEntry ? (
            <ReflectionEditor
              entry={activeEntry}
              onUpdateEntry={handleUpdateEntry}
              onManualSave={handleManualSave}
              saveStatus={saveStatus}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9CA3AF]">
              <Sparkles className="w-8 h-8 text-indigo-400 mb-3" />
              <p className="text-base font-serif font-bold text-[#E0E0E0]">No Reflection Selected</p>
              <button
                onClick={handleNewEntry}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm shadow-indigo-950/40"
              >
                Create New Reflection
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

