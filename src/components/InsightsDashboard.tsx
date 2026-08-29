import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  Smile,
  Hash,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  BookOpen,
  Info,
  Heart,
  Zap,
  CheckCircle2,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { JournalEntry } from '../types';
import { generateWeeklyPatternSummary } from '../lib/geminiClient';

interface InsightsDashboardProps {
  entries: JournalEntry[];
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // 1. Prepare Sentiment Timeline Data (last 30 entries, sorted chronologically ascending)
  const sentimentTimeline = useMemo(() => {
    // Sort entries chronologically for time-series visualization
    const sorted = [...entries]
      .filter((e) => e.createdAt || e.updatedAt)
      .sort((a, b) => new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime());

    // Take last 30 entries
    const slice = sorted.slice(-30);

    return slice.map((entry, index) => {
      const dateObj = new Date(entry.createdAt || entry.updatedAt);
      const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const score = typeof entry.sentimentScore === 'number' ? entry.sentimentScore : 6;
      const mood = entry.mood || 'Reflective';
      const title = entry.title || 'Untitled Entry';

      return {
        id: entry.id,
        name: formattedDate,
        fullDate: dateObj.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
        sentiment: score,
        mood,
        title,
        themes: entry.themes || [],
        index: index + 1,
      };
    });
  }, [entries]);

  // 2. High-level Statistics
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        total: 0,
        avgSentiment: 0,
        topMood: 'N/A',
        totalThemes: 0,
      };
    }

    const scoredEntries = entries.filter((e) => typeof e.sentimentScore === 'number');
    const avg = scoredEntries.length > 0
      ? (scoredEntries.reduce((sum, e) => sum + (e.sentimentScore || 0), 0) / scoredEntries.length).toFixed(1)
      : '7.0';

    // Calculate dominant mood
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });

    let topMood = 'Reflective';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topMood = mood;
      }
    });

    // Unique themes count
    const uniqueThemes = new Set<string>();
    entries.forEach((e) => {
      if (Array.isArray(e.themes)) {
        e.themes.forEach((t) => uniqueThemes.add(t.toLowerCase().trim()));
      }
    });

    return {
      total: entries.length,
      avgSentiment: avg,
      topMood,
      totalThemes: uniqueThemes.size,
    };
  }, [entries]);

  // 3. Most frequent themes this month
  const monthlyThemes = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const themeCounts: Record<string, number> = {};

    entries.forEach((entry) => {
      const entryDate = new Date(entry.createdAt || entry.updatedAt);
      if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        if (Array.isArray(entry.themes)) {
          entry.themes.forEach((t) => {
            const clean = t.trim().toLowerCase();
            if (clean) {
              themeCounts[clean] = (themeCounts[clean] || 0) + 1;
            }
          });
        }
      }
    });

    // If no themes found for this exact month, fallback to all entries themes
    if (Object.keys(themeCounts).length === 0) {
      entries.forEach((entry) => {
        if (Array.isArray(entry.themes)) {
          entry.themes.forEach((t) => {
            const clean = t.trim().toLowerCase();
            if (clean) {
              themeCounts[clean] = (themeCounts[clean] || 0) + 1;
            }
          });
        }
      });
    }

    const sortedThemes = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count);

    const maxCount = sortedThemes.length > 0 ? sortedThemes[0].count : 1;

    return sortedThemes.slice(0, 8).map((item) => ({
      ...item,
      percentage: Math.round((item.count / maxCount) * 100),
    }));
  }, [entries]);

  // 4. Mood Distribution
  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const moodName = e.mood || 'Reflective';
      counts[moodName] = (counts[moodName] || 0) + 1;
    });

    const total = entries.length || 1;
    return Object.entries(counts)
      .map(([mood, count]) => ({
        mood,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [entries]);

  // 5. Generate Weekly Summary Handler
  const handleGenerateWeeklySummary = async () => {
    if (entries.length === 0) {
      setWeeklyError('Write at least 1 reflection entry to generate pattern insights.');
      return;
    }

    try {
      setIsGeneratingWeekly(true);
      setWeeklyError(null);

      // Extract last 7 entries structured mood and theme data (NOT raw content)
      const last7 = [...entries]
        .sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime())
        .slice(0, 7)
        .map((e) => ({
          date: new Date(e.createdAt || e.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          mood: e.mood || 'Reflective',
          sentimentScore: typeof e.sentimentScore === 'number' ? e.sentimentScore : 6,
          themes: e.themes || (e.tags ? e.tags.slice(0, 3) : ['reflection']),
        }));

      const summary = await generateWeeklyPatternSummary({ entries: last7 });
      setWeeklySummary(summary);
      setLastGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Error generating weekly summary:', err);
      setWeeklyError(err.message || 'Failed to generate weekly pattern summary.');
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#0F0F10] text-[#E0E0E0] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2E] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#E0E0E0] tracking-tight">
              Mood & Thematic Insights
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1.5 max-w-2xl leading-relaxed">
            AI-extracted sentiment trajectories, recurring emotional themes, and weekly cognitive pattern syntheses from your private journal entries.
          </p>
        </div>

        <button
          id="insights-new-entry-btn"
          onClick={onNewEntry}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-950/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 self-start sm:self-auto"
        >
          <BookOpen className="w-4 h-4 mr-1.5" />
          <span>New Journal Reflection</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Entries */}
        <div className="bg-[#161618] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span className="text-xs font-medium">Reflections</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#E0E0E0] font-serif">{stats.total}</span>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Isolated in Firestore</p>
          </div>
        </div>

        {/* Average Sentiment */}
        <div className="bg-[#161618] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span className="text-xs font-medium">Avg Sentiment</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-[#E0E0E0] font-serif">{stats.avgSentiment}</span>
              <span className="text-xs text-[#9CA3AF]">/ 10</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-0.5">
              {Number(stats.avgSentiment) >= 7 ? 'Positive & Thriving' : Number(stats.avgSentiment) >= 5 ? 'Balanced / Neutral' : 'Reflective / Growth'}
            </p>
          </div>
        </div>

        {/* Primary Mood */}
        <div className="bg-[#161618] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span className="text-xs font-medium">Dominant Mood</span>
            <Smile className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-[#E0E0E0] font-serif capitalize truncate block">
              {stats.topMood}
            </span>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Primary emotional baseline</p>
          </div>
        </div>

        {/* Themes Extracted */}
        <div className="bg-[#161618] border border-[#2A2A2E] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span className="text-xs font-medium">Unique Themes</span>
            <Hash className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-[#E0E0E0] font-serif">{stats.totalThemes}</span>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Cognitive topics logged</p>
          </div>
        </div>
      </div>

      {/* Weekly Pattern Summary Card (AI Generated) */}
      <div className="bg-[#161618] border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-md shadow-indigo-950/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2E]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-serif font-bold text-[#E0E0E0]">
                Weekly Cognitive Pattern Analysis
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Synthesizes structured mood & theme markers across your last 7 entries
              </p>
            </div>
          </div>

          <button
            id="generate-weekly-summary-btn"
            onClick={handleGenerateWeeklySummary}
            disabled={isGeneratingWeekly || entries.length === 0}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#2A2A2E] disabled:text-[#6B7280] text-white font-bold text-xs transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-98"
          >
            {isGeneratingWeekly ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Generate Weekly Summary</span>
              </>
            )}
          </button>
        </div>

        {/* Summary Content Body */}
        <div className="mt-4">
          {weeklyError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{weeklyError}</span>
            </div>
          )}

          {weeklySummary ? (
            <div className="bg-[#1A1A1D] border border-[#2A2A2E] rounded-xl p-4 sm:p-5 relative">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0 animate-ping" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-[#E0E0E0] leading-relaxed font-sans font-medium">
                    {weeklySummary}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280] border-t border-[#2A2A2E]/80 pt-2.5">
                    <span className="flex items-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1" />
                      Generated with Gemini 3.6 Flash
                    </span>
                    {lastGeneratedAt && <span>Generated at {lastGeneratedAt}</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[#9CA3AF]">
              <Sparkles className="w-6 h-6 text-indigo-400/60 mx-auto mb-2" />
              <p className="text-xs font-medium text-[#E0E0E0]">No weekly synthesis generated yet</p>
              <p className="text-[11px] text-[#6B7280] mt-1 max-w-md mx-auto">
                Click "Generate Weekly Summary" above to have Gemini review your recent mood and thematic trends.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts & Themes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sentiment Score Timeline (Recharts) */}
        <div className="lg:col-span-2 bg-[#161618] border border-[#2A2A2E] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#E0E0E0]">
                  Sentiment Trajectory (Last 30 Entries)
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Tracks sentiment score scale (1-10) across your sequential journal reflections
                </p>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-[#9CA3AF]">
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block mr-1.5" />
                  Sentiment
                </span>
                <span className="flex items-center">
                  <span className="w-2.5 h-0.5 bg-gray-500 inline-block mr-1.5 border-t border-dashed" />
                  Neutral (5.0)
                </span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="mt-6 h-64 sm:h-72 w-full">
              {sentimentTimeline.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#6B7280]">
                  <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">No sentiment records yet. Create reflections to populate the trajectory chart.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#6B7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#2A2A2E' }}
                    />
                    <YAxis
                      domain={[1, 10]}
                      ticks={[2, 4, 6, 8, 10]}
                      stroke="#6B7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#2A2A2E' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#1A1A1D] border border-[#2A2A2E] p-3 rounded-xl shadow-xl text-xs text-[#E0E0E0] max-w-xs">
                              <p className="font-serif font-bold text-indigo-300">{data.title}</p>
                              <p className="text-[10px] text-[#9CA3AF] mt-0.5">{data.fullDate}</p>
                              <div className="mt-2 flex items-center justify-between border-t border-[#2A2A2E] pt-2">
                                <span className="text-[#9CA3AF]">Sentiment Score:</span>
                                <span className="font-bold text-white bg-indigo-600/30 px-2 py-0.5 rounded text-[11px] border border-indigo-500/30">
                                  {data.sentiment} / 10
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[#9CA3AF]">Mood:</span>
                                <span className="capitalize text-amber-300 font-medium">{data.mood}</span>
                              </div>
                              {data.themes && data.themes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {data.themes.map((t: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] bg-[#2A2A2E] text-[#A0A0A0] px-1.5 py-0.5 rounded"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={5} stroke="#4B5563" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="sentiment"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#161618' }}
                      activeDot={{ r: 6, fill: '#818CF8', strokeWidth: 2, stroke: '#FFFFFF' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-[#6B7280] flex items-center justify-between border-t border-[#2A2A2E] pt-3">
            <span>Scale: 1 (Distressed) to 10 (Joyful / Energized)</span>
            <span>{sentimentTimeline.length} data points logged</span>
          </div>
        </div>

        {/* Right Col: Most Frequent Themes This Month */}
        <div className="bg-[#161618] border border-[#2A2A2E] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#E0E0E0]">
                  Frequent Themes This Month
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Top recurring topics extracted from reflections
                </p>
              </div>
              <Hash className="w-4 h-4 text-sky-400" />
            </div>

            {/* Themes List */}
            <div className="mt-5 space-y-3.5">
              {monthlyThemes.length === 0 ? (
                <div className="py-12 text-center text-[#6B7280]">
                  <Hash className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No themes logged yet this month.</p>
                </div>
              ) : (
                monthlyThemes.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#E0E0E0] capitalize flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2" />
                        {item.theme}
                      </span>
                      <span className="text-[#9CA3AF] font-mono text-[11px]">
                        {item.count} {item.count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#1A1A1D] h-1.5 rounded-full overflow-hidden border border-[#2A2A2E]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mood Breakdown Summary */}
          <div className="mt-6 pt-4 border-t border-[#2A2A2E]">
            <h4 className="text-xs font-serif font-bold text-[#E0E0E0] mb-2.5 flex items-center">
              <Smile className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              Mood Tone Spectrum
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {moodDistribution.map((m, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[10px] bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] px-2 py-1 rounded-lg"
                >
                  <span className="font-medium text-[#E0E0E0] mr-1">{m.mood}:</span>
                  <span className="text-indigo-400">{m.percent}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Entries Mood Log */}
      <div className="bg-[#161618] border border-[#2A2A2E] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
          <div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#E0E0E0]">
              Recent Reflections & Insights Log
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Click any reflection to open and continue your mindful inquiry
            </p>
          </div>
          <span className="text-xs text-[#9CA3AF] bg-[#1A1A1D] border border-[#2A2A2E] px-2.5 py-1 rounded-lg">
            Showing {Math.min(entries.length, 10)} of {entries.length}
          </span>
        </div>

        <div className="mt-4 divide-y divide-[#2A2A2E]/60">
          {entries.length === 0 ? (
            <div className="py-8 text-center text-[#6B7280]">
              <p className="text-xs">No reflections created yet.</p>
            </div>
          ) : (
            entries.slice(0, 10).map((entry) => {
              const score = typeof entry.sentimentScore === 'number' ? entry.sentimentScore : 6;
              const dateStr = new Date(entry.createdAt || entry.updatedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1A1A1D]/60 rounded-xl px-2.5 transition-colors cursor-pointer group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#E0E0E0] group-hover:text-indigo-300 font-serif truncate">
                        {entry.title || 'Untitled Reflection'}
                      </h4>
                      <span className="text-[10px] text-[#6B7280] shrink-0 font-sans">{dateStr}</span>
                    </div>

                    {/* Themes list */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {entry.mood && (
                        <span className="text-[10px] bg-amber-950/40 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded-md font-medium">
                          {entry.mood}
                        </span>
                      )}
                      {entry.themes &&
                        entry.themes.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-[#1A1A1D] text-[#9CA3AF] border border-[#2A2A2E] px-1.5 py-0.5 rounded"
                          >
                            #{t}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Sentiment Score Badge & Action */}
                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-[#E0E0E0] flex items-center">
                        <span
                          className={`w-2 h-2 rounded-full mr-1.5 ${
                            score >= 8 ? 'bg-emerald-400' : score >= 5 ? 'bg-indigo-400' : 'bg-amber-400'
                          }`}
                        />
                        {score} / 10
                      </div>
                      <span className="text-[9px] text-[#6B7280] uppercase tracking-wider">Score</span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#E0E0E0] transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
