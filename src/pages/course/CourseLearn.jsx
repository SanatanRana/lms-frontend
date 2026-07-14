import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

const CourseLearn = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useContext(AuthContext);

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
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [showThreadList, setShowThreadList] = useState(false);

  // Assignment submission state
  const [submitForm, setSubmitForm] = useState({ assignmentId: '', submissionUrl: '', answerText: '' });
  const [submitStatus, setSubmitStatus] = useState('');

  // Toast status
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Custom Video Player State
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Render Gemini markdown to HTML for the chat bubbles
  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      // Code blocks ```lang\ncode```
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="ai-code-block"><code>${code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`
      )
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
      // Bold **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Numbered list lines
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ai-list-item ai-numbered"><span class="ai-num">$1.</span> $2</li>')
      // Bullet list lines
      .replace(/^[•\-] (.+)$/gm, '<li class="ai-list-item">$1</li>')
      // Wrap consecutive <li> in <ul> or <ol>
      .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, (match) => `<ul class="ai-list">${match}</ul>`)
      // Headings ## and ###
      .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
      // Paragraphs: double newline → paragraph break
      .replace(/\n{2,}/g, '</p><p class="ai-para">')
      // Single newlines → line break
      .replace(/\n/g, '<br/>');
    return `<p class="ai-para">${html}</p>`;
  };

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

      // Select initial lesson if passed in route state, otherwise first lesson
      const initialLessonId = location.state?.initialLessonId;
      let selectedLesson = null;
      if (initialLessonId) {
        for (const sec of rawSections) {
          const found = (sec.lessons || []).find(l => l.id === initialLessonId);
          if (found) {
            selectedLesson = found;
            break;
          }
        }
      }
      if (!selectedLesson && rawSections.length > 0) {
        const firstSec = rawSections[0];
        if (firstSec.lessons && firstSec.lessons.length > 0) {
          selectedLesson = firstSec.lessons[0];
        }
      }
      setActiveLesson(selectedLesson);
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

    // 6. AI Chat threads
    try {
      const threadsResp = await api.get(`/ai/threads?courseId=${id}`);
      const courseThreads = threadsResp.data?.data || [];
      setThreads(courseThreads);
      if (courseThreads.length > 0) {
        const firstThread = courseThreads[0];
        setActiveThreadId(firstThread.id);
        const chatResp = await api.get(`/ai/history?threadId=${firstThread.id}`);
        setChatMessages(chatResp.data?.data || []);
      } else {
        setActiveThreadId(null);
        setChatMessages([]);
      }
    } catch (error) {
      console.error("Error fetching AI threads:", error);
      setThreads([]);
      setActiveThreadId(null);
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
      const userPrefix = user?.email || 'guest';
      const notesKey = `${userPrefix}_notes_${id}_${activeLesson.id}`;
      const savedNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes(savedNotes);
    }
  }, [activeLesson, user]);

  const safeSeek = (time) => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = time;
    } else {
      pendingSeekRef.current = time;
    }
  };

  // Silent Auto Resume Seeker
  useEffect(() => {
    if (activeLesson) {
      const userPrefix = user?.email || 'guest';
      const resumeKey = `${userPrefix}_resume_${id}_${activeLesson.id}`;
      const savedTime = localStorage.getItem(resumeKey);
      if (savedTime) {
        const parsedTime = parseFloat(savedTime);
        if (parsedTime > 5) {
          safeSeek(parsedTime);
          /* eslint-disable-next-line react-hooks/set-state-in-effect */
          setCurrentTime(parsedTime);
          showToast('success', `⏰ Resumed lecture from ${formatTime(parsedTime)}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson, user]);

  // Auto-hide controls overlay after 3.5 seconds of inactivity if playing
  useEffect(() => {
    let timer;
    if (showControls && isPlaying) {
      timer = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  // Sync fullscreen change state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);



  // Mobile Auto-Landscape Fullscreen
  useEffect(() => {
    const lastOrientation = { val: window.innerHeight < window.innerWidth ? 'landscape' : 'portrait' };
    const handleResize = () => {
      const currentOrientation = window.innerHeight < window.innerWidth ? 'landscape' : 'portrait';
      if (currentOrientation !== lastOrientation.val) {
        lastOrientation.val = currentOrientation;
        const isMobile = window.innerWidth <= 1024;
        if (isMobile) {
          if (currentOrientation === 'landscape' && !document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen().catch(e => console.log(e));
          } else if (currentOrientation === 'portrait' && document.fullscreenElement === playerContainerRef.current) {
            document.exitFullscreen().catch(e => console.log(e));
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mark lesson as complete and update student progress percent
  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      const userPrefix = user?.email || 'guest';
      const resumeKey = `${userPrefix}_resume_${id}_${activeLesson.id}`;
      localStorage.removeItem(resumeKey);
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
      const payload = { message: userMsg.message };
      if (activeThreadId) {
        payload.threadId = activeThreadId;
      } else {
        payload.courseId = parseInt(id);
      }
      const response = await api.post('/ai/chat', payload);
      if (response.data.success) {
        const returnedMsg = response.data.data;
        if (!activeThreadId && returnedMsg.thread) {
          setActiveThreadId(returnedMsg.thread.id);
          fetchThreadsOnly();
        }
        setChatMessages(prev => (prev || []).map(m => m.isTemp ? returnedMsg : m));
      }
    } catch (error) {
      console.error("AI Chat failed:", error);
      setChatMessages(prev => (prev || []).filter(m => !m.isTemp));
      showToast('error', 'AI Assistant connection timeout.');
    } finally {
      setChatLoading(false);
    }
  };

  const fetchThreadsOnly = async () => {
    try {
      const threadsResp = await api.get(`/ai/threads?courseId=${id}`);
      setThreads(threadsResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  };

  const selectThread = async (threadId) => {
    setActiveThreadId(threadId);
    setChatLoading(true);
    setShowThreadList(false);
    try {
      const chatResp = await api.get(`/ai/history?threadId=${threadId}`);
      setChatMessages(chatResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching thread history:", error);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveThreadId(null);
    setChatMessages([]);
    setShowThreadList(false);
  };

  const handleDeleteThread = async (threadId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/threads/${threadId}`);
      showToast('success', 'Chat session deleted');
      if (activeThreadId === threadId) {
        startNewChat();
      }
      fetchThreadsOnly();
    } catch (error) {
      console.error("Failed to delete thread:", error);
      showToast('error', 'Failed to delete chat session');
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

      // Save for auto resume every 5 seconds (but clear if near end)
      if (activeLesson) {
        const userPrefix = user?.email || 'guest';
        const resumeKey = `${userPrefix}_resume_${id}_${activeLesson.id}`;
        if (duration > 0 && curTime >= duration - 8) {
          localStorage.removeItem(resumeKey);
        } else if (Math.round(curTime) % 5 === 0) {
          localStorage.setItem(resumeKey, curTime.toString());
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width && height) {
        setVideoAspectRatio(width / height);
      }

      // Apply pending seeks safely
      if (pendingSeekRef.current !== null) {
        videoRef.current.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }

      // Persistent speed restoration
      const userPrefix = user?.email || 'guest';
      const speedKey = `${userPrefix}_learngen_playback_speed`;
      const savedSpeed = parseFloat(localStorage.getItem(speedKey) || '1');
      videoRef.current.playbackRate = savedSpeed;
      setPlaybackSpeed(savedSpeed);
    }
  };

  const handleScrub = (e) => {
    const seekTime = parseFloat(e.target.value);
    safeSeek(seekTime);
    setCurrentTime(seekTime);
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
      const userPrefix = user?.email || 'guest';
      const speedKey = `${userPrefix}_learngen_playback_speed`;
      localStorage.setItem(speedKey, speed.toString());
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
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
          videoRef.current.webkitEnterFullscreen();
        } else {
          console.error("Fullscreen failed:", err);
        }
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.log(err));
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }
      if (!videoRef.current) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j': {
          e.preventDefault();
          const backTime = Math.max(0, videoRef.current.currentTime - 10);
          safeSeek(backTime);
          setCurrentTime(backTime);
          break;
        }
        case 'arrowright':
        case 'l': {
          e.preventDefault();
          const fwdTime = Math.min(duration, videoRef.current.currentTime + 10);
          safeSeek(fwdTime);
          setCurrentTime(fwdTime);
          break;
        }
        case 'arrowup': {
          e.preventDefault();
          const volUp = Math.min(1, volume + 0.1);
          videoRef.current.volume = volUp;
          setVolume(volUp);
          setIsMuted(volUp === 0);
          break;
        }
        case 'arrowdown': {
          e.preventDefault();
          const volDn = Math.max(0, volume - 0.1);
          videoRef.current.volume = volDn;
          setVolume(volDn);
          setIsMuted(volDn === 0);
          break;
        }
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration, currentTime, volume, isMuted]);

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
    const userPrefix = user?.email || 'guest';
    const notesKey = `${userPrefix}_notes_${id}_${activeLesson.id}`;
    localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
    setNoteInput('');
    showToast('success', `Note saved at ${newNote.timestampString}!`);
  };

  const handleDeleteNote = (noteId) => {
    if (!activeLesson) return;
    const filtered = notes.filter(n => n.id !== noteId);
    setNotes(filtered);
    const userPrefix = user?.email || 'guest';
    const notesKey = `${userPrefix}_notes_${id}_${activeLesson.id}`;
    localStorage.setItem(notesKey, JSON.stringify(filtered));
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

  const handleStopVideo = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      safeSeek(0);
      setCurrentTime(0);
      showToast('info', 'Video stopped ⏹');
    }
  };

  const renderVideoPlayer = (url, title, isMini = false) => {
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

    // HTML5 native video player with Premium YouTube-Style Controls
    return (
      <div
        ref={isMini ? null : playerContainerRef}
        onClick={(e) => {
          if (isMini) {
            e.stopPropagation();
            togglePlay();
          } else {
            setShowControls(prev => !prev);
          }
        }}
        className={`video-player-container w-full h-full relative group bg-black flex items-center justify-center select-none overflow-hidden ${
          isMini ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <video
          ref={videoRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleMarkComplete}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain bg-black pointer-events-none"
        />

        {/* ── DOUBLE-CLICK SEEK OVERLAYS (Invisible gesture zones) ── */}
        {!isMini && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-1/2 z-5 active:bg-white/5 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (e.detail === 1) {
                  setShowControls(prev => !prev);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleSeek('back');
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 z-5 active:bg-white/5 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (e.detail === 1) {
                  setShowControls(prev => !prev);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleSeek('fwd');
              }}
            />
          </>
        )}

        {/* ── SKIP DOUBLE-TAP FEEDBACK RIPPLE ── */}
        {!isMini && skipIndicator.show && (
          <div className={`absolute top-1/2 -translate-y-1/2 rounded-full w-24 h-24 bg-white/10 flex flex-col items-center justify-center z-25 pointer-events-none transition-all duration-300 scale-110 opacity-100 ${
            skipIndicator.dir === 'back' ? 'left-1/4' : 'right-1/4'
          }`}>
            <span className="text-white text-lg font-bold">{skipIndicator.dir === 'back' ? '◀◀' : '▶▶'}</span>
            <span className="text-white text-[10px] font-black uppercase mt-1">10s</span>
          </div>
        )}

        {/* ── BUFFER LOADING SPINNER OVERLAY ── */}
        {buffering && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 pointer-events-none">
            <svg className="animate-spin h-10 w-10 text-teal-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* ── CLOSED CAPTIONS MOCK SUBTITLES ── */}
        {!isMini && showCc && getCaptionText(currentTime) && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/85 border border-white/5 px-4 py-1.5 rounded-xl text-white text-[11px] md:text-xs font-bold text-center z-15 select-none pointer-events-none max-w-[85%] leading-relaxed transition-opacity">
            {getCaptionText(currentTime)}
          </div>
        )}

        {/* ── MINI-PLAYER CONTROLS ── */}
        {isMini && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center group-hover/mini:opacity-100 opacity-0 transition-opacity z-20">
            {/* Restore Button */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMiniPlayer(); }}
              className="absolute top-2 left-2 bg-black/75 hover:bg-black text-white p-1.5 rounded-lg border border-white/5 text-[10px] font-black uppercase transition cursor-pointer"
              title="Expand Player"
            >
              ⤢ Restore
            </button>
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleStopVideo(e); setIsMiniPlayer(false); }}
              className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white w-6 h-6 flex items-center justify-center rounded-lg border border-white/5 text-xs font-black transition cursor-pointer"
              title="Close Player"
            >
              ✕
            </button>
            {/* Center Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm shadow-lg border border-white/5 active:scale-95 transition"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            {/* Bottom mini scrubber */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
              <div
                className="h-full bg-teal-500 transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ── FULL YOUTUBE OVERLAY CONTROLS (Only when not mini-player) ── */}
        {!isMini && (
          <div
            className={`absolute inset-0 bg-black/35 flex flex-col justify-between p-4 z-10 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* ════════ TOP OVERLAY BAR ════════ */}
            <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
              {/* Left Minimize Chevron */}
              <button
                onClick={toggleMiniPlayer}
                className="p-2 bg-black/45 hover:bg-black/60 rounded-xl text-white border border-white/5 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center space-x-1"
                title="Minimize player"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-[10px] font-black uppercase">Mini</span>
              </button>

              {/* Right Menu Icons */}
              <div className="flex items-center space-x-2">
                {/* Cast Mock */}
                <button
                  onClick={() => showToast('info', 'Searching for local Cast screen devices...')}
                  className="p-2 bg-black/45 hover:bg-black/60 text-white rounded-xl border border-white/5 hover:scale-105 active:scale-95 transition cursor-pointer"
                  title="Screen Cast"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a5 5 0 015-5M8 12a10 10 0 0110 10m-10-10a15 15 0 0115 15M3 19a1 1 0 112 0 1 1 0 01-2 0z" />
                  </svg>
                </button>

                {/* CC Button */}
                <button
                  onClick={() => { setShowCc(!showCc); showToast('success', showCc ? 'Captions disabled' : 'Closed Captions enabled'); }}
                  className={`p-2 rounded-xl border hover:scale-105 active:scale-95 transition cursor-pointer ${
                    showCc
                      ? 'bg-teal-500 text-white border-teal-400'
                      : 'bg-black/45 hover:bg-black/60 text-slate-350 border-white/5'
                  }`}
                  title="Closed Captions (CC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2"/>
                    <path d="M7 9h3v1.5H8.5V11H10v1.5H7V9zm7 0h3v1.5H15.5V11H17v1.5H14V9z"/>
                  </svg>
                </button>

                {/* Settings Gear Cog */}
                <div className="relative">
                  <button
                    onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                    className={`p-2 rounded-xl border hover:scale-105 active:scale-95 transition cursor-pointer ${
                      showQualityMenu
                        ? 'bg-primary-600 text-white border-primary-500'
                        : 'bg-black/45 hover:bg-black/60 text-slate-355 border-white/5'
                    }`}
                    title="Player Settings"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" strokeWidth="2"/>
                    </svg>
                  </button>

                  {/* Settings Menu Cards */}
                  {showQualityMenu && (
                    <div className="absolute right-0 top-11 bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 w-48 z-40 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black p-2 border-b border-white/5">Video Config</span>
                      
                      {/* Playback speed trigger */}
                      <button
                        onClick={() => { setShowSpeedMenu(true); setShowQualityMenu(false); }}
                        className="flex items-center justify-between text-[11px] font-bold p-2 text-left text-slate-200 hover:bg-white/5 rounded-lg transition cursor-pointer"
                      >
                        <span>Playback Speed</span>
                        <span className="text-teal-400">{playbackSpeed}x ➔</span>
                      </button>

                      {/* Resolution select */}
                      <button
                        onClick={() => { setShowQualityMenu(false); setShowSpeedMenu(false); showToast('info', 'Change resolution under Quality selection'); }}
                        className="flex items-center justify-between text-[11px] font-bold p-2 text-left text-slate-200 hover:bg-white/5 rounded-lg transition cursor-pointer"
                      >
                        <span>Quality</span>
                        <span className="text-teal-400">{quality}</span>
                      </button>

                      {/* Quick Auto-play toggle */}
                      <div className="flex items-center justify-between p-2 border-t border-white/5 mt-1">
                        <span className="text-[10px] font-bold text-slate-400">Autoplay Next</span>
                        <input
                          type="checkbox"
                          checked={autoplay}
                          onChange={(e) => setAutoplay(e.target.checked)}
                          className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Playback speed Sub-menu */}
                  {showSpeedMenu && (
                    <div className="absolute right-0 top-11 bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 w-32 z-40 flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setShowSpeedMenu(false); setShowQualityMenu(true); }}
                        className="text-[9px] text-primary-400 uppercase tracking-widest font-black p-2 border-b border-white/5 hover:text-white transition text-left cursor-pointer"
                      >
                        🠔 Back
                      </button>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`text-[11px] font-bold py-1.5 px-3 rounded-lg text-left hover:bg-white/5 text-slate-200 cursor-pointer ${
                            playbackSpeed === speed ? 'text-teal-400 bg-teal-500/5' : ''
                          }`}
                        >
                          {speed}x {speed === 1 ? '(Normal)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ════════ CENTER CONTROLS OVERLAY ════════ */}
            <div className="flex items-center justify-center space-x-6 w-full" onClick={(e) => e.stopPropagation()}>
              {/* Skip Previous Lesson */}
              <button
                onClick={retreatPrevLesson}
                className="w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 flex items-center justify-center text-white border border-white/5 hover:scale-110 active:scale-95 transition duration-150 cursor-pointer shadow-lg"
                title="Previous Lecture"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              {/* Large Play/Pause Toggle */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-teal-500 hover:bg-teal-400 flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/10"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6zm8-14v14h4V5z"/>
                  </svg>
                ) : (
                  <svg className="w-7 h-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Skip Next Lesson */}
              <button
                onClick={advanceNextLesson}
                className="w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 flex items-center justify-center text-white border border-white/5 hover:scale-110 active:scale-95 transition duration-150 cursor-pointer shadow-lg"
                title="Next Lecture"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6l8.5 6L6 18zm9 0h2v12h-2z"/>
                </svg>
              </button>
            </div>

            {/* ════════ BOTTOM CONTROLS OVERLAY ════════ */}
            <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
              {/* Timeline Scrubber Timeline (Thin expands on hover) */}
              <div className="flex items-center space-x-3 w-full group/scrub">
                <span className="text-[10px] text-slate-350 font-semibold font-mono">{formatTime(currentTime)}</span>
                <div className="flex-grow relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleScrub}
                    className="w-full h-1 bg-slate-700/60 rounded-full appearance-none cursor-pointer accent-red-600 hover:h-1.5 transition-all duration-100"
                  />
                </div>
                <span className="text-[10px] text-slate-350 font-semibold font-mono">{formatTime(duration)}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  {/* Tiny Play/Pause */}
                  <button onClick={togglePlay} className="text-white hover:text-teal-400 transition cursor-pointer">
                    {isPlaying ? (
                      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>

                  {/* Volume Controller Mute */}
                  <div className="flex items-center space-x-2 group/vol">
                    <button onClick={toggleMute} className="text-white hover:text-teal-400 transition cursor-pointer">
                      {isMuted ? (
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                      ) : (
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/vol:w-16 h-1 bg-slate-700/60 rounded-full appearance-none cursor-pointer accent-teal-400 opacity-0 group-hover/vol:opacity-100 transition-all"
                    />
                  </div>

                  {/* "In this video >" Chapters Trigger Chip */}
                  <button
                    onClick={() => setShowChaptersPanel(!showChaptersPanel)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition ${
                      showChaptersPanel
                        ? 'bg-teal-500 text-white shadow shadow-teal-500/20'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/5'
                    } cursor-pointer`}
                  >
                    <span>moment</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* Right side icons */}
                <div className="flex items-center space-x-3.5">
                  {/* PiP */}
                  <button onClick={togglePip} className="text-slate-300 hover:text-teal-400 transition cursor-pointer" title="Floating Picture in Picture">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" stroke-width="2"/><rect x="13" y="11" width="6" height="6" rx="1" stroke-width="2" fill="currentColor"/></svg>
                  </button>

                  {/* Theatre Mode */}
                  <button
                    onClick={() => setIsTheatreMode(!isTheatreMode)}
                    className="hidden lg:block text-slate-300 hover:text-teal-400 transition cursor-pointer"
                    title={isTheatreMode ? "Exit Theatre Mode" : "Theatre Mode"}
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="1.5" stroke-width="2"/><path d="M15 6v12" stroke-width="1.5"/></svg>
                  </button>

                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="text-slate-300 hover:text-teal-400 transition cursor-pointer" title="Fullscreen">
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Syllabus Playlist outline helper
  const renderSyllabusPlaylist = () => {
    return (
      <div className="space-y-4 p-1">
        {(sections || []).map((sec, sIdx) => {
          return (
            <div key={sec.id} className="space-y-2 border-b border-surface-600/35 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between select-none px-1">
                <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">
                  Chapter {sIdx + 1}: {sec.title}
                </span>
                <span className="text-[9px] text-slate-500 font-bold">
                  {(sec.lessons || []).length} lectures
                </span>
              </div>
              <div className="space-y-1.5">
                {(sec.lessons || []).map((les, lIdx) => {
                  const isActive = activeLesson?.id === les.id;
                  return (
                    <div
                      key={les.id}
                      onClick={() => {
                        setActiveLesson(les);
                        setShowMobileSyllabus(false); // Close mobile sheet on select
                      }}
                      className={`group w-full p-2 rounded-2xl text-left flex items-center space-x-3 border transition-all duration-150 cursor-pointer select-none ${
                        isActive
                          ? 'bg-primary-600/10 border-primary-600/30 text-primary-400 font-bold shadow'
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-surface-700/25 hover:text-white'
                      }`}
                    >
                      {/* Lecture Index / Drag handle dots */}
                      <div className="flex flex-col items-center space-y-0.5 text-slate-600 shrink-0 select-none">
                        <span className="text-[9px] font-bold font-mono">
                          {sIdx + 1}.{lIdx + 1}
                        </span>
                        <div className="grid grid-cols-2 gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-400"></span>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-400"></span>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-400"></span>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-400"></span>
                        </div>
                      </div>

                      {/* Video Thumbnail (YouTube Playlist style) */}
                      <div className="relative w-20 h-11 bg-surface-950 border border-white/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-slate-600 shadow-sm">
                        {isActive ? (
                          /* Equalizer pulsing wave */
                          <div className="flex items-end space-x-0.5 h-3.5 select-none">
                            <span className="w-0.5 bg-primary-400 animate-pulse h-2"></span>
                            <span className="w-0.5 bg-primary-400 animate-pulse h-3.5" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-0.5 bg-primary-400 animate-pulse h-2.5" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        ) : (
                          /* Play Icon */
                          <svg className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        )}
                        
                        {/* Duration Badge */}
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 px-1 py-0.2 text-[8px] font-bold text-white rounded font-mono">
                          {les.durationString || '05:44'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-grow">
                        <h4 className="text-[11px] font-bold truncate leading-tight group-hover:text-white transition-colors">{les.title}</h4>
                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{les.description || 'No description available'}</p>
                      </div>

                      {/* Completed checkmark */}
                      <div className="shrink-0 select-none">
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-700/50 flex items-center justify-center text-[9px] font-bold text-teal-400 bg-teal-500/5 border-teal-500/20">
                          ✓
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Opening your learning environment..." />;
  }

  const liveClass = (liveSessions || []).find(s => s && s.status === 'LIVE');
  const hasVideo = !!activeLesson || (!!course && !!course.introVideoUrl);

  return (
    <div className="min-h-[85vh] bg-surface-900 flex flex-col lg:flex-row relative pb-20 lg:pb-0 lg:h-[calc(100vh-64px)] lg:overflow-hidden">

      {/* Toast popup */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* ── CENTER STAGE / LEFT COLUMN (Main player, Details, Tabs) ── */}
      <div className={`flex-grow p-4 md:p-6 space-y-6 mx-auto w-full lg:overflow-y-auto lg:h-full transition-all duration-300 ${isTheatreMode ? 'max-w-none' : 'max-w-5xl'}`}>
        {/* Live session alert banner */}
        {liveClass && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-2xl flex items-center justify-between animate-pulse select-none">
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

        {/* Video Frame Card */}
        {hasVideo ? (
          <div className="space-y-4">
            <div
              className={`bg-black rounded-3xl overflow-hidden border border-surface-600 shadow-2xl transition-all duration-300 w-full ${
                isMiniPlayer ? 'border-dashed border-teal-500/20' : ''
              }`}
              style={{
                aspectRatio: videoAspectRatio ? videoAspectRatio : '16/9',
                maxHeight: isFullscreen ? '100vh' : '70vh'
              }}
            >
              {isMiniPlayer ? (
                /* Main slot placeholder when mini-player is active */
                <div className="w-full h-full bg-surface-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary-600/10 flex items-center justify-center text-primary-400 text-2xl animate-pulse">
                    📺
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Playing in Mini-Player</h4>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal">
                      You can browse course contents while the lecture continues at the bottom corner of your screen.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMiniPlayer(false)}
                    className="bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-primary-600/10"
                  >
                    Restore Player
                  </button>
                </div>
              ) : (
                renderVideoPlayer(activeLesson ? activeLesson.videoUrl : course?.introVideoUrl, activeLesson ? activeLesson.title : "Course Introduction")
              )}
            </div>

            {/* Video metadata information & Actions Row */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-wider block">
                  {activeLesson ? `Lecture Unit` : `Course Preview`}
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  {activeLesson ? activeLesson.title : "Course Introduction"}
                </h2>
                <p className="text-slate-450 text-xs mt-1 leading-relaxed max-w-3xl">
                  {activeLesson ? activeLesson.description : course?.description}
                </p>
              </div>

              {/* YouTube Style Action Buttons row */}
              <div className="flex flex-wrap items-center gap-2.5 mt-2 border-y border-surface-600/35 py-3 select-none">
                {activeLesson && (
                  <button
                    onClick={handleMarkComplete}
                    className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-black px-4.5 py-2 rounded-xl transition shadow shadow-teal-500/10 flex items-center space-x-1.5 cursor-pointer transform active:scale-95"
                  >
                    <span>✓</span>
                    <span>Mark Complete & Next</span>
                  </button>
                )}

                {/* Ask AI Trigger */}
                <button
                  onClick={() => setShowAiChat(!showAiChat)}
                  className="bg-surface-700 hover:bg-surface-650 text-white border border-surface-600 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer transform active:scale-95"
                >
                  <span>🤖</span>
                  <span>Ask AI doubt</span>
                </button>

                {/* Notes Bookmark trigger */}
                <button
                  onClick={() => {
                    setActiveTab('notes');
                    document.getElementById('tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-surface-700 hover:bg-surface-655 text-white border border-surface-600 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer transform active:scale-95"
                >
                  <span>📝</span>
                  <span>Add Note</span>
                </button>

                {/* Downloads trigger */}
                <button
                  onClick={() => {
                    setActiveTab('downloads');
                    document.getElementById('tabs-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-surface-700 hover:bg-surface-655 text-white border border-surface-600 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer transform active:scale-95"
                >
                  <span>📥</span>
                  <span>Downloads</span>
                </button>
              </div>
            </div>

            {/* Collapsible Mobile Playlist Bar (YouTube style mix banner) */}
            <div className="lg:hidden mt-3" onClick={() => setShowMobileSyllabus(true)}>
              <div className="bg-surface-800 border border-surface-600/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-surface-750 transition shadow-sm">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-400 text-sm">🔁</div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider">Syllabus Playlist Queue</h4>
                    <p className="text-[10px] text-primary-400 font-bold truncate mt-0.5">
                      {activeLesson ? activeLesson.title : "Course Introduction"}
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 font-extrabold text-[11px] bg-white/5 px-2.5 py-1 rounded-lg">
                  {sections.length} Chapters ➔
                </div>
              </div>
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

        {/* Tabs Bar Segment */}
        <div id="tabs-section" className="bg-surface-800/60 border border-surface-600 rounded-2xl overflow-hidden shadow-lg scroll-mt-20">
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
                className={`px-5 py-3.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer shrink-0 ${activeTab === tab.id
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

            {/* Tab 2: Notes & Bookmarks */}
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
                    {resources.map(res => {
                      const isPdf = (res.fileUrl || '').toLowerCase().endsWith('.pdf') || (res.title || '').toLowerCase().endsWith('.pdf');
                      const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(res.fileUrl || '');
                      const canPreview = isPdf || isImg;
                      return (
                        <div key={res.id} className="p-3.5 bg-background/40 border border-border rounded-xl flex items-center justify-between">
                          <div className="min-w-0 pr-3">
                            <h5 className="text-xs font-bold text-white truncate">{res.title}</h5>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{res.resourceType}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {canPreview && (
                              <button
                                onClick={() => setPreviewUrl(res.fileUrl)}
                                className="bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 border border-primary-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                View 👁️
                              </button>
                            )}
                            <a
                              href={res.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                            >
                              Download 💾
                            </a>
                          </div>
                        </div>
                      );
                    })}
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

      {/* ── DESKTOP RIGHT PANEL / SIDEBAR (Syllabus outline playlist) ── */}
      <div className={`hidden lg:flex lg:flex-col lg:w-80 bg-surface-800/90 border-l border-surface-600 shrink-0 lg:h-full transition-all duration-300 ${
        isTheatreMode ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-0' : ''
      }`}>
        <div className="p-5 border-b border-surface-600 flex flex-col">
          <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">Syllabus Playlist</span>
          <h3 className="text-white font-bold text-base mt-1 line-clamp-1">{course?.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:max-h-[85vh]">
          {renderSyllabusPlaylist()}
        </div>
      </div>

      {/* ── MOBILE PLAYLIST BOTTOM DRAWER ── */}
      {showMobileSyllabus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop Click Close */}
          <div className="absolute inset-0" onClick={() => setShowMobileSyllabus(false)}></div>

          {/* Bottom Sheet Box */}
          <div className="relative w-full h-[75vh] bg-surface-800 border-t border-surface-600 rounded-t-3xl flex flex-col z-50 animate-slide-in p-4 overflow-hidden shadow-2xl">
            {/* Drag Handle Pill */}
            <div className="w-12 h-1 bg-surface-600 rounded-full mx-auto mb-4 shrink-0" onClick={() => setShowMobileSyllabus(false)}></div>

            <div className="flex justify-between items-center pb-3 border-b border-surface-600 mb-4 shrink-0">
              <div>
                <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-widest block">Syllabus Queue</span>
                <h3 className="text-sm font-black text-white leading-tight max-w-[200px] truncate">{course?.title}</h3>
              </div>
              <button
                onClick={() => setShowMobileSyllabus(false)}
                className="text-slate-400 hover:text-white text-xs font-black bg-surface-700/50 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* Scroll list */}
            <div className="flex-grow overflow-y-auto py-4 space-y-2">
              {renderSyllabusPlaylist()}
            </div>
          </div>
        </div>
      )}

      {/* ── TIMESTAMPTED KEY MOMENTS / CHAPTERS SIDE PANEL ── */}
      {showChaptersPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end lg:justify-start lg:absolute lg:inset-y-0 lg:right-0 lg:left-auto lg:w-80 lg:bg-slate-950/95 lg:border-l lg:border-white/10 lg:shadow-2xl animate-slide-in">
          {/* Backdrop click on mobile */}
          <div className="absolute inset-0 lg:hidden" onClick={() => setShowChaptersPanel(false)}></div>

          <div className="relative bg-surface-800 lg:bg-transparent border-t lg:border-t-0 border-surface-600 rounded-t-3xl lg:rounded-none p-5 flex flex-col h-[60vh] lg:h-full z-10 overflow-hidden">
            {/* Mobile drag handle */}
            <div className="lg:hidden w-12 h-1 bg-surface-600 rounded-full mx-auto mb-3 shrink-0" onClick={() => setShowChaptersPanel(false)}></div>

            <div className="flex justify-between items-center pb-3.5 border-b border-surface-600/40 shrink-0">
              <div>
                <span className="text-[9px] text-teal-400 font-extrabold uppercase tracking-widest block">Lecture Chapters</span>
                <h3 className="text-sm font-black text-white">In this video</h3>
              </div>
              <button
                onClick={() => setShowChaptersPanel(false)}
                className="text-slate-400 hover:text-white text-xs font-black bg-surface-700/40 lg:bg-white/5 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* Chapters list */}
            <div className="flex-grow overflow-y-auto py-4 space-y-2.5">
              {getActiveChapters().map((ch, idx) => {
                const isActiveChapter = currentTime >= ch.time && (idx === getActiveChapters().length - 1 || currentTime < getActiveChapters()[idx + 1].time);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      seekToTimestamp(ch.time);
                      // Close chapters drawer on mobile on select
                      if (window.innerWidth <= 1024) {
                        setShowChaptersPanel(false);
                      }
                    }}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                      isActiveChapter
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-bold'
                        : 'bg-surface-900/40 border-surface-600/20 text-slate-350 hover:bg-surface-700/40'
                    }`}
                  >
                    <span className="text-[10px] font-black font-mono bg-black/45 border border-white/5 px-2 py-0.5 rounded-md text-slate-300">
                      {formatTime(ch.time)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] block leading-tight">{ch.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Doubt Solver Trigger FAB (Sticky right corner) */}
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-40">
        <span className="absolute inset-0 rounded-full bg-primary-600/30 animate-ping duration-[2000ms]"></span>
        <button
          onClick={() => setShowAiChat(!showAiChat)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-primary-light flex items-center justify-center text-white shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 transition-all z-10 select-none cursor-pointer border border-white/10"
          title="Open AI Doubt Assistant"
        >
          <svg className="w-6.5 h-6.5 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>

      {/* ══════════════════ RESPONSIVE SLIDE AI DOUBT DRAWER ══════════════════ */}
      {showAiChat && (
        <div className="fixed bottom-0 left-0 right-0 h-[80vh] md:h-full md:w-[450px] md:right-0 md:left-auto md:top-0 bg-surface-800 border-t md:border-t-0 md:border-l border-surface-600 rounded-t-3xl md:rounded-t-none shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden">
          {/* Mobile Swipe pill drag handle */}
          <div className="md:hidden w-12 h-1 bg-surface-600 rounded-full mx-auto my-2.5 shrink-0" onClick={() => setShowAiChat(false)}></div>

          {/* Header */}
          <div className="p-4 border-b border-surface-600 flex justify-between items-center bg-background/50 select-none shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Toggle Recents Button */}
              <button
                onClick={() => setShowThreadList(!showThreadList)}
                className={`p-1.5 rounded-lg border transition shrink-0 ${showThreadList ? 'bg-primary-600/20 border-primary-600 text-primary-400' : 'bg-surface-700/50 border-surface-600 text-slate-400 hover:text-white'} cursor-pointer`}
                title="Toggle Past Chats"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="min-w-0">
                <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-widest block">AI Doubt assistant</span>
                <h3 className="font-extrabold text-[11px] text-white truncate max-w-[140px] mt-0.5">
                  {activeThreadId ? (threads.find(t => t.id === activeThreadId)?.title || "Current Chat") : "New Chat"}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* New Chat Button */}
              <button
                onClick={startNewChat}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-lg text-[9px] font-black uppercase shadow-md shadow-teal-500/10 cursor-pointer"
                title="Start New Chat"
              >
                <span>+</span>
                <span>New Chat</span>
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={() => setShowAiChat(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Messages or Threads List */}
          {showThreadList ? (
            <div className="flex-grow overflow-y-auto p-4.5 space-y-2 bg-surface-900/20">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Recents</span>
              {threads.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  <span className="text-3xl block mb-2">💬</span>
                  <p className="font-extrabold text-white">No past conversations</p>
                  <p className="text-[10px] mt-1 text-slate-600">Start asking doubts to save your chats.</p>
                </div>
              ) : (
                threads.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => selectThread(thread.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${activeThreadId === thread.id
                      ? 'bg-primary-600/10 border-primary-600/30 text-primary-400 shadow'
                      : 'bg-surface-850 border-surface-650 text-slate-355 hover:bg-surface-700/60 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <span className="text-xs shrink-0">💬</span>
                      <span className="text-[11px] font-bold truncate pr-2">{thread.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 cursor-pointer shrink-0 transition"
                      title="Delete Chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto p-4.5 space-y-4">
              {(chatMessages || []).length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs max-w-xs mx-auto space-y-2 border border-dashed border-white/5 rounded-2xl bg-white/2">
                  <span className="text-3xl block">🤖</span>
                  <p className="font-extrabold text-white">Ask me anything!</p>
                  <p className="leading-relaxed text-[10px] text-slate-450">I can answer code questions, write code templates, or explain syllabus points.</p>
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
                        <div
                          className="bg-primary-600/10 border border-primary-600/20 text-violet-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs max-w-[90%] leading-relaxed ai-response-bubble"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.response) }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-primary-600/5 text-primary-400 border border-primary-600/10 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center space-x-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick suggestion chips */}
          <div className="px-4.5 py-2.5 bg-background/25 border-t border-border flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestionChips.map(chip => (
              <button
                key={chip}
                onClick={() => submitToAi(chip)}
                className="bg-card hover:bg-card-light text-[10px] text-teal-400 border border-border px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition select-none cursor-pointer shrink-0"
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

      {/* ── FLOATING MINI-PLAYER (Always sits at bottom corner if enabled) ── */}
      {isMiniPlayer && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 w-80 md:w-96 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50 animate-scale-in group/mini">
          {renderVideoPlayer(activeLesson ? activeLesson.videoUrl : course?.introVideoUrl, activeLesson ? activeLesson.title : "Course Introduction", true)}
        </div>
      )}

      {/* ── Inline Resource Preview Modal ── */}
      {previewUrl && (
        <Modal
          isOpen={!!previewUrl}
          onClose={() => setPreviewUrl(null)}
          title="Study Material Viewer"
        >
          <div className="w-full h-[75vh] bg-surface-900 rounded-xl overflow-hidden relative border border-white/5">
            {previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                title="PDF Preview"
                className="w-full h-full border-0"
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950/40">
                <img
                  src={previewUrl}
                  alt="Resource Preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CourseLearn;
