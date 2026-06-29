import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const LiveClassroom = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve sessionId securely from state or API fallback
  const [sessionId, setSessionId] = useState(location.state?.sessionId || null);
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState(null);

  // States
  const [participants, setParticipants] = useState([]);
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showPeople, setShowPeople] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);

  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Local camera preview ref inside classroom
  const localVideoRef = useRef(null);

  // Join parameters passed from Gate lobby state
  const joinParams = location.state || {
    micEnabled: false,
    camEnabled: false,
    role: localStorage.getItem('role') || 'GUEST',
    name: localStorage.getItem('userName') || sessionStorage.getItem('guestName') || 'Guest'
  };

  const myRole = joinParams.role;
  const myName = joinParams.name;
  const isTeacher = myRole === 'TEACHER' || myRole === 'ADMIN';

  // Construct WebSocket signaling URL
  const tokenParam = localStorage.getItem('token') ? `?token=${localStorage.getItem('token')}` : '';
  
  // Dynamically resolve signaling server URL based on the environment to support mobile and HTTPS
  const getWebSocketUrl = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    if (apiBaseUrl) {
      const isSecure = apiBaseUrl.startsWith('https:');
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const cleanHost = apiBaseUrl.replace(/^(https?:\/\/)/, '').replace(/\/api\/?$/, '');
      return `${wsProtocol}//${cleanHost}/ws/signaling${tokenParam}`;
    } else {
      const isSecure = window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const host = window.location.host;
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `ws://localhost:8080/ws/signaling${tokenParam}`;
      }
      return `${wsProtocol}//${host}/ws/signaling${tokenParam}`;
    }
  };

  const wsUrl = getWebSocketUrl();

  // Ref to hold WebRTC handler functions to avoid hook dependency loop
  const rtcHandlersRef = useRef({
    initiateCall: null,
    handleOffer: null,
    handleAnswer: null,
    handleIceCandidate: null,
    removePeer: null
  });

  // ── 1. WebSocket signaling event dispatcher ──
  const onWebSocketMessage = useCallback((message) => {
    const { type, payload } = message;
    
    switch (type) {
      case 'ROOM_JOINED':
        console.log('[Classroom] Room joined successfully. My WS ID:', payload.yourSessionId);
        setParticipants(payload.participants || []);
        setChatMessages(payload.chatHistory || []);
        if (isTeacher && rtcHandlersRef.current.initiateCall) {
          payload.participants?.forEach(p => {
            if (p.sessionId !== payload.yourSessionId) {
              console.log('[Classroom] Initiating call to existing participant:', p.name);
              rtcHandlersRef.current.initiateCall(p.sessionId, p.name, p.role);
            }
          });
        }
        break;

      case 'PARTICIPANT_JOINED':
        console.log('[Classroom] Participant joined:', payload.name);
        setParticipants(payload.participants || []);
        // If I am the Teacher, initiate call with the new peer
        if (isTeacher && rtcHandlersRef.current.initiateCall) {
          rtcHandlersRef.current.initiateCall(payload.sessionId, payload.name, payload.role);
        }
        break;

      case 'PARTICIPANT_LEFT':
        console.log('[Classroom] Participant left:', payload.sessionId);
        setParticipants(payload.participants || []);
        if (rtcHandlersRef.current.removePeer) {
          rtcHandlersRef.current.removePeer(payload.sessionId);
        }
        break;

      case 'OFFER':
        // Student receives offer from teacher
        if (rtcHandlersRef.current.handleOffer) {
          rtcHandlersRef.current.handleOffer(payload.senderId, payload.sdp, participantsRef.current);
        }
        break;

      case 'ANSWER':
        // Teacher receives answer from student
        if (rtcHandlersRef.current.handleAnswer) {
          rtcHandlersRef.current.handleAnswer(payload.senderId, payload.sdp);
        }
        break;

      case 'ICE_CANDIDATE':
        if (rtcHandlersRef.current.handleIceCandidate) {
          rtcHandlersRef.current.handleIceCandidate(payload.senderId, payload);
        }
        break;

      case 'CHAT_MESSAGE':
        setChatMessages(prev => [...prev, payload]);
        break;

      case 'MUTE_TOGGLE':
        setParticipants(prev => prev.map(p => {
          if (p.sessionId === payload.sessionId) {
            return {
              ...p,
              audioMuted: payload.mediaType === 'audio' ? payload.muted : p.audioMuted,
              videoMuted: payload.mediaType === 'video' ? payload.muted : p.videoMuted
            };
          }
          return p;
        }));
        break;

      case 'SCREEN_SHARE':
        setParticipants(prev => prev.map(p => {
          if (p.sessionId === payload.sessionId) {
            return { ...p, isSharingScreen: payload.sharing };
          }
          return p;
        }));
        break;

      case 'ERROR':
        console.error('[SignalingWS Error]', payload.message);
        break;

      default:
        break;
    }
  }, [isTeacher]);

  const onConnectRef = useRef(null);

  // Connect to WS signaling
  const { connect, disconnect, send: wsSend } = useWebSocket(
    wsUrl,
    onWebSocketMessage,
    useCallback(() => {
      if (onConnectRef.current) {
        onConnectRef.current();
      }
    }, [])
  );

  // Initialize WebRTC logic
  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    connectionQuality,
    initLocalStream,
    initiateCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    removePeer,
    screenStreamRef,
    cleanUp: rtcCleanUp
  } = useWebRTC(sessionId, null, myRole, wsSend);

  // Sync WebRTC functions to the ref so onWebSocketMessage can access them
  useEffect(() => {
    rtcHandlersRef.current = {
      initiateCall,
      handleOffer,
      handleAnswer,
      handleIceCandidate,
      removePeer
    };
  }, [initiateCall, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

  // Ref to track session ID without re-triggering effects
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Keep the JOIN_ROOM payload sender callback updated with latest state
  useEffect(() => {
    onConnectRef.current = () => {
      if (!sessionIdRef.current) {
        console.log('[Classroom] sessionId is not resolved yet. Postponing JOIN_ROOM...');
        return;
      }
      console.log('[Classroom] WebSocket connection opened/reconnected. Sending JOIN_ROOM for session:', sessionIdRef.current);
      wsSend('JOIN_ROOM', sessionIdRef.current, {
        name: myName,
        role: myRole,
        userId: localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null,
        audioMuted: !joinParams.micEnabled,
        videoMuted: !joinParams.camEnabled
      });
    };
  }, [myName, myRole, wsSend, joinParams.micEnabled, joinParams.camEnabled]);

  // ── 2. Initialize Media Devices & Establish Socket ──
  useEffect(() => {
    const startClassroom = async () => {
      try {
        let activeSessionId = sessionIdRef.current;
        
        // Fetch session info by roomToken if we don't have the sessionId
        if (!activeSessionId) {
          console.log('[Classroom] Resolving sessionId from roomToken:', roomToken);
          const resp = await api.get(`/live/room/${roomToken}`);
          const data = resp.data.data;
          activeSessionId = data.sessionId;
          setSessionId(activeSessionId);
          setSessionDetails(data);
        } else if (joinParams.title && joinParams.courseName) {
          setSessionDetails({
            title: joinParams.title,
            courseName: joinParams.courseName,
            teacherName: joinParams.teacherName
          });
        } else {
          // Fetch full session details using fallback
          const resp = await api.get(`/live/room/token-bypass-fallback/${activeSessionId}`).catch(async () => {
            const fallback = await api.get(`/live/my-sessions`);
            const found = fallback.data.data?.find(s => s.id.toString() === activeSessionId.toString());
            if (!found) throw new Error('Live classroom session not found or access is restricted.');
            return { data: { data: { title: found.title, courseName: found.course?.title, teacherName: found.teacher?.name } } };
          });
          setSessionDetails(resp.data.data);
        }

        // Initialize user mic & camera stream with pre-join choices
        const stream = await initLocalStream(joinParams.micEnabled, joinParams.camEnabled);
        if (!stream && isTeacher) {
          throw new Error('Camera or microphone access is required for instructors to start the live class.');
        }

        // Establish WS Connection
        connect();

        setLoading(false);
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.message || err.message || 'Could not join classroom. Please check your camera settings.';
        alert(errMsg);
        navigate('/dashboard');
      }
    };

    startClassroom();

    return () => {
      disconnect();
      rtcCleanUp();
    };
  }, [roomToken]);

  // Bind local video stream once ready
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  // ── 3. Chat Form Submission ──
  const handleSendChat = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    wsSend('CHAT_MESSAGE', sessionId, {
      message: chatInput.trim()
    });
    setChatInput('');
  };

  // ── 4. Recording Functionality (Teacher-Only) ──
  const startRecordingSession = () => {
    if (!localStream) return;
    chunksRef.current = [];
    
    // Merge screen or local video stream to record
    const streamToRecord = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStream;
    
    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const mediaRecorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingBlob(blob);
        alert('Class recording captured successfully. You can upload it to the platform once the class ends.');
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording not supported on this browser:', err);
      alert('Local recording is not supported in this browser version.');
    }
  };

  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── 5. End/Leave Classroom ──
  const handleLeave = async () => {
    if (isTeacher) {
      const endRoom = window.confirm('Do you want to END the class session for everyone? (Select Cancel to just leave)');
      if (endRoom) {
        try {
          await api.patch(`/live/${sessionId}/end`);
          
          // If recording exists, offer to upload it
          if (recordingBlob) {
            const upload = window.confirm('Do you want to upload the recorded class video to Azure for students to review?');
            if (upload) {
              const formData = new FormData();
              formData.append('file', recordingBlob, `recording-session-${sessionId}.webm`);
              alert('Uploading recorded lecture video. Please wait...');
              await api.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              }).then(async (upResp) => {
                const videoUrl = upResp.data.data.url;
                // Attach url to syllabus section lesson or live recording URL
                await api.post(`/live/${sessionId}/recording`, { url: videoUrl }).catch(() => {
                  // Fallback REST endpoint
                  return api.post(`/api/live/${sessionId}/recording`, { url: videoUrl });
                });
                alert('Recording saved successfully!');
              });
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    navigate('/dashboard');
  };

  if (loading) {
    return <LoadingSpinner text="Connecting to interactive live room..." />;
  }

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getGradientBg = (name) => {
    if (!name) return 'from-slate-700 to-slate-800';
    const gradients = [
      'from-blue-600 to-indigo-600',
      'from-purple-600 to-pink-600',
      'from-emerald-600 to-teal-600',
      'from-rose-600 to-orange-600',
      'from-cyan-600 to-blue-600',
      'from-violet-600 to-purple-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  // Find if teacher stream exists in remoteStreams
  const teacherStreamObj = Object.entries(remoteStreams).find(
    ([, peer]) => peer.role === 'TEACHER' || peer.role === 'ADMIN'
  );

  const isTeacherMuted = teacherStreamObj 
    ? (participants.find(p => p.sessionId === teacherStreamObj[0])?.videoMuted ?? true)
    : true;

  return (
    <div className="h-screen flex flex-col bg-surface-900 text-white overflow-hidden">
      
      {/* ── Header Toolbar ── */}
      <header className="px-6 py-4 bg-surface-800 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-lg font-bold tracking-tight">{sessionDetails?.title || 'Live Classroom'}</h2>
          <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-900 uppercase">
            {sessionDetails?.courseName}
          </span>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/20 text-rose-400 font-semibold text-xs tracking-wider uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            REC 00:00:00
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${connectionQuality === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold hidden md:inline">
            Net Quality: {connectionQuality}
          </span>
        </div>
      </header>

      {/* ── Main Panel Layout ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Focus Mode Live Room View */}
        <div className="flex-grow p-4 md:p-6 flex flex-col gap-4 bg-surface-950/60 overflow-hidden relative">
          
          {/* Main Presenter Stage */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
            {isTeacher ? (
              <div className="relative w-full h-full max-w-5xl aspect-video rounded-2xl bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${!isVideoMuted ? 'opacity-100' : 'opacity-0'}`}
                />
                {isVideoMuted && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBg(myName)} flex flex-col items-center justify-center`}>
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/30 border border-white/20 flex items-center justify-center text-3xl md:text-4xl font-extrabold text-white shadow-xl animate-pulse">
                      {getInitials(myName)}
                    </div>
                    <span className="text-sm font-bold mt-4 text-slate-200 tracking-wider">Instructor: {myName} (You)</span>
                    <span className="text-xs text-slate-400 mt-1 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/5">Video Muted</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs border border-white/10 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ⭐ Instructor: {myName} (You)
                </div>
              </div>
            ) : (
              teacherStreamObj ? (
                <div className="relative w-full h-full max-w-5xl aspect-video rounded-2xl bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl">
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => { if (el) el.srcObject = teacherStreamObj[1].stream; }}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${!isTeacherMuted ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {isTeacherMuted && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBg(teacherStreamObj[1].name)} flex flex-col items-center justify-center`}>
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/30 border border-white/20 flex items-center justify-center text-3xl md:text-4xl font-extrabold text-white shadow-xl animate-pulse">
                        {getInitials(teacherStreamObj[1].name)}
                      </div>
                      <span className="text-sm font-bold mt-4 text-slate-200 tracking-wider">Instructor: {teacherStreamObj[1].name}</span>
                      <span className="text-xs text-slate-400 mt-1 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/5">Video Muted</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ⭐ Instructor: {teacherStreamObj[1].name}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full max-w-5xl aspect-video rounded-2xl bg-slate-900 border border-white/5 overflow-hidden flex flex-col items-center justify-center text-center p-8 shadow-2xl">
                  <div className="w-20 h-20 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-3xl animate-bounce mb-4">
                    ⏳
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">Waiting for Instructor...</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                    The host has not started sharing their video stream yet. Please stay in the room.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Student Thumbnail Strip (Horizontal Gallery) */}
          <div className="w-full shrink-0 border-t border-white/5 pt-4 bg-slate-950/20 px-2 rounded-2xl">
            <h4 className="text-slate-400 text-[10px] font-extrabold tracking-widest uppercase mb-2 px-2 flex items-center gap-1.5">
              <span>👥 Student Gallery</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[8px] font-bold">
                {Object.entries(remoteStreams).filter(([, p]) => p.role !== 'TEACHER').length + (!isTeacher ? 1 : 0)}
              </span>
            </h4>
            
            <div className="w-full flex items-center gap-4 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {/* Local student preview ("You") */}
              {!isTeacher && localStream && (
                <div className="relative w-44 aspect-video rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg group hover:border-primary-500/50 transition duration-300">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${!isVideoMuted ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {isVideoMuted && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBg(myName)} flex items-center justify-center`}>
                      <div className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow">
                        {getInitials(myName)}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] border border-white/5 max-w-[80%] truncate font-semibold">
                    👤 You
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] border border-white/5">
                      {isAudioMuted ? '🔇' : '🎤'}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] border border-white/5">
                      {isVideoMuted ? '🚫' : '📹'}
                    </span>
                  </div>
                </div>
              )}

              {/* Remote students list */}
              {Object.entries(remoteStreams)
                .filter(([, peer]) => peer.role !== 'TEACHER' && peer.role !== 'ADMIN')
                .map(([id, peer]) => {
                  const participantInfo = participants.find(p => p.sessionId === id);
                  const isPeerVideoMuted = participantInfo ? (participantInfo.videoMuted ?? true) : true;
                  const isPeerAudioMuted = participantInfo ? (participantInfo.audioMuted ?? true) : true;

                  return (
                    <div key={id} className="relative w-44 aspect-video rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg group hover:border-primary-500/50 transition duration-300">
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => { if (el) el.srcObject = peer.stream; }}
                        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${!isPeerVideoMuted ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {isPeerVideoMuted && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBg(peer.name)} flex items-center justify-center`}>
                          <div className="w-10 h-10 rounded-full bg-black/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow">
                            {getInitials(peer.name)}
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] border border-white/5 max-w-[80%] truncate">
                        👤 {peer.name}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] border border-white/5">
                          {isPeerAudioMuted ? '🔇' : '🎤'}
                        </span>
                        <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] border border-white/5">
                          {isPeerVideoMuted ? '🚫' : '📹'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* Fallback if no students show up */}
              {Object.entries(remoteStreams).filter(([, p]) => p.role !== 'TEACHER' && p.role !== 'ADMIN').length === 0 && isTeacher && (
                <div className="w-full flex justify-center items-center py-4 text-xs text-slate-500 italic bg-slate-900/10 rounded-xl border border-dashed border-white/5">
                  No students in classroom yet. Share the invite link with your class!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Backdrop for Sidebar Drawers */}
        {(showChat || showPeople) && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
            onClick={() => { setShowChat(false); setShowPeople(false); }}
          />
        )}

        {/* Right Side: Chat Panel */}
        {showChat && (
          <aside className="w-full max-w-xs md:max-w-none md:w-80 bg-surface-800 border-l border-white/5 flex flex-col overflow-hidden animate-scale-in fixed md:static inset-y-0 right-0 z-50 shadow-2xl md:shadow-none">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-surface-900/40">
              <span className="text-sm font-extrabold uppercase tracking-widest text-primary-400">Classroom Chat</span>
              <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white transition">✕</button>
            </div>
            
            {/* Messages Display */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className="flex flex-col bg-surface-900/30 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-300">{msg.senderName}</span>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                      msg.senderRole === 'TEACHER' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-700/30 text-slate-400'
                    }`}>
                      {msg.senderRole}
                    </span>
                    <span className="text-[9px] text-slate-600 ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChat} className="p-4 bg-surface-900/30 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message to class..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-slate-200 focus:border-primary-500 focus:outline-none transition text-xs"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition"
                >
                  ▶
                </button>
              </div>
            </form>
          </aside>
        )}

        {/* Right Side: Participant List Panel */}
        {showPeople && (
          <aside className="w-full max-w-xs md:max-w-none md:w-80 bg-surface-800 border-l border-white/5 flex flex-col overflow-hidden animate-scale-in fixed md:static inset-y-0 right-0 z-50 shadow-2xl md:shadow-none">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-surface-900/40">
              <span className="text-sm font-extrabold uppercase tracking-widest text-primary-400">Classrooms ({participants.length})</span>
              <button onClick={() => setShowPeople(false)} className="text-slate-500 hover:text-white transition">✕</button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-2">
              {participants.map((person) => (
                <div key={person.sessionId} className="flex items-center gap-3 p-2 bg-surface-900/30 border border-white/5 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-sm font-semibold">
                    👤
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{person.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium capitalize">{person.role}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs">{person.audioMuted ? '🔇' : '🎤'}</span>
                    <span className="text-xs">{person.videoMuted ? '🚫' : '📹'}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Controls Toolbar ── */}
      <footer className="px-4 py-4 md:px-6 md:py-5 bg-surface-800 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Toolbar actions */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <button
            onClick={toggleAudio}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              isAudioMuted ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
            }`}
          >
            <span>{isAudioMuted ? '🎙️ Muted' : '🎤 Active'}</span>
          </button>
          <button
            onClick={toggleVideo}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              isVideoMuted ? 'bg-rose-600/10 border-rose-500/20 text-rose-500' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
            }`}
          >
            <span>{isVideoMuted ? '📹 Camera Off' : '📷 Camera On'}</span>
          </button>

          {isTeacher && (
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                isScreenSharing ? 'bg-primary-600/10 border-primary-500/20 text-primary-500' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
              }`}
            >
              <span>🖥️ {isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
            </button>
          )}
        </div>

        {/* Center Toolbar actions */}
        <div className="flex items-center gap-3">
          {isTeacher && (
            <button
              onClick={isRecording ? stopRecordingSession : startRecordingSession}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                isRecording ? 'bg-rose-600/20 border-rose-500/30 text-rose-400 animate-pulse' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
              }`}
            >
              <span>● {isRecording ? 'Stop Recording' : 'Record Lecture'}</span>
            </button>
          )}

          <button
            onClick={() => { setShowChat(!showChat); setShowPeople(false); }}
            className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
              showChat ? 'bg-primary-600/10 border-primary-500/20 text-primary-500' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
            }`}
            title="Toggle Chat"
          >
            💬
          </button>
          <button
            onClick={() => { setShowPeople(!showPeople); setShowChat(false); }}
            className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
              showPeople ? 'bg-primary-600/10 border-primary-500/20 text-primary-500' : 'bg-slate-700/30 border-white/5 hover:bg-slate-700/60'
            }`}
            title="Toggle Participants"
          >
            👥
          </button>
        </div>

        {/* Right Toolbar actions */}
        <div>
          <button
            onClick={handleLeave}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold tracking-wide uppercase transition cursor-pointer shadow-lg hover:shadow-rose-600/10"
          >
            {isTeacher ? 'End Session' : 'Leave Class'}
          </button>
        </div>
      </footer>
    </div>
  );
};
export default LiveClassroom;
