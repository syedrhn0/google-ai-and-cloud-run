import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Loader2,
  Bookmark,
  Share2,
  Wand2,
  FileText,
  HelpCircle,
  Lightbulb,
  Compass,
  HeartHandshake,
  Target,
  PenTool,
  Check,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ChevronDown,
} from 'lucide-react';
import Markdown from 'react-markdown';
import type { JournalEntry, ChatMessage, ReflectionMode, ReflectionSummary } from '../types';
import { sendReflectionPrompt, generateEntrySummary, suggestTitleAndTags } from '../lib/geminiClient';
import { SummaryCard } from './SummaryCard';

interface ReflectionEditorProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => void;
  onManualSave: () => void;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
}

const MODES: Array<{ id: ReflectionMode; label: string; icon: any; desc: string }> = [
  { id: 'deep_reflection', label: 'Deep Reflection', icon: Compass, desc: 'Uncover patterns, self-inquiry & cognitive reframing' },
  { id: 'brainstorming', label: 'Brainstorming', icon: Lightbulb, desc: 'Explore creative ideas, diverge & connect concepts' },
  { id: 'gratitude', label: 'Gratitude & Joy', icon: HeartHandshake, desc: 'Ground in appreciation & positive reinforcement' },
  { id: 'problem_solving', label: 'Problem Solving', icon: Target, desc: 'Deconstruct obstacles into clear micro-steps' },
  { id: 'freeform', label: 'Freeform Journal', icon: PenTool, desc: 'Unstructured stream of consciousness writing' },
];

const SUGGESTED_PROMPTS: Record<ReflectionMode, string[]> = {
  deep_reflection: [
    'What underlying assumption might I be making here?',
    'How would a compassionate friend view this situation?',
    'What is this moment trying to teach me about my values?',
    'Can you help me reframe this feeling into an opportunity for growth?',
  ],
  brainstorming: [
    'What are 3 wild, unconventional angles to approach this?',
    'How could I combine these concepts into a concrete project?',
    'What would the simplest 10x version of this look like?',
  ],
  gratitude: [
    'What are 3 subtle sensory details I am thankful for today?',
    'Who is someone that made an unexpected positive difference?',
    'How can I carry this appreciation into the rest of my week?',
  ],
  problem_solving: [
    'What is the root cause vs the symptom in this challenge?',
    'What are 2 low-effort, high-leverage micro actions I can take today?',
    'What is the worst case, and how would I handle it calmly?',
  ],
  freeform: [
    'Reflect back the main emotional threads in what I just wrote.',
    'What questions should I ask myself next to gain clarity?',
    'Summarize my core realizations so far.',
  ],
};

export const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  entry,
  onUpdateEntry,
  onManualSave,
  saveStatus,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingMeta, setIsSuggestingMeta] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGeneratingReply]);

  // Handle Mode Change
  const handleModeChange = (mode: ReflectionMode) => {
    onUpdateEntry({
      ...entry,
      mode,
    });
  };

  // Handle Title Change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateEntry({
      ...entry,
      title: e.target.value,
    });
  };

  // Handle Main Content Change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateEntry({
      ...entry,
      content: e.target.value,
    });
  };

  // Auto-Suggest Title and Tags
  const handleSuggestMeta = async () => {
    const textToAnalyze = entry.content || (entry.messages.length > 0 ? entry.messages.map((m) => m.content).join(' ') : '');
    if (!textToAnalyze.trim()) {
      setErrorMessage('Please write some content or dialogue before generating title and tags.');
      return;
    }

    try {
      setIsSuggestingMeta(true);
      setErrorMessage(null);
      const res = await suggestTitleAndTags(textToAnalyze);
      onUpdateEntry({
        ...entry,
        title: res.title || entry.title,
        tags: Array.from(new Set([...(entry.tags || []), ...(res.tags || [])])),
      });
    } catch (err: any) {
      console.error('Error suggesting title:', err);
      setErrorMessage(err.message || 'Failed to generate title and tags.');
    } finally {
      setIsSuggestingMeta(false);
    }
  };

  // Send Multi-turn Prompt to Gemini
  const handleSendPrompt = async (customPrompt?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || isGeneratingReply) return;

    setErrorMessage(null);
    const userMsgId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    // Optimistically update conversation
    const updatedMessages = [...(entry.messages || []), userMessage];
    onUpdateEntry({
      ...entry,
      messages: updatedMessages,
    });

    if (!customPrompt) {
      setPromptInput('');
    }

    try {
      setIsGeneratingReply(true);

      // Build history for backend
      const history = (entry.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Include journal content in context if available
      let contextualPrompt = textToSend;
      if (entry.content && (!entry.messages || entry.messages.length === 0)) {
        contextualPrompt = `Journal Notes:\n"${entry.content}"\n\nReflection Question/Prompt: ${textToSend}`;
      }

      const response = await sendReflectionPrompt({
        prompt: contextualPrompt,
        history,
        mode: entry.mode,
        title: entry.title,
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: response.reply || response.reflection,
        timestamp: response.timestamp || new Date().toISOString(),
        modelUsed: response.modelUsed,
      };

      onUpdateEntry({
        ...entry,
        messages: [...updatedMessages, assistantMessage],
        mood: response.mood || entry.mood,
        sentimentScore: typeof response.sentimentScore === 'number' ? response.sentimentScore : entry.sentimentScore,
        themes: response.themes && response.themes.length > 0 ? response.themes : entry.themes,
      });
    } catch (err: any) {
      console.error('Failed to generate reflection:', err);
      setErrorMessage(err.message || 'Error communicating with Gemini. Please try again.');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Trigger AI Summarization
  const handleGenerateSummary = async () => {
    if (!entry.content.trim() && (!entry.messages || entry.messages.length === 0)) {
      setErrorMessage('Write some journal thoughts or chat with Gemini before summarizing.');
      return;
    }

    try {
      setIsSummarizing(true);
      setErrorMessage(null);

      const summary = await generateEntrySummary({
        entryText: entry.content,
        messages: entry.messages || [],
        title: entry.title,
      });

      onUpdateEntry({
        ...entry,
        summary,
      });
    } catch (err: any) {
      console.error('Failed to summarize:', err);
      setErrorMessage(err.message || 'Error generating summary with Gemini.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Export / Copy to Clipboard
  const handleExportMarkdown = () => {
    let md = `# ${entry.title || 'Untitled Reflection'}\n\n`;
    md += `**Date:** ${new Date(entry.createdAt).toLocaleString()}\n`;
    md += `**Mode:** ${entry.mode}\n`;
    if (entry.tags && entry.tags.length > 0) {
      md += `**Tags:** ${entry.tags.join(', ')}\n`;
    }
    md += `\n---\n\n## Journal Content\n${entry.content || '_No initial notes written._'}\n\n`;

    if (entry.messages && entry.messages.length > 0) {
      md += `## Reflection Dialogue\n\n`;
      entry.messages.forEach((m) => {
        md += `### ${m.role === 'user' ? 'You' : 'Gemini AI'}\n${m.content}\n\n`;
      });
    }

    if (entry.summary) {
      md += `## Cognitive Summary\n${entry.summary.summary}\n\n`;
    }

    navigator.clipboard.writeText(md);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentModeInfo = MODES.find((m) => m.id === entry.mode) || MODES[0];
  const suggestedPrompts = SUGGESTED_PROMPTS[entry.mode] || SUGGESTED_PROMPTS.deep_reflection;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F0F10] text-[#E0E0E0] overflow-y-auto">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-20 bg-[#161618]/95 backdrop-blur border-b border-[#2A2A2E] px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Mode Selector */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = entry.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-950/40'
                      : 'bg-[#1A1A1D] border border-[#2A2A2E] text-[#A0A0A0] hover:text-[#E0E0E0] hover:bg-[#222226]'
                  }`}
                  title={m.desc}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick AI & Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              id="summarize-entry-btn"
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-indigo-400 text-xs font-semibold border border-indigo-500/30 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Generate Cognitive Summary & Key Takeaways"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              <span>{isSummarizing ? 'Synthesizing...' : 'Summarize'}</span>
            </button>

            <button
              id="export-markdown-btn"
              onClick={handleExportMarkdown}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] text-xs font-medium border border-[#2A2A2E] transition-colors cursor-pointer"
              title="Copy markdown export"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 mr-1 text-[#9CA3AF]" />}
              <span>{copiedLink ? 'Copied' : 'Export'}</span>
            </button>

            <button
              id="save-manual-btn"
              onClick={onManualSave}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] text-xs font-medium border border-[#2A2A2E] transition-colors cursor-pointer"
              title="Force sync to Firestore"
            >
              <Bookmark className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-100 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Title Input & Metadata Generator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <input
              id="entry-title-input"
              type="text"
              placeholder="Title your reflection..."
              value={entry.title}
              onChange={handleTitleChange}
              className="w-full text-xl sm:text-2xl font-serif font-bold text-[#E0E0E0] bg-transparent border-none placeholder-[#6B7280] focus:outline-none focus:ring-0 tracking-tight"
            />

            <button
              id="auto-title-btn"
              onClick={handleSuggestMeta}
              disabled={isSuggestingMeta}
              className="shrink-0 inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="AI suggest expressive title and tags"
            >
              {isSuggestingMeta ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 mr-1" />
              )}
              <span>Auto-Title</span>
            </button>
          </div>

          {/* Tags & Extracted Mood/Sentiment Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {entry.mood && (
              <span className="inline-flex items-center text-[10px] bg-amber-950/40 text-amber-300 border border-amber-800/40 px-2.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
                Mood: {entry.mood}
              </span>
            )}

            {typeof entry.sentimentScore === 'number' && (
              <span className="inline-flex items-center text-[10px] bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 px-2.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5" />
                Sentiment: {entry.sentimentScore}/10
              </span>
            )}

            {entry.themes && entry.themes.length > 0 && entry.themes.map((theme, idx) => (
              <span
                key={`theme-${idx}`}
                className="text-[10px] bg-sky-950/30 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/30"
              >
                #{theme}
              </span>
            ))}

            {entry.tags && entry.tags.length > 0 && (
              entry.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-[#1A1A1D] text-[#A0A0A0] px-2 py-0.5 rounded-full border border-[#2A2A2E]"
                >
                  #{tag}
                </span>
              ))
            )}
          </div>
        </div>

        {/* AI Summary Card Display (if generated) */}
        {entry.summary && (
          <div className="transition-all animate-fadeIn">
            <SummaryCard
              summary={entry.summary}
              onClose={() => onUpdateEntry({ ...entry, summary: null })}
            />
          </div>
        )}

        {/* Journal Entry Note Canvas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#161618] border border-[#2A2A2E] shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] pb-2 border-b border-[#2A2A2E]">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-[#E0E0E0] font-sans">Reflection Canvas</span>
            </div>
            <span className="text-[11px] text-[#6B7280]">
              {entry.content ? `${entry.content.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
            </span>
          </div>

          <textarea
            id="journal-content-textarea"
            rows={5}
            placeholder="Pour out your raw thoughts, feelings, events, challenges, or gratitude here... Gemini will reference this to converse and offer insights below."
            value={entry.content}
            onChange={handleContentChange}
            className="w-full bg-transparent text-[#E0E0E0] placeholder-[#6B7280] text-sm sm:text-base leading-relaxed border-none focus:outline-none focus:ring-0 resize-y min-h-[120px]"
          />

          <div className="pt-2 flex items-center justify-between border-t border-[#2A2A2E] text-xs text-[#6B7280]">
            <span>Mode focus: {currentModeInfo.desc}</span>
            {entry.content && (!entry.messages || entry.messages.length === 0) && (
              <button
                onClick={() => handleSendPrompt('Please reflect on my journal notes above and offer insights.')}
                disabled={isGeneratingReply}
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Reflect on this entry &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Multi-turn Reflection Dialogue Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pt-2">
            <Bot className="w-4 h-4 text-indigo-400" />
            <h3 className="font-serif font-bold text-base text-[#E0E0E0]">
              Gemini Cognitive Dialogue
            </h3>
          </div>

          {/* Conversation Stream */}
          {entry.messages && entry.messages.length > 0 ? (
            <div className="space-y-4">
              {entry.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-950/40'
                          : 'bg-[#161618] border border-[#2A2A2E] text-[#E0E0E0] shadow-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-2 text-[#E0E0E0]">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-2 flex items-center justify-end space-x-2 ${
                          isUser ? 'text-indigo-200' : 'text-[#6B7280]'
                        }`}
                      >
                        {msg.modelUsed && <span className="bg-[#1A1A1D] px-1.5 py-0.5 rounded border border-[#2A2A2E]">{msg.modelUsed}</span>}
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center text-[#E0E0E0] shrink-0 mt-1">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isGeneratingReply && (
                <div className="flex items-start space-x-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-[#161618] border border-[#2A2A2E] p-4 rounded-2xl text-xs text-[#9CA3AF] flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Gemini 3.6 Flash is reflecting deeply on your thoughts...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#161618]/40 border border-dashed border-[#2A2A2E] text-center text-[#9CA3AF] space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-indigo-400/60" />
              <p className="text-sm font-medium text-[#E0E0E0]">Start the conversation</p>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Ask Gemini for advice, explore an emotion, request a reframing perspective, or click one of the suggested prompts below.
              </p>
            </div>
          )}

          {/* Cognitive Prompt Suggestions */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-2 font-sans flex items-center">
              <Lightbulb className="w-3 h-3 text-indigo-400 mr-1.5" />
              Suggested Inquiries ({currentModeInfo.label})
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleSendPrompt(promptText)}
                  disabled={isGeneratingReply}
                  className="text-left text-xs bg-[#161618] hover:bg-[#1A1A1D] text-[#9CA3AF] hover:text-indigo-300 px-3 py-2 rounded-xl border border-[#2A2A2E] hover:border-indigo-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  &ldquo;{promptText}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Field */}
          <div className="pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="relative flex items-center"
            >
              <input
                id="gemini-prompt-input"
                type="text"
                placeholder="Ask Gemini to reflect, unpack an emotion, or brainstorm..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isGeneratingReply}
                className="w-full pl-4 pr-12 py-3.5 bg-[#161618] border border-[#2A2A2E] rounded-xl text-sm text-[#E0E0E0] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-inner"
              />
              <button
                id="send-prompt-btn"
                type="submit"
                disabled={!promptInput.trim() || isGeneratingReply}
                className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-indigo-950/40"
                title="Send Prompt to Gemini"
              >
                {isGeneratingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
