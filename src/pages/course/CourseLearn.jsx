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
  const [skipIndicator, setSkipIndicator] = useState({ show: false, dir: 'fwd' });
  const [showCc, setShowCc] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsSubMenu, setSettingsSubMenu] = useState(null); // 'speed' | 'quality' | null
  const [upNextCountdown, setUpNextCountdown] = useState(null);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  const [activityTick, setActivityTick] = useState(0);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);

  const resetControlsTimer = () => {
    setShowControls(true);
    setActivityTick(prev => prev + 1);
  };

  const triggerHaptic = (type = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') {
        navigator.vibrate(10);
      } else if (type === 'medium') {
        navigator.vibrate(20);
      } else if (type === 'success') {
        navigator.vibrate([15, 30, 15]);
      }
    }
  };


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
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = time;
      } catch (err) {
        console.error("Seeking error:", err);
      }
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

  // Prevent background scrolling when in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Sync orientation changes to JavaScript state
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 1024;
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isMobile && isLandscape) {
        setIsFullscreen(true);
      } else if (isMobile && !isLandscape) {
        setIsFullscreen(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
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
      triggerHaptic('success');

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
    triggerHaptic('light');
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowControls(true);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        // Reset controls timer when starting to play so they auto-hide
        setActivityTick(prev => prev + 1);
      }
    }
  };

  const handlePlayerClick = (e) => {
    // If clicking on interactive controls/menus, let them handle themselves
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('select') ||
      e.target.closest('.yt-settings-menu') ||
      e.target.closest('.yt-upnext-enter')
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap -> Seek
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      handleDoubleSeek(isRightHalf ? 'fwd' : 'back');
    } else {
      // Single tap candidate -> Toggle controls visibility
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      tapTimeoutRef.current = setTimeout(() => {
        setShowControls(prev => {
          const nextVal = !prev;
          if (nextVal) {
            setActivityTick(tick => tick + 1);
          }
          return nextVal;
        });
        setShowSettingsMenu(false);
        setSettingsSubMenu(null);
        tapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
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

      // Up Next auto-advance trigger at 90% completion
      if (autoplay && duration > 0 && curTime >= duration * 0.9 && !upNextDismissed && upNextCountdown === null) {
        setUpNextCountdown(5);
      }
    }
  };

  // Up Next countdown timer
  useEffect(() => {
    if (upNextCountdown === null || upNextCountdown <= 0) return;
    const timer = setTimeout(() => {
      if (upNextCountdown === 1) {
        advanceNextLesson();
        setUpNextCountdown(null);
        setUpNextDismissed(false);
      } else {
        setUpNextCountdown(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upNextCountdown]);

  // Reset up-next state when lesson changes
  useEffect(() => {
    setUpNextCountdown(null);
    setUpNextDismissed(false);
  }, [activeLesson]);

  // Auto-hide controls when playing after 2.5 seconds of no activity
  useEffect(() => {
    if (isPlaying && showControls) {
      if (showSettingsMenu || settingsSubMenu) return;
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, showControls, showSettingsMenu, settingsSubMenu, activityTick]);

  // Auto-scroll AI Chat messages pane to the bottom when messages load or change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  // Scrubber hover handler for time tooltip
  const handleScrubHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * (duration || 0);
    setHoverTime(time);
    setHoverPosition(Math.max(0, Math.min(100, pos * 100)));
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

    triggerHaptic('light');

    const lockLandscape = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
          console.warn("Orientation lock failed:", err);
        });
      }
    };

    const unlockOrientation = () => {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
      }
    };

    if (document.fullscreenElement || isFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
          unlockOrientation();
        }).catch(err => {
          console.error("Exit fullscreen failed:", err);
          setIsFullscreen(false);
          unlockOrientation();
        });
      } else {
        // Fallback to CSS fullscreen
        setIsFullscreen(false);
        unlockOrientation();
      }
    } else {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
          lockLandscape();
        }).catch(err => {
          console.warn("Native fullscreen failed, trying Safari fallback or CSS fallback:", err);
          if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
            videoRef.current.webkitEnterFullscreen();
          } else {
            setIsFullscreen(true);
            showToast('info', 'Rotate your phone sideways for the best view! 📱');
          }
        });
      } else if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
        // iOS Safari element-level fullscreen fallback
        try {
          videoRef.current.webkitEnterFullscreen();
        } catch (err) {
          console.warn("webkitEnterFullscreen failed:", err);
          setIsFullscreen(true);
          showToast('info', 'Rotate your phone sideways for the best view! 📱');
        }
      } else {
        // CSS fallback
        setIsFullscreen(true);
        showToast('info', 'Rotate your phone sideways for the best view! 📱');
      }
    }
  };

  // Sync state with native fullscreen changes (e.g. Escape key, back button, swipe-out)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFull = !!document.fullscreenElement;
      setIsFullscreen(isNativeFull);
      if (!isNativeFull && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Mock CC subtitles track mapping
  const getCaptionText = (time) => {
    if (time >= 0 && time < 10) return "Welcome to this LMS learning module! Let's get started.";
    if (time >= 10 && time < 25) return "In this unit, we will cover the core architectures and layout standards.";
    if (time >= 25 && time < 45) return "Make sure to write down any doubts and ask the AI Doubt Assistant on your right.";
    if (time >= 45 && time < 65) return "Let's review the custom code blocks and component structures below.";
    if (time >= 65 && time < 90) return "Feel free to add timestamped bookmarks and notes as we go.";
    if (time >= 90 && time < 120) return "We will now demonstrate the responsive layouts and study features.";
    return null;
  };

  const handleDoubleSeek = (dir) => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const videoDuration = videoRef.current.duration || duration || 0;
    let target = dir === 'fwd' ? current + 10 : current - 10;
    target = Math.max(0, videoDuration > 0 ? Math.min(videoDuration, target) : target);
    safeSeek(target);
    setCurrentTime(target);
    setSkipIndicator({ show: true, dir });
    setTimeout(() => setSkipIndicator({ show: false, dir }), 600);
  };

  const retreatPrevLesson = () => {
    let prevLes = null;
    for (const sec of (sections || [])) {
      for (const les of (sec.lessons || [])) {
        if (les.id === activeLesson?.id) {
          if (prevLes) { setActiveLesson(prevLes); return; }
        }
        prevLes = les;
      }
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

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Get next lesson title for Up Next card
    const getNextLessonTitle = () => {
      let found = false;
      for (const sec of (sections || [])) {
        for (const les of (sec.lessons || [])) {
          if (found) return les.title;
          if (les.id === activeLesson?.id) found = true;
        }
      }
      return null;
    };

    // HTML5 native video player with Premium YouTube-Style Controls
    return (
      <div
        ref={playerContainerRef}
        onClick={handlePlayerClick}
        onMouseMove={resetControlsTimer}
        onTouchMove={resetControlsTimer}
        style={{ touchAction: 'manipulation' }}
        className={`video-player-container w-full h-full relative group bg-black flex items-center justify-center select-none overflow-hidden cursor-default ${
          isFullscreen ? 'is-fullscreen-mode' : ''
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
          playsInline
          webkit-playsinline="true"
          className="w-full h-full object-contain bg-black pointer-events-none"
        />

        {/* ── SEEK RIPPLE FEEDBACK ── */}
        {skipIndicator.show && (
          <div className={`absolute top-1/2 -translate-y-1/2 z-25 pointer-events-none ${
            skipIndicator.dir === 'back' ? 'left-1/4' : 'right-1/4'
          }`}>
            <div className="yt-seek-ripple rounded-full w-20 h-20 bg-white/10 flex flex-col items-center justify-center">
              <span className="text-white text-base font-bold">{skipIndicator.dir === 'back' ? '◀◀' : '▶▶'}</span>
              <span className="text-white text-[9px] font-black uppercase mt-0.5">10s</span>
            </div>
          </div>
        )}

        {/* ── BUFFER SPINNER ── */}
        {buffering && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 pointer-events-none">
            <svg className="animate-spin h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* ── CLOSED CAPTIONS ── */}
        {showCc && getCaptionText(currentTime) && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/90 px-5 py-2 rounded-lg text-white text-[11px] md:text-xs font-semibold text-center z-15 select-none pointer-events-none max-w-[85%] leading-relaxed">
            {getCaptionText(currentTime)}
          </div>
        )}

        {/* ── ALWAYS-VISIBLE THIN RED PROGRESS LINE (when controls hidden) ── */}
        {!showControls && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20 pointer-events-none">
            <div className="h-full bg-red-600 yt-progress-mini" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {/* ── UP NEXT AUTO-ADVANCE CARD ── */}
        {upNextCountdown !== null && upNextCountdown > 0 && getNextLessonTitle() && (
          <div className="absolute bottom-20 right-4 z-35 yt-upnext-enter" onClick={(e) => e.stopPropagation()}>
            <div className="bg-surface-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-64 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Up Next</span>
                <button
                  onClick={() => { setUpNextCountdown(null); setUpNextDismissed(true); }}
                  className="text-slate-500 hover:text-white text-xs cursor-pointer transition"
                >✕</button>
              </div>
              <h4 className="text-white text-xs font-bold truncate">{getNextLessonTitle()}</h4>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-[11px] font-black">
                    {upNextCountdown}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">seconds</span>
                </div>
                <button
                  onClick={() => { advanceNextLesson(); setUpNextCountdown(null); }}
                  className="bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >Play Now</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            YOUTUBE-STYLE FULL OVERLAY CONTROLS
            ══════════════════════════════════════════════════════════ */}
        <div
          className={`absolute inset-0 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* ════ TOP BAR (with gradient) ════ */}
          <div className="yt-top-gradient absolute top-0 left-0 right-0 px-4 pt-3 pb-6 md:pb-8 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              {/* Left spacer/layout alignment (CC and Settings on the right) */}
              <div className="w-8 h-8 md:hidden" />

              {/* Video Title (center) */}
              <h3 className="text-white text-xs font-bold truncate max-w-[50%] mx-3 hidden md:block">{title}</h3>

              {/* Right: CC + Settings */}
              <div className="flex items-center space-x-1.5 ml-auto">
                {/* CC Button */}
                <button
                  onClick={() => { setShowCc(!showCc); }}
                  className={`p-2 rounded-full transition cursor-pointer ${
                    showCc
                      ? 'bg-white text-black'
                      : 'bg-black/40 hover:bg-black/60 text-white'
                  }`}
                  title="Closed Captions"
                  aria-label="Toggle Closed Captions"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2"/>
                    <text x="6" y="15" fill="currentColor" fontSize="8" fontWeight="bold" stroke="none">CC</text>
                  </svg>
                </button>

                {/* Settings Gear */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setSettingsSubMenu(null);
                    }}
                    className={`p-2 rounded-full transition cursor-pointer ${
                      showSettingsMenu
                        ? 'bg-white/20 text-white'
                        : 'bg-black/40 hover:bg-black/60 text-white'
                    }`}
                    title="Settings"
                    aria-label="Player Settings"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${showSettingsMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                      <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                    </svg>
                  </button>

                  {/* ── Settings Dropdown ── */}
                  {showSettingsMenu && !settingsSubMenu && (
                    <div className="yt-settings-menu absolute right-0 top-10 md:top-11 bg-neutral-900/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl w-44 md:w-52 z-40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSettingsSubMenu('speed')}
                        className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 text-[11px] md:text-[12px] text-slate-200 hover:bg-white/5 transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                          <span className="font-semibold">Playback speed</span>
                        </div>
                        <span className="text-slate-400 text-[10px] md:text-[11px] font-medium">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`} ›</span>
                      </button>
                      <button
                        onClick={() => setSettingsSubMenu('quality')}
                        className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 text-[11px] md:text-[12px] text-slate-200 hover:bg-white/5 transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                          <span className="font-semibold">Quality</span>
                        </div>
                        <span className="text-slate-400 text-[10px] md:text-[11px] font-medium">{quality} ›</span>
                      </button>
                      <div className="border-t border-white/5">
                        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            <span className="text-[11px] md:text-[12px] text-slate-200 font-semibold">Autoplay</span>
                          </div>
                          <button
                            onClick={() => setAutoplay(!autoplay)}
                            className={`w-8 h-4.5 md:w-9 md:h-5 rounded-full transition-colors duration-200 cursor-pointer relative ${autoplay ? 'bg-red-600' : 'bg-slate-600'}`}
                          >
                            <span className={`absolute top-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white shadow transition-transform duration-200 ${autoplay ? 'translate-x-3.5 md:translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Speed Sub-menu ── */}
                  {showSettingsMenu && settingsSubMenu === 'speed' && (
                    <div className="yt-settings-menu absolute right-0 top-10 md:top-11 bg-neutral-900/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl w-40 md:w-44 z-40 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSettingsSubMenu(null)}
                        className="w-full flex items-center space-x-2 px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer border-b border-white/5 shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                        <span className="font-bold uppercase tracking-wider">Speed</span>
                      </button>
                      <div className="max-h-[110px] md:max-h-[220px] overflow-y-auto scrollbar-none flex flex-col">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => { handleSpeedChange(speed); setShowSettingsMenu(false); setSettingsSubMenu(null); }}
                            className={`w-full flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2.5 text-[11px] md:text-[12px] hover:bg-white/5 transition cursor-pointer shrink-0 ${
                              playbackSpeed === speed ? 'text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                            {playbackSpeed === speed && (
                              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Quality Sub-menu ── */}
                  {showSettingsMenu && settingsSubMenu === 'quality' && (
                    <div className="yt-settings-menu absolute right-0 top-10 md:top-11 bg-neutral-900/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl w-40 md:w-44 z-40 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSettingsSubMenu(null)}
                        className="w-full flex items-center space-x-2 px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer border-b border-white/5 shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                        <span className="font-bold uppercase tracking-wider">Quality</span>
                      </button>
                      <div className="max-h-[110px] md:max-h-[220px] overflow-y-auto scrollbar-none flex flex-col">
                        {['Auto', '1080p', '720p', '480p', '360p'].map(q => (
                          <button
                            key={q}
                            onClick={() => { handleQualityChange(q); setShowSettingsMenu(false); setSettingsSubMenu(null); }}
                            className={`w-full flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2.5 text-[11px] md:text-[12px] hover:bg-white/5 transition cursor-pointer shrink-0 ${
                              quality === q ? 'text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            <span>{q}</span>
                            {quality === q && (
                              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ════ CENTER CONTROLS ════ */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center space-x-8 md:space-x-14 z-20 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Previous Lesson */}
            <button
              onClick={retreatPrevLesson}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition duration-150 cursor-pointer"
              title="Previous Lecture"
              aria-label="Previous Lecture"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Large Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 md:w-[64px] md:h-[64px] rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer yt-play-glow"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6zm8-14v14h4V5z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Next Lesson */}
            <button
              onClick={advanceNextLesson}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition duration-150 cursor-pointer"
              title="Next Lecture"
              aria-label="Next Lecture"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6l8.5 6L6 18zm9 0h2v12h-2z"/>
              </svg>
            </button>
          </div>

          {/* ════ BOTTOM CONTROLS (with gradient) ════ */}
          <div className="yt-bottom-gradient absolute bottom-0 left-0 right-0 px-3 md:px-4 pb-3 md:pb-3 pt-6 md:pt-10 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Timeline Scrubber */}
            <div
              className="relative w-full mb-2 group/scrub"
              onMouseMove={handleScrubHover}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Buffered + Played visual track */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] group-hover/scrub:h-[5px] bg-white/15 rounded-full transition-all overflow-hidden pointer-events-none">
                {/* Buffered bar (simulated at ~70%) */}
                <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${Math.min(progressPercent + 15, 100)}%` }} />
                {/* Played bar */}
                <div className="absolute inset-y-0 left-0 bg-red-600 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
              {/* Invisible range input */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleScrub}
                className="yt-scrubber"
              />
              {/* Hover Time Tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-8 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none transition-opacity"
                  style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between w-full">
              {/* Left controls */}
              <div className="flex items-center space-x-3">
                {/* Small Play/Pause */}
                <button onClick={togglePlay} className="text-white hover:text-white/80 transition cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                {/* Next */}
                <button onClick={advanceNextLesson} className="text-white hover:text-white/80 transition cursor-pointer" aria-label="Next Lecture">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6l8.5 6L6 18zm9 0h2v12h-2z"/></svg>
                </button>

                {/* Volume (hidden on mobile) */}
                <div className="hidden md:flex items-center space-x-1 group/vol">
                  <button onClick={toggleMute} className="text-white hover:text-white/80 transition cursor-pointer" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="yt-volume w-0 group-hover/vol:w-16 opacity-0 group-hover/vol:opacity-100 transition-all duration-200"
                  />
                </div>

                {/* Timestamp */}
                <span className="text-white text-[11px] font-medium select-none">
                  {formatTime(currentTime)} <span className="text-white/50">/</span> {formatTime(duration)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center space-x-2.5">
                {/* PiP */}
                <button onClick={togglePip} className="text-white hover:text-white/80 transition cursor-pointer" title="Picture in Picture" aria-label="Picture in Picture">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>
                </button>

                {/* Theatre Mode (Desktop only) */}
                <button
                  onClick={() => setIsTheatreMode(!isTheatreMode)}
                  className="hidden lg:block text-white hover:text-white/80 transition cursor-pointer"
                  title={isTheatreMode ? 'Default view' : 'Theatre mode'}
                  aria-label="Theatre mode"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z"/></svg>
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition cursor-pointer" title="Fullscreen" aria-label="Toggle Fullscreen">
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="min-h-[85vh] bg-surface-900 flex flex-col lg:flex-row relative pb-20 lg:pb-0 lg:h-[calc(100dvh-64px)] lg:overflow-hidden">

      {/* Toast popup */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* ── SYLLABUS OUTLINE SIDEBAR / BOTTOM PANEL ── */}
      <div className={`flex flex-col w-full lg:w-80 bg-surface-800/90 border-t lg:border-t-0 lg:border-r border-surface-600 shrink-0 lg:h-full transition-all duration-300 order-last lg:order-first ${
        isTheatreMode ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-0' : ''
      }`}>
        <div className="p-5 border-b border-surface-600 flex flex-col">
          <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">SYLLABUS OUTLINE</span>
          <h3 className="text-white font-bold text-base mt-1 line-clamp-1">{course?.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:max-h-[85vh]">
          {renderSyllabusPlaylist()}
        </div>
      </div>

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
              className="bg-black -mx-4 md:mx-0 rounded-none md:rounded-2xl overflow-hidden border-x-0 md:border border-surface-600 shadow-2xl transition-all duration-300 w-auto md:w-full"
              style={{
                aspectRatio: (!videoAspectRatio) ? '16/9' : (videoAspectRatio >= 1 ? videoAspectRatio : undefined),
                height: (videoAspectRatio && videoAspectRatio < 1) ? '65vh' : undefined,
                maxHeight: isFullscreen ? '100vh' : '70vh'
              }}
            >
              {renderVideoPlayer(activeLesson ? activeLesson.videoUrl : course?.introVideoUrl, activeLesson ? activeLesson.title : "Course Introduction")}
            </div>

            {/* Video metadata information & Actions Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2 border-b border-surface-600/35 pb-4">
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

              {activeLesson && (
                <button
                  onClick={handleMarkComplete}
                  className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-black px-4.5 py-2.5 rounded-xl transition shadow shadow-teal-500/10 flex items-center space-x-1.5 cursor-pointer transform active:scale-95 shrink-0 self-start md:self-auto"
                >
                  <span>Mark Complete & Next</span>
                  <span>✓</span>
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

        {/* Tabs Bar Segment */}
        <div id="tabs-section" className="bg-surface-800/60 -mx-4 md:mx-0 border-y md:border border-surface-600 rounded-none md:rounded-2xl overflow-hidden shadow-lg scroll-mt-20">
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
                    className="flex-grow bg-surface-900 border border-surface-600 rounded-xl px-4 py-2.5 text-[16px] md:text-xs text-white focus:outline-none focus:border-teal-500"
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
              <div ref={chatEndRef} />
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
              className="flex-grow bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-3 text-[16px] md:text-xs focus:outline-none focus:border-teal-500"
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
