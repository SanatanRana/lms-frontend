import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const LiveJoinGate = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  
  // Local preview state
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const videoRef = useRef(null);

  // Guest inputs
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Auth check
  const isAuthenticated = !!localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'GUEST';
  const userName = localStorage.getItem('userName') || '';

  const stopPreview = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const startPreview = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Start muted for safety
      stream.getAudioTracks().forEach(t => t.enabled = false);
      stream.getVideoTracks().forEach(t => t.enabled = false);
      setMicEnabled(false);
      setCamEnabled(false);
    } catch (err) {
      console.warn('Camera/mic preview access denied or not available:', err);
    }
  };

  const fetchRoomInfo = async () => {
    try {
      const response = await api.get(`/live/room/${roomToken}`);
      if (response.data.success) {
        setSessionInfo(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch room info');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid or expired join link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoomInfo();
    return () => {
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken]);

  useEffect(() => {
    if (sessionInfo && sessionInfo.status !== 'ENDED') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionInfo]);

  const toggleCam = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !camEnabled;
        setCamEnabled(!camEnabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    setIsJoining(true);
    setError('');

    try {
      if (isAuthenticated) {
        // Logged in user: Join directly
        stopPreview();
        navigate(`/live/classroom/${roomToken}`, {
          state: {
            sessionId: sessionInfo.sessionId,
            micEnabled,
            camEnabled,
            role: userRole,
            name: userName,
            title: sessionInfo.title,
            courseName: sessionInfo.courseName,
            teacherName: sessionInfo.teacherName
          }
        });
      } else {
        // Guest user: Validate guest details with endpoint
        if (!guestName.trim()) {
          setError('Please enter a display name to join');
          setIsJoining(false);
          return;
        }

        const response = await api.post(`/live/room/${roomToken}/guest-join`, {
          name: guestName.trim()
        });

        if (response.data.success) {
          stopPreview();
          // Store guest session temporary identifier or name
          sessionStorage.setItem('guestName', guestName.trim());
          navigate(`/live/classroom/${roomToken}`, {
            state: {
              sessionId: sessionInfo.sessionId,
              micEnabled,
              camEnabled,
              role: 'GUEST',
              name: guestName.trim(),
              title: sessionInfo.title,
              courseName: sessionInfo.courseName,
              teacherName: sessionInfo.teacherName
            }
          });
        } else {
          setError(response.data.message || 'Failed to join as guest');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while joining classroom.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving live class lobby..." />;
  }

  if (error && !sessionInfo) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="glass p-8 rounded-2xl max-w-md w-full border border-rose-500/20">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-2xl font-bold text-rose-500 mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const isLive = sessionInfo?.status === 'LIVE';
  const isEnded = sessionInfo?.status === 'ENDED';
  const isScheduled = sessionInfo?.status === 'SCHEDULED';

  return (
    <div className="min-h-[85vh] py-12 px-4 flex items-center justify-center bg-surface-900 text-white">
      <div className="glass max-w-5xl w-full rounded-3xl overflow-hidden border border-white/5 flex flex-col md:flex-row shadow-2xl animate-fade-in">
        
        {/* Left Side: Video Preview Panel */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between bg-surface-800/40 border-r border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 text-xs rounded-full bg-primary-500/20 text-primary-400 font-semibold uppercase tracking-wider">
                {sessionInfo.courseName}
              </span>
              {isLive && (
                <span className="px-3 py-1 text-xs rounded-full bg-rose-500/20 text-rose-400 font-semibold animate-pulse uppercase tracking-wider">
                  ● LIVE NOW
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold mb-1 tracking-tight">{sessionInfo.title}</h1>
            <p className="text-slate-400 text-sm mb-6">Instructor: <span className="text-slate-200 font-medium">{sessionInfo.teacherName}</span></p>
          </div>

          {!isEnded ? (
            <div className="relative aspect-video rounded-2xl bg-black border border-white/5 overflow-hidden flex items-center justify-center group shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${camEnabled ? 'opacity-100' : 'opacity-0'}`}
              />
              
              {!camEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 mb-3">
                    <span className="text-2xl">📷</span>
                  </div>
                  <p className="text-sm">Camera is off</p>
                </div>
              )}

              {/* Media Preview Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    micEnabled ? 'bg-primary-600 hover:bg-primary-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                  title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  <span className="text-lg">{micEnabled ? '🎤' : '🎙️'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    camEnabled ? 'bg-primary-600 hover:bg-primary-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                  title={camEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  <span className="text-lg">{camEnabled ? '📷' : '📹'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col items-center justify-center text-center p-6">
              <span className="text-4xl mb-3">🏁</span>
              <h3 className="text-lg font-bold text-slate-300">Live Classroom Ended</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs">
                This live broadcast has completed. Feel free to view the uploaded recording if available.
              </p>
            </div>
          )}

          <div className="text-xs text-slate-500 text-center mt-6">
            Make sure to allow camera and microphone permissions in your browser.
          </div>
        </div>

        {/* Right Side: Action Panel */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {isLive && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Ready to join?</h2>
              
              {isAuthenticated ? (
                <div>
                  <div className="p-4 rounded-2xl bg-primary-950/30 border border-primary-500/10 mb-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Signed in as</p>
                    <p className="text-lg font-bold text-white">{userName}</p>
                    <p className="text-xs text-primary-400 font-semibold">{userRole} account</p>
                  </div>
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="w-full py-4 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-primary-500/10 disabled:opacity-50"
                  >
                    {isJoining ? 'Connecting...' : 'Enter Classroom Now'}
                  </button>
                </div>
              ) : (
                <div>
                  {sessionInfo.guestAccessEnabled ? (
                    <form onSubmit={handleJoin} className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 mb-2">
                        <p className="text-xs text-slate-400 mb-2">You are joining as a <span className="text-slate-200 font-semibold">Guest</span>. Please enter your name to participate.</p>
                        <input
                          type="text"
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Your Display Name"
                          maxLength={30}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:outline-none transition text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isJoining}
                        className="w-full py-4 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-primary-500/10 disabled:opacity-50"
                      >
                        {isJoining ? 'Connecting...' : 'Join Classroom as Guest'}
                      </button>
                      <div className="text-center text-xs text-slate-500">
                        Have an account? <span onClick={() => navigate('/login')} className="text-primary-400 hover:underline cursor-pointer">Log In</span> to log attendance automatically.
                      </div>
                    </form>
                  ) : (
                    <div className="text-center p-6 rounded-2xl bg-rose-950/20 border border-rose-500/10">
                      <span className="text-3xl block mb-2">🔒</span>
                      <h3 className="font-semibold text-rose-400 mb-1">Login Required</h3>
                      <p className="text-xs text-slate-400 mb-6">
                        This session requires authentication. Guest access is disabled.
                      </p>
                      <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-500 font-bold rounded-xl transition"
                      >
                        Log In to Join
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isScheduled && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📅</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Class is scheduled</h2>
              <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">
                This classroom is scheduled to start on:<br/>
                <span className="text-slate-200 font-semibold mt-1 inline-block">
                  {new Date(sessionInfo.startTime).toLocaleString()}
                </span>
              </p>
              
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 inline-block text-xs text-slate-400 max-w-xs mx-auto">
                🚪 The pre-join lobby will automatically activate when the instructor starts the session.
              </div>
            </div>
          )}

          {isEnded && (
            <div className="text-center py-6">
              <h2 className="text-xl font-bold mb-3">Live Class Finished</h2>
              <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">
                This live lesson concluded at {sessionInfo.endTime ? new Date(sessionInfo.endTime).toLocaleTimeString() : ''}.
              </p>

              {sessionInfo.recordingStatus === 'AVAILABLE' && sessionInfo.recordingUrl ? (
                <div className="p-6 rounded-2xl bg-primary-950/30 border border-primary-500/20 max-w-md mx-auto">
                  <h3 className="font-bold text-primary-400 mb-2">🎥 Class Recording Available</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    The instructor uploaded the live recording. You can watch it directly.
                  </p>
                  <a
                    href={sessionInfo.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition inline-flex items-center justify-center gap-2"
                  >
                    <span>▶️</span> Watch Class Recording
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 inline-block text-xs text-slate-400 max-w-xs mx-auto">
                  📼 No recorded video has been uploaded for this session yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LiveJoinGate;
