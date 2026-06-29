/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const CourseLearn = () => {
  const { id } = useParams();

  // Utility to format time e.g. 05:23
  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [resources, setResources] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab state: 'syllabus' | 'resources' | 'assignments' | 'live' | 'notes'
  const [activeTab, setActiveTab] = useState('syllabus');

  // AI Chat drawer state
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Assignment submission state
  const [submitForm, setSubmitForm] = useState({ assignmentId: '', submissionUrl: '', answerText: '' });
  const [submitStatus, setSubmitStatus] = useState('');

  // Toast status
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Custom Video Player State
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('Auto');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // Notes State
  const [noteInput, setNoteInput] = useState('');
  const [notes, setNotes] = useState([]);

  // suggestion chips
  const suggestionChips = [
    "Explain this lecture",
    "Give me a quick quiz",
    "Summarize coding concepts",
    "Show practice exercise"
  ];

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 4000);
  };

  const fetchLearningDetails = async () => {
    setLoading(true);

    // 1. Course summary
    try {
      const courseResp = await api.get(`/courses/${id}`);
      setCourse(courseResp.data?.data || null);
    } catch (error) {
      console.error("Error fetching course summary:", error);
      setCourse(null);
    }

    // 2. Sections and lessons
    try {
      const sectionsResp = await api.get(`/courses/${id}/sections`);
      const rawSections = sectionsResp.data?.data || [];
      setSections(rawSections);

      // Select first lesson by default
      if (rawSections.length > 0) {
        const firstSec = rawSections[0];
        if (firstSec.lessons && firstSec.lessons.length > 0) {
          setActiveLesson(firstSec.lessons[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      setSections([]);
    }

    // 3. Learning Resources
    try {
      const resourcesResp = await api.get(`/courses/${id}/resources`);
      setResources(resourcesResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching learning resources:", error);
      setResources([]);
    }

    // 4. Live teaching sessions
    try {
      const liveResp = await api.get(`/live/enrolled`);
      const courseLives = (liveResp.data?.data || []).filter(s => s.courseId === parseInt(id));
      setLiveSessions(courseLives);
    } catch (error) {
      console.error("Error fetching live sessions:", error);
      setLiveSessions([]);
    }

    // 5. Course assignments list
    try {
      const assignResp = await api.get(`/assignments/course/${id}`);
      setAssignments(assignResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    }

    // 6. AI Chat history
    try {
      const chatResp = await api.get('/ai/history');
      setChatMessages(chatResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching AI history:", error);
      setChatMessages([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLearningDetails();
  }, [id]);

  // Load and Save Local Notes
  useEffect(() => {
    if (activeLesson) {
      const notesKey = `notes_${id}_${activeLesson.id}`;
      const savedNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes(savedNotes);
    }
  }, [activeLesson]);

  // Auto Resume Seeker
  useEffect(() => {
    if (activeLesson && videoRef.current) {
      const resumeKey = `resume_${id}_${activeLesson.id}`;
      const savedTime = localStorage.getItem(resumeKey);
      
      // Delay slightly to let the video element buffer and load
      const timer = setTimeout(() => {
        if (savedTime && videoRef.current) {
          videoRef.current.currentTime = parseFloat(savedTime);
          showToast('success', `⏰ Auto-Resumed from ${formatTime(parseFloat(savedTime))}!`);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeLesson]);

  // Mark lesson as complete and update student progress percent
  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      const totalLessons = (sections || []).reduce((acc, s) => acc + (s.lessons ? s.lessons.length : 0), 0);
      if (totalLessons === 0) return;

      let lessonIndex = 0;
      let found = false;
      for (const sec of (sections || [])) {
        for (const les of (sec.lessons || [])) {
          lessonIndex++;
          if (les.id === activeLesson.id) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      const percent = Math.round((lessonIndex / totalLessons) * 100);
      await api.patch(`/enrollments/progress/${id}?percent=${percent}`);
      showToast('success', 'Lesson complete! Saving progress...');
      
      // Auto advance to next lesson
      advanceNextLesson();
    } catch (error) {
      console.error("Failed to mark lesson complete:", error);
    }
  };

  const advanceNextLesson = () => {
    let selectNext = false;
    for (const sec of (sections || [])) {
      for (const les of (sec.lessons || [])) {
        if (selectNext) {
          setActiveLesson(les);
          return;
        }
        if (les.id === activeLesson?.id) {
          selectNext = true;
        }
      }
    }
  };

  // Join Live Class
  const handleJoinLive = async (sessionId, session) => {
    try {
      await api.post(`/live/${sessionId}/join`);
      const targetLink = session.meetingLink || `/live/join/${session.roomToken}`;
      window.open(targetLink, '_blank');
    } catch (error) {
      console.error(error);
    }
  };

  // Submit Assignment
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submitForm.assignmentId) return;
    setSubmitStatus('Submitting...');
    try {
      const response = await api.post('/assignments/submit', {
        assignmentId: parseInt(submitForm.assignmentId),
        submissionUrl: submitForm.submissionUrl,
        answerText: submitForm.answerText
      });
      if (response.data.success) {
        setSubmitStatus('Submitted successfully!');
        showToast('success', 'Assignment Submitted successfully!');
        setSubmitForm({ assignmentId: '', submissionUrl: '', answerText: '' });
      } else {
        setSubmitStatus('Submission failed.');
      }
    } catch (error) {
      console.error(error);
      setSubmitStatus('Error submitting assignment.');
    }
  };

  // Send message to AI Tutor
  const handleSendAiMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    submitToAi(chatInput);
  };

  const submitToAi = async (messageText) => {
    const userMsg = { message: messageText, response: '', isTemp: true };
    setChatMessages(prev => [...(prev || []), userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await api.post('/ai/chat?provider=mock', { message: userMsg.message });
      if (response.data.success) {
        setChatMessages(prev => (prev || []).map(m => m.isTemp ? response.data.data : m));
      }
    } catch (error) {
      console.error("AI Chat failed:", error);
      setChatMessages(prev => (prev || []).filter(m => !m.isTemp));
      showToast('error', 'AI Assistant connection timeout.');
    } finally {
      setChatLoading(false);
    }
  };

  // Custom Video Player Controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curTime = videoRef.current.currentTime;
      setCurrentTime(curTime);
      
      // Save for auto resume every 5 seconds
      if (Math.round(curTime) % 5 === 0 && activeLesson) {
        localStorage.setItem(`resume_${id}_${activeLesson.id}`, curTime.toString());
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrub = (e) => {
    if (videoRef.current) {
      const seekTime = parseFloat(e.target.value);
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
      showToast('success', `Playback speed set to ${speed}x`);
    }
  };

  const handleQualityChange = (q) => {
    setQuality(q);
    setShowQualityMenu(false);
    setBuffering(true);
    // Simulate minor loading buffer spinner for high fidelity look
    setTimeout(() => {
      setBuffering(false);
      showToast('success', `Quality changed to ${q}`);
    }, 700);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP mode failed:", err);
      showToast('error', 'Picture-in-Picture not supported on this browser.');
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen().catch(err => {
          console.error("Fullscreen failed:", err);
        });
      }
    }
  };

  // Add Timestamped Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteInput.trim() || !activeLesson) return;

    const newNote = {
      id: Date.now(),
      text: noteInput,
      timestamp: currentTime,
      timestampString: formatTime(currentTime)
    };

    const updatedNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${id}_${activeLesson.id}`, JSON.stringify(updatedNotes));
    setNoteInput('');
    showToast('success', `Note saved at ${newNote.timestampString}!`);
  };

  const handleDeleteNote = (noteId) => {
    if (!activeLesson) return;
    const filtered = notes.filter(n => n.id !== noteId);
    setNotes(filtered);
    localStorage.setItem(`notes_${id}_${activeLesson.id}`, JSON.stringify(filtered));
    showToast('success', 'Note deleted.');
  };

  const seekToTimestamp = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      videoRef.current.play();
      setIsPlaying(true);
      showToast('success', `Jumped to ${formatTime(seconds)}`);
    }
  };



  const renderVideoPlayer = (url, title) => {
    if (!url) return null;
    
    // Check if YouTube/Vimeo embed
    const isEmbed = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
    
    if (isEmbed) {
      const embedUrl = url.includes('youtube.com') || url.includes('youtu.be') 
        ? url.replace("watch?v=", "embed/") 
        : url;
      return (
        <iframe 
          className="w-full h-full"
          src={embedUrl}
          title={title}
          allowFullScreen
        ></iframe>
      );
    }
    
    // HTML5 native video player with Custom Overlay UI
    return (
      <div className="w-full h-full relative group">
        <video 
          ref={videoRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleMarkComplete}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-cover"
        />

        {/* Buffer loading spinner overlay */}
        {buffering && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <svg className="animate-spin h-10 w-10 text-teal-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Big play button centered */}
        {!isPlaying && (
          <button 
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-teal-500/90 hover:bg-teal-400 flex items-center justify-center text-white text-lg shadow-2xl transition hover:scale-105"
          >
            ▶
          </button>
        )}

        {/* Control Bar Overlay on hover/tap */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          {/* Progress timeline scrubber */}
          <div className="flex items-center space-x-3">
            <span className="text-[10px] text-slate-300 font-mono">{formatTime(currentTime)}</span>
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleScrub}
              className="flex-grow h-1 bg-slate-700/60 rounded-full appearance-none cursor-pointer accent-teal-400"
            />
            <span className="text-[10px] text-slate-300 font-mono">{formatTime(duration)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Play Pause */}
              <button onClick={togglePlay} className="text-white hover:text-teal-400 text-sm transition">
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Mute Volume */}
              <div className="flex items-center space-x-2 group/vol">
                <button onClick={toggleMute} className="text-white hover:text-teal-400 text-xs">
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700/60 rounded-full appearance-none cursor-pointer accent-teal-400 opacity-0 group-hover/vol:opacity-100 transition-opacity"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs relative">
              {/* Playback speed */}
              <div className="relative">
                <button 
                  onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}
                  className="text-white hover:text-teal-400 font-bold px-2 py-0.5 rounded bg-white/10"
                >
                  {playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-7 right-0 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 w-20 flex flex-col z-20">
                    {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                      <button 
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`text-[10px] py-1 text-left px-3 hover:bg-slate-800 text-white ${playbackSpeed === speed ? 'text-teal-400' : ''}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality selector */}
              <div className="relative">
                <button 
                  onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                  className="text-white hover:text-teal-400 font-semibold px-2 py-0.5 rounded bg-white/10"
                >
                  {quality}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-7 right-0 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 w-24 flex flex-col z-20">
                    {['Auto', '1080p', '720p', '480p'].map(q => (
                      <button 
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={`text-[10px] py-1 text-left px-3 hover:bg-slate-800 text-white ${quality === q ? 'text-teal-400' : ''}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture in picture */}
              <button onClick={togglePip} className="text-white hover:text-teal-400" title="Picture in Picture">
                📺
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white hover:text-teal-400" title="Fullscreen">
                🔲
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Opening your learning environment..." />;
  }

  const liveClass = (liveSessions || []).find(s => s && s.status === 'LIVE');
  const hasVideo = !!activeLesson || (!!course && !!course.introVideoUrl);

  return (
    <div className="min-h-[85vh] bg-surface-900 flex flex-col-reverse lg:flex-row relative pb-20 lg:pb-0 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Toast popup */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* ══════════════════ LEFT PANEL: SYLLABUS OUTLINE ══════════════════ */}
      <div className="w-full lg:w-80 bg-surface-800/90 border-r border-surface-600 flex flex-col shrink-0">
        <div className="p-5 border-b border-surface-600">
          <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">Syllabus Outline</span>
          <h3 className="text-white font-bold text-base mt-1 line-clamp-1">{course?.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh] lg:max-h-[75vh]">
          {(sections || []).map((sec, sIdx) => (
            <div key={sec.id} className="space-y-1.5">
              <span className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider block">
                Chapter {sIdx + 1}: {sec.title}
              </span>
              <div className="space-y-1">
                {(sec.lessons || []).map((les, lIdx) => (
                  <button
                    key={les.id}
                    onClick={() => setActiveLesson(les)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between border transition ${
                      activeLesson?.id === les.id 
                        ? 'bg-primary-600/10 border-primary-600/30 text-primary-400 font-bold' 
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-surface-700/30'
                    }`}
                  >
                    <span className="line-clamp-1">{sIdx + 1}.{lIdx + 1} {les.title}</span>
                    <svg className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════ CENTER PANEL: PLAYER & TAB CONTENTS ══════════════════ */}
      <div className="flex-grow p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
        {/* Live session alert banner */}
        {liveClass && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-2xl flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
              <span className="text-xs font-bold">A live session "{liveClass.title}" is currently active!</span>
            </div>
            <button 
              onClick={() => handleJoinLive(liveClass.id, liveClass)}
              className="bg-error hover:bg-error text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition"
            >
              Join Live
            </button>
          </div>
        )}

        {/* Video Frame */}
        {hasVideo ? (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-surface-600 shadow-2xl">
              {renderVideoPlayer(activeLesson ? activeLesson.videoUrl : course?.introVideoUrl, activeLesson ? activeLesson.title : "Course Introduction")}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-white">
                  {activeLesson ? activeLesson.title : "Course Introduction"}
                </h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-2xl">
                  {activeLesson ? activeLesson.description : course?.description}
                </p>
              </div>
              {activeLesson && (
                <button
                  onClick={handleMarkComplete}
                  className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow shadow-teal-500/10 shrink-0 cursor-pointer"
                >
                  Mark Complete & Next ✓
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-surface-800 rounded-3xl border border-surface-600 flex flex-col items-center justify-center text-slate-500">
            <svg className="w-12 h-12 text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            <span>No lesson selected. Click one on the sidebar!</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="bg-surface-800/60 border border-surface-600 rounded-2xl overflow-hidden shadow-lg">
          <div className="flex border-b border-surface-600 overflow-x-auto scrollbar-none">
            {[
              { id: 'syllabus', label: '📖 Syllabus Info' },
              { id: 'notes', label: '📝 Notes & Bookmarks' },
              { id: 'downloads', label: '📥 Downloads' },
              { id: 'assignments', label: '📝 Assignments' },
              { id: 'live', label: '📅 Live Rooms' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id 
                    ? 'border-primary-600 text-primary-400 bg-primary-600/5' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            
            {/* Tab 1: Syllabus Info */}
            {activeTab === 'syllabus' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm">About this Syllabus</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{course?.description}</p>
              </div>
            )}

            {/* Tab 2: Timestamped Notes & Bookmarks */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-baseline mb-2">
                  <h4 className="text-white font-extrabold text-sm">Bookmarks & Notes</h4>
                  <span className="text-[10px] text-slate-500 font-semibold">Notes lock to video timestamp</span>
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={`Type a note at ${formatTime(currentTime)}...`}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-grow bg-surface-900 border border-surface-600 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                  >
                    Save Note
                  </button>
                </form>

                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 italic py-6">No saved bookmarks. Add one above during playback!</p>
                  ) : (
                    notes.map(note => (
                      <div key={note.id} className="flex items-center justify-between p-3 bg-background/45 border border-border rounded-xl">
                        <div className="flex items-center space-x-3 min-w-0 pr-4">
                          <button
                            onClick={() => seekToTimestamp(note.timestamp)}
                            className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
                          >
                            ⏱ {note.timestampString}
                          </button>
                          <span className="text-xs text-slate-300 font-medium truncate">{note.text}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 transition font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Downloads */}
            {activeTab === 'downloads' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm mb-4">Syllabus Resources</h4>
                {resources.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No downloadable resources added for this course.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resources.map(res => (
                      <div key={res.id} className="p-3.5 bg-background/40 border border-border rounded-xl flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <h5 className="text-xs font-bold text-white truncate">{res.title}</h5>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{res.resourceType}</span>
                        </div>
                        <a 
                          href={res.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                        >
                          Download 💾
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Assignments */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <h4 className="text-white font-extrabold text-sm mb-2">Assignments & Homework</h4>
                {assignments.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No assignments scheduled for this syllabus.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {assignments.map(ass => (
                      <div key={ass.id} className="p-5 bg-background/40 border border-border rounded-2xl space-y-4">
                        <div>
                          <h5 className="text-white font-bold text-sm">{ass.title}</h5>
                          <p className="text-text-muted text-xs leading-relaxed mt-1">{ass.instructions}</p>
                          <span className="inline-block mt-2 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            Due: {new Date(ass.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        <form onSubmit={handleSubmitAssignment} className="border-t border-border pt-4 space-y-3">
                          <input type="hidden" value={ass.id} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="url"
                              placeholder="Submission URL (GitHub / Drive)"
                              required
                              value={submitForm.assignmentId === ass.id.toString() ? submitForm.submissionUrl : ''}
                              onChange={(e) => setSubmitForm({ ...submitForm, assignmentId: ass.id.toString(), submissionUrl: e.target.value })}
                              className="bg-surface-900 border border-surface-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-600"
                            />
                            <input
                              type="text"
                              placeholder="Optional note text..."
                              value={submitForm.assignmentId === ass.id.toString() ? submitForm.answerText : ''}
                              onChange={(e) => setSubmitForm({ ...submitForm, assignmentId: ass.id.toString(), answerText: e.target.value })}
                              className="bg-surface-900 border border-surface-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-600"
                            />
                          </div>
                          <button
                            type="submit"
                            onClick={() => setSubmitForm(prev => ({ ...prev, assignmentId: ass.id.toString() }))}
                            className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                          >
                            Submit Assignment
                          </button>
                        </form>
                      </div>
                    ))}
                    {submitStatus && (
                      <p className="text-xs text-teal-400 font-semibold">{submitStatus}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Live Rooms */}
            {activeTab === 'live' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm mb-3">Live Video Classes</h4>
                {liveSessions.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No scheduled live classrooms associated with this syllabus.</p>
                ) : (
                  <div className="space-y-3">
                    {liveSessions.map(session => (
                      <div key={session.id} className="p-4 bg-background/40 border border-border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <h5 className="text-xs font-bold text-white">{session.title}</h5>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(session.startTime).toLocaleString()} - {session.status}
                          </p>
                        </div>
                        {session.status === 'LIVE' ? (
                          <button
                            onClick={() => handleJoinLive(session.id, session)}
                            className="mt-3 md:mt-0 bg-error hover:bg-error/95 text-white text-xs font-bold px-4 py-2 rounded-xl transition animate-pulse cursor-pointer shadow-md shadow-error/20"
                          >
                            Join Live Now
                          </button>
                        ) : session.status === 'SCHEDULED' ? (
                          <button
                            onClick={() => handleJoinLive(session.id, session)}
                            className="mt-3 md:mt-0 bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                          >
                            Enter Lobby
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic px-2">Ended</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Floating AI Doubt Solver Trigger FAB */}
      <button
        onClick={() => setShowAiChat(!showAiChat)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-primary-600/30 hover:scale-105 transition z-40 select-none cursor-pointer"
        title="Open AI Doubt Assistant"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* ══════════════════ MOBILE-NATIVE AI DOUBT DRAWER OVERLAY ══════════════════ */}
      {showAiChat && (
        <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-surface-800 border-l border-surface-600 shadow-2xl flex flex-col z-50 animate-slide-in">
          {/* Header */}
          <div className="p-4.5 border-b border-surface-600 flex justify-between items-center bg-background/50">
            <div>
              <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-widest">AI Doubt assistant</span>
              <h3 className="font-extrabold text-sm text-white mt-0.5">Aura AI Tutor</h3>
            </div>
            <button 
              onClick={() => setShowAiChat(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4.5 space-y-4">
            {(chatMessages || []).length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs max-w-xs mx-auto space-y-2">
                <span className="text-3xl block">🤖</span>
                <p className="font-extrabold text-white">Ask me anything!</p>
                <p className="leading-relaxed">I can answer code questions, write code templates, or explain syllabus points.</p>
              </div>
            ) : (
              (chatMessages || []).map((msg, idx) => (
                <div key={idx} className="space-y-3">
                  {/* Student Msg */}
                  <div className="flex justify-end">
                    <div className="bg-surface-700 border border-surface-600 text-slate-200 rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-[85%] leading-relaxed">
                      {msg.message}
                    </div>
                  </div>
                  {/* AI Response */}
                  {msg.response && (
                    <div className="flex justify-start">
                      <div className="bg-primary-600/10 border border-primary-600/20 text-violet-300 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap">
                        {msg.response}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-primary-600/5 text-primary-400 border border-primary-600/10 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestion chips */}
          <div className="px-4.5 py-2.5 bg-background/25 border-t border-border flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestionChips.map(chip => (
              <button
                key={chip}
                onClick={() => submitToAi(chip)}
                className="bg-card hover:bg-card-light text-[10px] text-teal-400 border border-border px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition select-none cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendAiMessage} className="p-4.5 border-t border-surface-600 flex space-x-2 bg-background/50 shrink-0">
            <input
              type="text"
              placeholder="Ask a coding question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-teal-500"
              required
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-3 rounded-xl text-xs font-black transition cursor-pointer shrink-0 shadow-md shadow-teal-500/15"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseLearn;
