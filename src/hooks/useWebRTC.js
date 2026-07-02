import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // TURN fallback using free Open Relay Project TURN server for cellular/different network traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export const useWebRTC = (sessionId, myWsId, role, wsSend) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // wsSessionId -> { stream, name, role }
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, fair, poor

  // Peer connections map (wsSessionId -> RTCPeerConnection)
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const candidateQueuesRef = useRef({});

  const getUserMediaWithTimeout = useCallback((constraints, timeoutMs = 5000) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Media devices or getUserMedia not supported in this browser environment.'));
    }
    return Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WebRTC media device acquisition timed out')), timeoutMs)
      )
    ]);
  }, []);

  // Initialize camera and microphone
  const initLocalStream = useCallback(async (initialMicEnabled = false, initialCamEnabled = false) => {
    // Wait briefly for OS/browser to release any previous camera/mic capture session (e.g. from the lobby preview)
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      // Teachers always publish both. Students join muted by default.
      const constraints = {
        video: true,
        audio: true
      };

      const stream = await getUserMediaWithTimeout(constraints, 5000);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial mic/cam preferences
      stream.getAudioTracks().forEach(track => { track.enabled = initialMicEnabled; });
      stream.getVideoTracks().forEach(track => { track.enabled = initialCamEnabled; });

      setIsAudioMuted(!initialMicEnabled);
      setIsVideoMuted(!initialCamEnabled);

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      // Fallback if no camera found
      try {
        const stream = await getUserMediaWithTimeout({ audio: true }, 3000);
        localStreamRef.current = stream;
        setLocalStream(stream);

        stream.getAudioTracks().forEach(track => { track.enabled = initialMicEnabled; });
        setIsAudioMuted(!initialMicEnabled);
        setIsVideoMuted(true);

        return stream;
      } catch (err2) {
        console.error('Microphone access also failed:', err2);
      }
    }
    return null;
  }, [getUserMediaWithTimeout]);

  const removePeer = useCallback((targetId) => {
    if (pcsRef.current[targetId]) {
      pcsRef.current[targetId].close();
      delete pcsRef.current[targetId];
    }
    delete candidateQueuesRef.current[targetId];
    setRemoteStreams(prev => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
  }, []);

  const createPC = useCallback((targetId, stream, participantName, participantRole) => {
    if (pcsRef.current[targetId]) {
      pcsRef.current[targetId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[targetId] = pc;

    // Add local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Handle incoming ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsSend('ICE_CANDIDATE', sessionId, {
          targetId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${targetId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(targetId);
      }
    };

    // Handle incoming tracks (remote streams)
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => ({
        ...prev,
        [targetId]: {
          stream: remoteStream,
          name: participantName || 'Peer',
          role: participantRole || 'STUDENT'
        }
      }));
    };

    return pc;
  }, [sessionId, wsSend, removePeer]);

  // Initiate WebRTC connection (Teacher initiates to students)
  const initiateCall = useCallback(async (targetId, participantName, participantRole) => {
    try {
      const pc = createPC(targetId, localStreamRef.current, participantName, participantRole);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsSend('OFFER', sessionId, {
        targetId,
        sdp: offer.sdp
      });
    } catch (err) {
      console.error(`Failed to initiate offer to peer ${targetId}:`, err);
    }
  }, [sessionId, wsSend, createPC]);

  // Handle incoming Offer from Teacher
  const handleOffer = useCallback(async (senderId, sdp, participants) => {
    try {
      const peer = participants?.find(p => p.sessionId === senderId);
      const pc = createPC(senderId, localStreamRef.current, peer?.name, peer?.role);

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Process queued candidates
      const queue = candidateQueuesRef.current[senderId] || [];
      for (const cand of queue) {
        await pc.addIceCandidate(new RTCIceCandidate({
          candidate: cand.candidate,
          sdpMid: cand.sdpMid,
          sdpMLineIndex: cand.sdpMLineIndex
        })).catch(e => console.error("Error adding queued candidate:", e));
      }
      candidateQueuesRef.current[senderId] = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsSend('ANSWER', sessionId, {
        targetId: senderId,
        sdp: answer.sdp
      });
    } catch (err) {
      console.error(`Failed to handle offer from peer ${senderId}:`, err);
    }
  }, [sessionId, wsSend, createPC]);

  // Handle incoming Answer
  const handleAnswer = useCallback(async (senderId, sdp) => {
    try {
      const pc = pcsRef.current[senderId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

        // Process queued candidates
        const queue = candidateQueuesRef.current[senderId] || [];
        for (const cand of queue) {
          await pc.addIceCandidate(new RTCIceCandidate({
            candidate: cand.candidate,
            sdpMid: cand.sdpMid,
            sdpMLineIndex: cand.sdpMLineIndex
          })).catch(e => console.error("Error adding queued candidate:", e));
        }
        candidateQueuesRef.current[senderId] = [];
      }
    } catch (err) {
      console.error(`Failed to handle answer from peer ${senderId}:`, err);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (senderId, payload) => {
    try {
      const pc = pcsRef.current[senderId];
      if (pc && pc.remoteDescription && pc.remoteDescription.type && payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex
        }));
      } else {
        if (!candidateQueuesRef.current[senderId]) {
          candidateQueuesRef.current[senderId] = [];
        }
        candidateQueuesRef.current[senderId].push(payload);
      }
    } catch (err) {
      console.error(`Failed to add ICE candidate from peer ${senderId}:`, err);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const nextState = !isAudioMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    setIsAudioMuted(nextState);
    wsSend('MUTE_TOGGLE', sessionId, { mediaType: 'audio', muted: nextState });
  }, [isAudioMuted, sessionId, wsSend]);

  const forceMuteAudio = useCallback(() => {
    if (!isAudioMuted && localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setIsAudioMuted(true);
      wsSend('MUTE_TOGGLE', sessionId, { mediaType: 'audio', muted: true });
      alert("Your microphone was muted by the instructor.");
    }
  }, [isAudioMuted, sessionId, wsSend]);

  const forceMuteVideo = useCallback(() => {
    if (!isVideoMuted && localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      setIsVideoMuted(true);
      wsSend('MUTE_TOGGLE', sessionId, { mediaType: 'video', muted: true });
      alert("Your camera was turned off by the instructor.");
    }
  }, [isVideoMuted, sessionId, wsSend]);

  const toggleVideo = useCallback(async () => {
    const nextState = !isVideoMuted;
    
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      
      if (videoTracks.length > 0) {
        // Track exists, just toggle its enabled state
        videoTracks.forEach(track => {
          track.enabled = !nextState;
        });
        setIsVideoMuted(nextState);
        wsSend('MUTE_TOGGLE', sessionId, { mediaType: 'video', muted: nextState });
      } else if (!nextState) {
        // Next state is UNMUTED, but we have NO video tracks! (Due to initial fallback)
        // We need to request camera access now.
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          
          localStreamRef.current.addTrack(newVideoTrack);
          
          // Replace/add video track in all active peer connections
          Object.values(pcsRef.current).forEach(pc => {
            const senders = pc.getSenders();
            const sender = senders.find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, localStreamRef.current);
            }
          });
          
          // Force React state update so localVideoRef binds to the updated stream
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          
          setIsVideoMuted(false);
          wsSend('MUTE_TOGGLE', sessionId, { mediaType: 'video', muted: false });
        } catch (err) {
          console.error("Could not start camera on demand:", err);
          alert("Could not start camera. Please check your browser permissions or ensure no other app is using it.");
        }
      }
    }
  }, [isVideoMuted, sessionId, wsSend]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    wsSend('SCREEN_SHARE', sessionId, { sharing: false });

    // Restore camera video track in all active peer connections
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(pcsRef.current).forEach(pc => {
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(isVideoMuted ? null : cameraTrack);
          }
        });
      }
    }
  }, [sessionId, isVideoMuted, wsSend]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      wsSend('SCREEN_SHARE', sessionId, { sharing: true });

      const videoTrack = stream.getVideoTracks()[0];

      // Replace video track in all active peer connections
      Object.values(pcsRef.current).forEach(pc => {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share ended from browser native UI
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
    }
  }, [sessionId, wsSend, stopScreenShare]);

  const cleanUpAll = useCallback(() => {
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // Close peer connections
    Object.keys(pcsRef.current).forEach(key => {
      pcsRef.current[key].close();
    });
    pcsRef.current = {};
    candidateQueuesRef.current = {};

    setLocalStream(null);
    setRemoteStreams({});
    setIsScreenSharing(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanUpAll();
    };
  }, [cleanUpAll]);

  return {
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
    forceMuteAudio,
    forceMuteVideo,
    startScreenShare,
    stopScreenShare,
    removePeer,
    screenStreamRef,
    cleanUp: cleanUpAll
  };
};
export default useWebRTC;
