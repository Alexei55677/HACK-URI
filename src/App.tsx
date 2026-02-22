import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Play, CheckCircle2, AlertCircle, History, Trash2, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeBESSVideo, BESSAnalysisResult } from './services/geminiService';

interface Session {
  id: number;
  timestamp: string;
  stance: string;
  surface: string;
  total_score: number;
  errors: any;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [stance, setStance] = useState('Double Leg');
  const [surface, setSurface] = useState('Firm');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BESSAnalysisResult | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const base64 = await fileToBase64(videoFile);
      const analysis = await analyzeBESSVideo(base64, stance, surface);
      setResult(analysis);

      // Save to DB
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stance,
          surface,
          total_score: analysis.totalScore,
          errors: analysis.breakdown
        })
      });
      fetchSessions();
    } catch (err: any) {
      console.error(err);
      setError("Analysis failed. Please try again with a shorter or clearer video.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = async (id: number) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    fetchSessions();
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">BESS Balance AI</h1>
              <p className="text-xs text-[#141414]/50 font-medium uppercase tracking-widest">Clinical Assessment Tool</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-[#141414]/5 p-1 rounded-full">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'analyze' ? 'bg-white shadow-sm text-[#141414]' : 'text-[#141414]/60 hover:text-[#141414]'}`}
            >
              Analyze
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-[#141414]' : 'text-[#141414]/60 hover:text-[#141414]'}`}
            >
              History
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' ? (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              {/* Left Column: Controls */}
              <div className="lg:col-span-5 space-y-8">
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#141414]/40 mb-4 flex items-center gap-2">
                    <Info size={14} /> 1. Configure Test
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Stance</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Double Leg', 'Single Leg', 'Tandem'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setStance(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${stance === s ? 'bg-[#5A5A40] text-white border-[#5A5A40]' : 'bg-white border-[#141414]/10 hover:border-[#141414]/30'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Surface</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Firm', 'Foam'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSurface(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${surface === s ? 'bg-[#5A5A40] text-white border-[#5A5A40]' : 'bg-white border-[#141414]/10 hover:border-[#141414]/30'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#141414]/40 mb-4 flex items-center gap-2">
                    <Upload size={14} /> 2. Upload Video
                  </h2>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative aspect-video bg-white border-2 border-dashed border-[#141414]/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-[#5A5A40]/50 transition-all overflow-hidden"
                  >
                    {videoPreview ? (
                      <video src={videoPreview} className="w-full h-full object-cover" controls />
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Camera className="text-[#141414]/40" />
                        </div>
                        <p className="text-sm font-medium">Click to upload video</p>
                        <p className="text-xs text-[#141414]/40 mt-1">MP4, MOV up to 20s</p>
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="video/*"
                      className="hidden"
                    />
                  </div>
                </section>

                <button
                  disabled={!videoFile || isAnalyzing}
                  onClick={handleAnalyze}
                  className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${!videoFile || isAnalyzing ? 'bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed' : 'bg-[#141414] text-white hover:bg-[#141414]/90 shadow-xl shadow-[#141414]/10'}`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Balance...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Start AI Analysis
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-[#141414]/5 min-h-[400px] flex flex-col">
                  {result ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      <div className="flex items-end justify-between border-b border-[#141414]/5 pb-6">
                        <div>
                          <h3 className="text-4xl font-serif italic mb-1">Results</h3>
                          <p className="text-sm text-[#141414]/50">{stance} on {surface}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-6xl font-bold tracking-tighter">{result.totalScore}</span>
                          <span className="text-xl font-medium text-[#141414]/30 ml-2">/ 10</span>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#141414]/40 mt-1">Total Errors</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(result.breakdown).map(([key, val]) => (
                          <div key={key} className="p-4 bg-[#F5F5F0] rounded-2xl flex justify-between items-center">
                            <span className="text-xs font-semibold text-[#141414]/60 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`text-lg font-bold ${(val as number) > 0 ? 'text-[#5A5A40]' : 'text-[#141414]/20'}`}>
                              {val as number}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#5A5A40]/5 p-6 rounded-3xl border border-[#5A5A40]/10">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] mb-2">AI Summary</h4>
                        <p className="text-sm leading-relaxed text-[#141414]/80 italic">
                          "{result.summary}"
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className="w-20 h-20 bg-[#F5F5F0] rounded-full flex items-center justify-center mb-6">
                        <Loader2 className={`text-[#141414]/10 ${isAnalyzing ? 'animate-spin' : ''}`} size={40} />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Ready for Analysis</h3>
                      <p className="text-sm text-[#141414]/40 max-w-xs">
                        Upload a 20-second video of the BESS test to see detailed error tracking and scoring.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif italic">Assessment History</h2>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#141414]/40">
                  <History size={14} />
                  {sessions.length} Sessions Recorded
                </div>
              </div>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-[#F5F5F0] rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold">{session.total_score}</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-[#141414]/40">Errors</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{session.stance}</h4>
                          <p className="text-sm text-[#141414]/40">{session.surface} Surface • {new Date(session.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border border-[#141414]/5">
                  <p className="text-[#141414]/40">No sessions recorded yet.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[#141414]/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40 mb-4">About BESS</h4>
            <p className="text-sm leading-relaxed text-[#141414]/60">
              The Balance Error Scoring System (BESS) is a clinical tool used to assess postural stability. It is commonly used in concussion management and sports medicine to track recovery and balance deficits.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40 mb-4">Scoring Criteria</h4>
            <ul className="text-xs space-y-2 text-[#141414]/60 list-disc pl-4">
              <li>Hands off iliac crests</li>
              <li>Opening eyes</li>
              <li>Step, stumble, or fall</li>
              <li>Hip flexion/abduction {'>'} 30°</li>
              <li>Lifting forefoot or heel</li>
              <li>Out of position {'>'} 5s</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
