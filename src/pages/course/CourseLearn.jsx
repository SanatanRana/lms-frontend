import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';


const CourseLearn = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [resources, setResources] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab state: 'syllabus' | 'resources' | 'assignments' | 'live'
  const [activeTab, setActiveTab] = useState('syllabus');

  // AI Chat drawer state
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Assignment submission state
  const [submitForm, setSubmitForm] = useState({ assignmentId: '', submissionUrl: '', answerText: '' });
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    fetchLearningDetails();
  }, [id]);

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

    // 2. Sections and Lessons
    try {
      const sectionsResp = await api.get(`/courses/${id}/sections`);
      const secs = sectionsResp.data?.data || [];
      setSections(secs);
      
      // Auto-select first lesson of first section if available
      if (secs.length > 0 && secs[0].lessons && secs[0].lessons.length > 0) {
        setActiveLesson(secs[0].lessons[0]);
      } else {
        setActiveLesson(null);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      setSections([]);
      setActiveLesson(null);
    }

    // 3. Material resources
    try {
      const resourcesResp = await api.get(`/courses/${id}/resources`);
      setResources(resourcesResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setResources([]);
    }

    // 4. Live classes
    try {
      const liveResp = await api.get(`/live/course/${id}`);
      setLiveSessions(liveResp.data?.data || []);
    } catch (error) {
      console.error("Error fetching live sessions:", error);
      setLiveSessions([]);
    }

    // 5. Assignments
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

  // Mark lesson as complete and update student progress percent
  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    try {
      // Find total lessons to calculate progress
      const totalLessons = (sections || []).reduce((acc, s) => acc + (s.lessons ? s.lessons.length : 0), 0);
      if (totalLessons === 0) return;

      // Update progress percent on server
      // We can count completed lessons if tracked on server, but for simplicity, we patch percent
      // Let's check how many lessons are before and including the active one
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
  const handleJoinLive = async (sessionId, meetingLink) => {
    try {
      // Record join attendance
      await api.post(`/live/${sessionId}/join`);
      window.open(meetingLink, '_blank');
      // Periodically, student leaves when closing or ending room
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
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { message: chatInput, response: '', isTemp: true };
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
    } finally {
      setChatLoading(false);
    }
  };

  const renderVideoPlayer = (url, title) => {
    if (!url) return null;
    
    // Check if it is a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const embedUrl = url.replace("watch?v=", "embed/");
      return (
        <iframe 
          className="w-full h-full"
          src={embedUrl}
          title={title}
          allowFullScreen
        ></iframe>
      );
    }
    
    // Check if it is a Vimeo URL
    if (url.includes('vimeo.com')) {
      return (
        <iframe 
          className="w-full h-full"
          src={url}
          title={title}
          allowFullScreen
        ></iframe>
      );
    }
    
    // Otherwise, treat as a direct video file (e.g. Azure Blob storage MP4)
    return (
      <video 
        className="w-full h-full" 
        controls 
        src={url}
        poster={course?.thumbnailUrl}
      ></video>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Opening your learning environment..." />;
  }


  // Find any active live class
  const liveClass = (liveSessions || []).find(s => s && s.status === 'LIVE');
  const hasVideo = !!activeLesson || (!!course && !!course.introVideoUrl);

  return (
    <div className="min-h-[85vh] bg-surface-900 flex flex-col md:flex-row relative">
      
      {/* Sidebar: Sections & Lessons Outline */}
      <div className="w-full md:w-80 bg-surface-800/90 border-r border-surface-600 flex flex-col">
        <div className="p-5 border-b border-surface-600">
          <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">Syllabus Outline</span>
          <h3 className="text-white font-bold text-base mt-1 line-clamp-1">{course?.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh] md:max-h-[75vh]">
          {(sections || []).map((sec, sIdx) => (
            <div key={sec.id} className="space-y-1.5">
              <span className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider block">
                Section {sIdx + 1}: {sec.title}
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
                    <svg className="w-3.5 h-3.5 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Panel: Video Player and Tabs */}
      <div className="flex-grow p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Bouncing Live session alert banner */}
        {liveClass && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-2xl flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
              <span className="text-xs font-bold">A live session "{liveClass.title}" is currently active!</span>
            </div>
            <button 
              onClick={() => handleJoinLive(liveClass.id, liveClass.meetingLink)}
              className="bg-error hover:bg-error text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition"
            >
              Join Live
            </button>
          </div>
        )}

        {/* Video Player */}
        {hasVideo ? (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-surface-600">
              {renderVideoPlayer(activeLesson ? activeLesson.videoUrl : course?.introVideoUrl, activeLesson ? activeLesson.title : "Course Introduction")}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  {activeLesson ? activeLesson.title : "Course Introduction"}
                </h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {activeLesson ? activeLesson.description : course?.description}
                </p>
              </div>
              {activeLesson && (
                <button
                  onClick={handleMarkComplete}
                  className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow shadow-violet-500/10"
                >
                  Mark Lesson Complete & Next
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

        {/* Tabs section */}
        <div className="bg-surface-800/60 border border-surface-600 rounded-2xl overflow-hidden">
          <div className="flex border-b border-surface-600">
            {['Syllabus Info', 'Downloads', 'Assignments', 'Live Rooms'].map(tabName => {
              const tabId = tabName.toLowerCase().replace(' info', '').replace(' rooms', '');
              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`px-5 py-3.5 text-xs font-bold transition border-b-2 ${
                    activeTab === tabId 
                      ? 'border-primary-600 text-primary-400 bg-primary-600/5' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tabName}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'syllabus' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm mb-2">About this Syllabus</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{course?.description}</p>
                <div className="text-xs text-slate-500 mt-4">
                  Instructor: <span className="text-slate-300 font-semibold">{course?.teacherName}</span>
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm mb-3">Downloadable Materials</h4>
                {(resources || []).length === 0 ? (
                  <p className="text-slate-500 text-xs">No downloadable resources added for this course.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(resources || []).map(r => (
                      <a
                        key={r.id}
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-surface-900/60 border border-surface-600 p-3 rounded-xl flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-[10px] font-extrabold text-success bg-success/10 px-2 py-0.5 rounded uppercase">
                            {r.fileType}
                          </span>
                          <span className="text-slate-300 text-xs font-semibold line-clamp-1">{r.fileName}</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <h4 className="text-white font-extrabold text-sm mb-3">Assignments</h4>
                {(assignments || []).length === 0 ? (
                  <p className="text-slate-500 text-xs">No assignments published yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(assignments || []).map(a => (
                      <div key={a.id} className="border border-surface-600 bg-surface-900/40 p-4 rounded-xl space-y-4">
                        <div>
                          <h5 className="font-bold text-xs text-white">{a.title}</h5>
                          <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{a.description}</p>
                          <div className="text-[10px] text-slate-500 mt-2 font-mono">
                            Due: {new Date(a.dueDate).toLocaleString()}
                          </div>
                        </div>

                        {/* Submit Form */}
                        <form 
                          onSubmit={(e) => {
                            setSubmitForm(prev => ({ ...prev, assignmentId: a.id }));
                            handleSubmitAssignment(e);
                          }}
                          className="pt-3 border-t border-surface-600 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="url"
                              placeholder="Submission URL (GitHub / Google Drive)"
                              value={submitForm.assignmentId === a.id ? submitForm.submissionUrl : ''}
                              onChange={(e) => setSubmitForm({ ...submitForm, assignmentId: a.id, submissionUrl: e.target.value })}
                              className="bg-surface-900 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Notes or answer explanation text"
                              value={submitForm.assignmentId === a.id ? submitForm.answerText : ''}
                              onChange={(e) => setSubmitForm({ ...submitForm, assignmentId: a.id, answerText: e.target.value })}
                              className="bg-surface-900 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none"
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-semibold">{submitStatus}</span>
                            <button
                              type="submit"
                              className="bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                            >
                              Submit Assignment
                            </button>
                          </div>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'live' && (
              <div className="space-y-4">
                <h4 className="text-white font-extrabold text-sm mb-3">Live Video Classrooms</h4>
                {(liveSessions || []).length === 0 ? (
                  <p className="text-slate-500 text-xs">No scheduled classrooms found.</p>
                ) : (
                  <div className="space-y-3">
                    {(liveSessions || []).map(session => (
                      <div 
                        key={session.id} 
                        className="bg-surface-900/60 border border-surface-600 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-white">{session.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              session.status === 'LIVE' ? 'bg-error/15 text-error border border-error/20 animate-pulse' :
                              session.status === 'ENDED' ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Scheduled: {new Date(session.startTime).toLocaleString()}</p>
                        </div>
                        {session.status === 'LIVE' ? (
                          <button
                            onClick={() => handleJoinLive(session.id, session.meetingLink)}
                            className="mt-3 md:mt-0 bg-error hover:bg-error/95 text-white text-xs font-bold px-4 py-2 rounded-xl transition animate-pulse cursor-pointer shadow-md shadow-error/20"
                          >
                            Join Live Now
                          </button>
                        ) : session.status === 'SCHEDULED' ? (
                          <button
                            onClick={() => handleJoinLive(session.id, session.meetingLink)}
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

      {/* Floating AI Tutor Drawer Trigger Button */}
      <button
        onClick={() => setShowAiChat(!showAiChat)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-primary-600/30 hover:scale-105 transition z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* AI Chat Drawer Panel */}
      {showAiChat && (
        <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-800 border-l border-surface-600 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-surface-600 flex justify-between items-center">
            <div>
              <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-widest">AI doubt assistant</span>
              <h3 className="font-extrabold text-sm text-white mt-0.5">Aura AI Tutor</h3>
            </div>
            <button 
              onClick={() => setShowAiChat(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {(chatMessages || []).length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Ask me any coding, database, or syllabus questions!
              </div>
            ) : (
              (chatMessages || []).map((msg, idx) => (
                <div key={idx} className="space-y-2.5">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="bg-surface-700/70 border border-surface-500/30 text-slate-200 rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-[85%]">
                      {msg.message}
                    </div>
                  </div>
                  {/* AI answer */}
                  {msg.response && (
                    <div className="flex justify-start">
                      <div className="bg-primary-600/10 border border-primary-600/20 text-violet-300 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs max-w-[85%] leading-relaxed">
                        {msg.response}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-primary-600/5 text-primary-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendAiMessage} className="p-4 border-t border-surface-600 flex space-x-2">
            <input
              type="text"
              placeholder="Ask a doubt..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary-600"
              required
            />
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseLearn;
