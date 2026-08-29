import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Database,
  BrainCircuit,
  ArrowRight,
  MessageSquareText,
  FileText,
  CheckCircle2,
  Lock,
  AlertCircle,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  authError?: string | null;
  onClearAuthError?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isLoading,
  authError,
  onClearAuthError,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between bg-[#0F0F10] text-[#E0E0E0] selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col items-center text-center">
        {/* Security & Tech Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1D] border border-[#2A2A2E] text-[#E0E0E0] text-xs font-medium mb-8 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cloud Firestore User-Isolated Storage</span>
          <span className="text-[#6B7280]">•</span>
          <span className="text-indigo-400 font-semibold">Gemini 3.6 Flash Engine</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-[#E0E0E0] max-w-3xl leading-[1.15]">
          A mindful cognitive sanctuary for your <span className="italic text-indigo-400">thoughts & reflections</span>.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-[#9CA3AF] max-w-2xl font-normal leading-relaxed">
          Write multi-turn journal entries, converse with Gemini to gain clarity, and organize your personal growth insights in a strictly isolated, secure cloud repository.
        </p>

        {/* Auth Error Banner if sign in had issues */}
        {authError && (
          <div className="mt-6 max-w-md w-full p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center justify-between text-left">
            <div className="flex items-center space-x-2 mr-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
            {onClearAuthError && (
              <button
                onClick={onClearAuthError}
                className="text-rose-400 hover:text-rose-200 p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Google Sign-In Action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            id="google-signin-hero-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </span>
            ) : (
              <span className="inline-flex items-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign in with Google
                <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center space-x-2 text-xs text-[#9CA3AF]">
          <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Zero passwords stored. Protected by Firebase Authentication & Firestore Rules.</span>
        </div>

        {/* Live Interactive Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#161618] border border-[#2A2A2E] hover:border-indigo-500/40 transition-colors shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#E0E0E0] mb-2">Gemini 3.6 Flash Reflections</h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Engage in multi-turn dialogues with an empathetic AI partner that uncovers cognitive patterns, provides reframing questions, and brainstorms solutions.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2E] flex items-center text-xs text-indigo-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Resilient fallback ladder built-in</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#161618] border border-[#2A2A2E] hover:border-emerald-500/40 transition-colors shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#E0E0E0] mb-2">Private User-Isolated Firestore</h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Every reflection is strictly isolated at path <code className="text-xs bg-[#0F0F10] border border-[#2A2A2E] px-1.5 py-0.5 rounded text-[#E0E0E0]">/users/&#123;uid&#125;/entries</code> under hardened security rules. No user can read another&apos;s thoughts.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2E] flex items-center text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Zero-insecure default rules</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#161618] border border-[#2A2A2E] hover:border-sky-500/40 transition-colors shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#E0E0E0] mb-2">Automated Synthesis & Action Items</h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Generate instant executive summaries, key takeaways, sentiment and emotional tone breakdowns, and forward-looking action prompts with one click.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2E] flex items-center text-xs text-sky-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Searchable reflection history</span>
            </div>
          </div>
        </div>

        {/* User Flow Preview */}
        <div className="mt-16 w-full max-w-4xl p-6 rounded-2xl bg-[#161618]/50 border border-[#2A2A2E] text-[#E0E0E0]">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4 text-center">
            How It Works
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-xs">
            <div className="p-3.5 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E]">
              <div className="font-bold text-[#E0E0E0] text-sm mb-1">1. Sign In</div>
              <span className="text-[#9CA3AF]">Authenticate securely using your Google Account.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E]">
              <div className="font-bold text-[#E0E0E0] text-sm mb-1">2. Journal</div>
              <span className="text-[#9CA3AF]">Write thoughts, daily check-ins, or challenges.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E]">
              <div className="font-bold text-[#E0E0E0] text-sm mb-1">3. Converse</div>
              <span className="text-[#9CA3AF]">Gain deep insights and reframe with Gemini.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1A1A1D] border border-[#2A2A2E]">
              <div className="font-bold text-[#E0E0E0] text-sm mb-1">4. Persist</div>
              <span className="text-[#9CA3AF]">Auto-saved to your private Firestore database.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2E] py-6 text-center text-xs text-[#9CA3AF]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReflectAI • Built with Google AI Studio & Cloud Firestore</span>
          <span className="text-[#6B7280]">Enterprise Security Standard • OWASP Top 10 Compliant</span>
        </div>
      </footer>
    </div>
  );
};
