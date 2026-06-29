import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Toast from '../../components/common/Toast';
import { AuthContext } from '../../context/AuthContext';

// CSV Exporter (defined outside to satisfy react-hooks/purity rules)
const exportToCSV = (data, filename, onSuccess, onError) => {
  if (!data.length) {
    if (onError) onError('No data to export.');
    return;
  }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_logs_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (onSuccess) onSuccess('Logs exported to CSV successfully!');
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userName = user?.name || localStorage.getItem('userName') || 'Teacher';

  const [searchParams, setSearchParams] = useSearchParams();

  // Datasets
  const [courses, setCourses] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Course Edit & Actions
  const [courseFilterTab, setCourseFilterTab] = useState('active'); // 'active' | 'archived'
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseForm, setEditCourseForm] = useState({
    title: '',
    category: 'Engineering',
    description: '',
    price: '',
    discountPrice: '',
    thumbnailUrl: '',
    introVideoUrl: ''
  });

  // Syllabus & Chapter Manager
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  
  // Lessons
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', videoUrl: '' });
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);

  const handleStartAddLesson = (section) => {
    setSelectedSectionId(section.id);
    setEditingLessonId(null);
    setLessonForm({ title: '', description: '', videoUrl: '' });
    setShowLessonModal(true);
  };

  const handleStartEditLesson = (section, lesson) => {
    setSelectedSectionId(section.id);
    setEditingLessonId(lesson.id);
    setLessonForm({ title: lesson.title, description: lesson.description || '', videoUrl: lesson.videoUrl || '' });
    setShowLessonModal(true);
  };

  const handleUpdateSection = async (sectionId, updatedTitle) => {
    try {
      const response = await api.put(`/sections/${sectionId}`, { title: updatedTitle });
      if (response.data.success) {
        selectCourseForSyllabus(selectedCourse);
        showNotification('success', 'Chapter updated successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to update chapter.');
    }
  };

  // Resources
  const [resourceForm, setResourceForm] = useState({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });
  const [resources, setResources] = useState([]);

  // Live scheduling state
  const [liveForm, setLiveForm] = useState({
    courseId: '',
    title: '',
    startTime: '',
    endTime: '',
    maxParticipants: 50,
    chatEnabled: true,
    guestAccessEnabled: true
  });
  const [editingSession, setEditingSession] = useState(null);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [notification, setNotification] = useState({ type: '', msg: '' });

  // Student Doubt reply Desk & Homework submissions mock datastream
  const [doubts, setDoubts] = useState([
    { id: 1, studentName: "Rajesh Kumar", courseName: "Full Stack Web Dev", question: "How does the virtual DOM work in React 19? Can you explain fiber reconciliation?", replies: [] },
    { id: 2, studentName: "Priya Sharma", courseName: "UI/UX Foundations", question: "What is the optimal mobile grid padding for 390px layouts?", replies: [] }
  ]);
  const [doubtReplies, setDoubtReplies] = useState({});

  const [homeworks, setHomeworks] = useState([
    { id: 101, studentName: "Vikram Malhotra", courseName: "Full Stack Web Dev", title: "React Props Homework", submissionUrl: "https://github.com/vikram/props-assignment", status: "Submitted", grade: "", feedback: "" },
    { id: 102, studentName: "Neha Gupta", courseName: "UI/UX Foundations", title: "Mobile Wireframe Mockups", submissionUrl: "https://figma.com/file/neha-mockup", status: "Submitted", grade: "", feedback: "" }
  ]);

  const [attendanceLogs] = useState([
    { id: 1, sessionName: "React Hooks Masterclass", studentName: "Rajesh Kumar", email: "rajesh@gmail.com", joinedAt: "10:05 AM", stayDuration: "50 mins", attendance: "Present" },
    { id: 2, sessionName: "React Hooks Masterclass", studentName: "Priya Sharma", email: "priya@gmail.com", joinedAt: "10:07 AM", stayDuration: "48 mins", attendance: "Present" },
    { id: 3, sessionName: "Figma Grid Layouts", studentName: "Neha Gupta", email: "neha@gmail.com", joinedAt: "02:00 PM", stayDuration: "60 mins", attendance: "Present" }
  ]);

  const showNotification = (type, msg) => {
    setNotification({ type, msg });
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch teacher courses
      const courseResp = await api.get('/courses/my-courses');
      const allCourses = courseResp.data.data || [];
      setCourses(allCourses);
      const firstActive = allCourses.find(c => c.active);
      if (firstActive) {
        setLiveForm(prev => ({ ...prev, courseId: firstActive.id.toString() }));
      } else {
        setLiveForm(prev => ({ ...prev, courseId: '' }));
      }

      // 2. Fetch live sessions
      const liveResp = await api.get('/live/my-sessions');
      setLiveSessions(liveResp.data.data || []);
    } catch (error) {
      console.error("Error fetching teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  const handleStartEditCourse = (course) => {
    setEditingCourse(course);
    setEditCourseForm({
      title: course.title,
      category: course.category || 'Engineering',
      description: course.description || '',
      price: course.price !== undefined && course.price !== null ? course.price.toString() : '0',
      discountPrice: course.discountPrice !== undefined && course.discountPrice !== null ? course.discountPrice.toString() : '',
      thumbnailUrl: course.thumbnailUrl || '',
      introVideoUrl: course.introVideoUrl || ''
    });
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editCourseForm,
        price: parseFloat(editCourseForm.price),
        discountPrice: editCourseForm.discountPrice ? parseFloat(editCourseForm.discountPrice) : null
      };

      const response = await api.put(`/courses/${editingCourse.id}`, payload);
      if (response.data.success) {
        setCourses(courses.map(c => c.id === editingCourse.id ? response.data.data : c));
        if (selectedCourse?.id === editingCourse.id) {
          setSelectedCourse(response.data.data);
        }
        setEditingCourse(null);
        showNotification('success', 'Course updated successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to update course.');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete/archive this course? If it has students enrolled, it will be Archived. If it is empty, it will be permanently deleted.")) return;
    try {
      const response = await api.delete(`/courses/${courseId}`);
      if (response.data.success) {
        showNotification('success', 'Course deleted/archived successfully!');
        fetchDashboardData();
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
        }
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete/archive course.');
    }
  };

  const handleRestoreCourse = async (courseId) => {
    try {
      const response = await api.post(`/courses/${courseId}/restore`);
      if (response.data.success) {
        showNotification('success', 'Course published successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to restore course.');
    }
  };

  // Syllabus Chapters & Lessons
  const selectCourseForSyllabus = async (course) => {
    setSelectedCourse(course);
    setSelectedSectionId(null);
    setNewSectionTitle('');
    try {
      const response = await api.get(`/courses/${course.id}/sections`);
      setSections(response.data?.data || []);
      const resResponse = await api.get(`/courses/${course.id}/resources`);
      setResources(resResponse.data?.data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      setSections([]);
      setResources([]);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    try {
      const response = await api.post(`/courses/${selectedCourse.id}/sections`, { title: newSectionTitle });
      if (response.data.success) {
        setSections([...(sections || []), response.data.data]);
        setNewSectionTitle('');
        showNotification('success', 'Section created successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to create section.');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section? All its lessons will be orphaned or deleted.")) return;
    try {
      const response = await api.delete(`/sections/${sectionId}`);
      if (response.data.success) {
        setSections(sections.filter(s => s.id !== sectionId));
        showNotification('success', 'Section deleted.');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete section.');
    }
  };

  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return;

    try {
      if (editingLessonId) {
        const response = await api.put(`/lessons/${editingLessonId}`, lessonForm);
        if (response.data.success) {
          selectCourseForSyllabus(selectedCourse);
          setLessonForm({ title: '', description: '', videoUrl: '' });
          setEditingLessonId(null);
          setShowLessonModal(false);
          showNotification('success', 'Lesson updated successfully!');
        }
      } else {
        if (!selectedSectionId) return;
        const response = await api.post(`/sections/${selectedSectionId}/lessons`, lessonForm);
        if (response.data.success) {
          selectCourseForSyllabus(selectedCourse);
          setLessonForm({ title: '', description: '', videoUrl: '' });
          setShowLessonModal(false);
          showNotification('success', 'Lesson added successfully to chapter!');
        }
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to save lesson.');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const response = await api.delete(`/lessons/${lessonId}`);
      if (response.data.success) {
        selectCourseForSyllabus(selectedCourse);
        showNotification('success', 'Lesson deleted successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete lesson.');
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    if (type === 'video') {
      setUploadingVideo(true);
    } else {
      setUploadingResource(true);
    }

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        const fileUrl = response.data.data.url;
        if (type === 'video') {
          setLessonForm(prev => ({ ...prev, videoUrl: fileUrl }));
          showNotification('success', 'Video uploaded successfully to Azure Storage!');
        } else {
          setResourceForm(prev => ({ 
            ...prev, 
            fileUrl,
            fileName: prev.fileName || response.data.data.fileName,
            fileSize: parseInt(response.data.data.fileSize)
          }));
          showNotification('success', 'Document uploaded successfully to Azure Storage!');
        }
      } else {
        showNotification('error', response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to upload file. Check Azure credentials/connection.');
    } finally {
      if (type === 'video') {
        setUploadingVideo(false);
      } else {
        setUploadingResource(false);
      }
    }
  };

  // Resource creation
  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    if (!resourceForm.fileName.trim() || !resourceForm.fileUrl.trim()) return;

    try {
      const response = await api.post(`/courses/${selectedCourse.id}/resources`, {
        fileName: resourceForm.fileName,
        fileType: 'PDF',
        fileUrl: resourceForm.fileUrl,
        fileSize: 1024
      });
      if (response.data.success) {
        selectCourseForSyllabus(selectedCourse);
        setResourceForm({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });
        showNotification('success', 'Resource file registered successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to register resource.');
    }
  };

  const handleDeleteResource = async (resId) => {
    if (!window.confirm("Delete this resource file?")) return;
    try {
      const response = await api.delete(`/courses/resources/${resId}`);
      if (response.data.success) {
        selectCourseForSyllabus(selectedCourse);
        showNotification('success', 'Resource deleted.');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete resource.');
    }
  };

  // Live Class Scheduling
  const handleScheduleLive = async (e) => {
    e.preventDefault();
    try {
      const formatDateTime = (dtStr) => {
        if (!dtStr) return "";
        if (dtStr.length === 16) return dtStr + ":00";
        return dtStr;
      };

      const payload = {
        courseId: parseInt(liveForm.courseId),
        title: liveForm.title,
        startTime: formatDateTime(liveForm.startTime),
        endTime: formatDateTime(liveForm.endTime),
        maxParticipants: parseInt(liveForm.maxParticipants),
        chatEnabled: liveForm.chatEnabled,
        guestAccessEnabled: liveForm.guestAccessEnabled
      };

      if (editingSession) {
        const response = await api.put(`/live/${editingSession.id}`, payload);
        if (response.data.success) {
          setLiveSessions(liveSessions.map(s => s.id === editingSession.id ? response.data.data : s));
          setEditingSession(null);
          setLiveForm({
            courseId: courses[0]?.id?.toString() || '',
            title: '',
            startTime: '',
            endTime: '',
            maxParticipants: 50,
            chatEnabled: true,
            guestAccessEnabled: true
          });
          showNotification('success', 'Live Class rescheduled successfully!');
        }
      } else {
        const response = await api.post('/live/create', payload);
        if (response.data.success) {
          setLiveSessions([response.data.data, ...liveSessions]);
          setLiveForm({
            courseId: courses[0]?.id?.toString() || '',
            title: '',
            startTime: '',
            endTime: '',
            maxParticipants: 50,
            chatEnabled: true,
            guestAccessEnabled: true
          });
          showNotification('success', 'Live Class scheduled successfully!');
        }
      }
    } catch (error) {
      console.error(error);
      showNotification('error', editingSession ? 'Failed to update live class.' : 'Failed to schedule live class.');
    }
  };

  const handleStartEditLive = (session) => {
    setEditingSession(session);
    const truncateSeconds = (dtStr) => {
      if (!dtStr) return "";
      return dtStr.substring(0, 16);
    };

    setLiveForm({
      courseId: session.course?.id?.toString() || '',
      title: session.title || '',
      startTime: truncateSeconds(session.startTime),
      endTime: truncateSeconds(session.endTime),
      maxParticipants: session.maxParticipants || 50,
      chatEnabled: session.chatEnabled !== false,
      guestAccessEnabled: session.guestAccessEnabled !== false
    });
  };

  const handleCancelEditLive = () => {
    setEditingSession(null);
    setLiveForm({
      courseId: courses[0]?.id?.toString() || '',
      title: '',
      startTime: '',
      endTime: '',
      maxParticipants: 50,
      chatEnabled: true,
      guestAccessEnabled: true
    });
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this live class session?")) return;
    try {
      const response = await api.delete(`/live/${sessionId}`);
      if (response.data.success) {
        setLiveSessions(liveSessions.filter(s => s.id !== sessionId));
        showNotification('success', 'Live Class session deleted.');
        if (editingSession?.id === sessionId) {
          handleCancelEditLive();
        }
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete live class session.');
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const response = await api.patch(`/live/${sessionId}/start`);
      if (response.data.success) {
        const sessionData = response.data.data;
        setLiveSessions(liveSessions.map(s => s.id === sessionId ? sessionData : s));
        showNotification('success', 'Session started! Redirecting to classroom...');
        setTimeout(() => {
          navigate(`/live/classroom/${sessionData.roomToken}`, {
            state: {
              sessionId: sessionData.id,
              micEnabled: true,
              camEnabled: true,
              role: 'TEACHER',
              name: userName,
              title: sessionData.title,
              courseName: sessionData.course?.title || sessionData.courseName,
              teacherName: sessionData.teacher?.name || userName
            }
          });
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to start session.');
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      const response = await api.patch(`/live/${sessionId}/end`);
      if (response.data.success) {
        setLiveSessions(liveSessions.map(s => s.id === sessionId ? response.data.data : s));
        showNotification('success', 'Session ended. Attendance logged.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
        {/* Welcome HUD Skeleton */}
        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2.5 w-full md:w-1/2">
            <div className="h-4 skeleton rounded-lg w-1/4"></div>
            <div className="h-8 skeleton rounded-xl w-3/4"></div>
          </div>
          <div className="h-10 skeleton rounded-xl w-48 shrink-0"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="h-3 skeleton rounded w-1/2"></div>
              <div className="h-7 skeleton rounded-lg w-3/4"></div>
              <div className="h-2.5 skeleton rounded w-2/3"></div>
            </div>
          ))}
        </div>

        {/* Dashboard Panels Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 space-y-4">
            <div className="h-6 skeleton rounded-lg w-1/3"></div>
            <div className="h-36 skeleton rounded-2xl w-full"></div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
            <div className="h-6 skeleton rounded-lg w-1/2"></div>
            <div className="h-32 skeleton rounded-2xl w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 animate-fade-in relative pb-16">
      
      {/* Toast Popup */}
      <Toast 
        type={notification.type} 
        message={notification.msg} 
        onClose={() => setNotification({ type: '', msg: '' })} 
      />

      {/* ══════════════════ SYLLABUS EDITOR OVERLAY VIEW ══════════════════ */}
      {selectedCourse ? (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-border/50 pb-5">
            <div>
              <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-wider block">
                Syllabus Editor
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{selectedCourse.title}</h2>
            </div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="text-xs font-bold text-slate-400 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Close</span>
            </button>
          </div>

          {/* Add Section/Chapter Form */}
          <form onSubmit={handleAddSection} className="flex gap-3">
            <input
              type="text"
              placeholder="New Section Title (e.g. Getting Started)"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-teal-500"
              required
            />
            <button type="submit" className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-3 rounded-xl transition cursor-pointer select-none">
              + Add Section
            </button>
          </form>

          {/* Chapters Outline */}
          <div className="space-y-6 pt-4">
            {sections.length === 0 ? (
              <p className="text-center text-xs text-slate-500 italic py-16 bg-background/25 border border-dashed border-border rounded-2xl">
                No chapters added yet. Create the first one above!
              </p>
            ) : (
              sections.map((sec, sIdx) => (
                <div key={sec.id} className="bg-background/45 border border-border rounded-2xl p-5 space-y-4">
                  {/* Chapter Header */}
                  <div className="flex justify-between items-center pb-3 border-b border-border/30">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-black text-white">{sIdx + 1}. {sec.title}</span>
                      <button
                        onClick={() => handleUpdateSection(sec.id, prompt('Update Chapter Title:', sec.title) || sec.title)}
                        className="text-[10px] text-slate-500 hover:text-slate-350 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="text-[10px] text-slate-500 hover:text-error font-bold"
                      >
                        Delete
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleStartAddLesson(sec)}
                      className="text-xs font-black text-primary-400 hover:text-primary-300 cursor-pointer"
                    >
                      + Add Lesson
                    </button>
                  </div>

                  {/* Lessons */}
                  <div className="space-y-3.5 pl-4">
                    {(sec.lessons || []).length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">No video lectures added yet.</p>
                    ) : (
                      (sec.lessons || []).map((les, lIdx) => (
                        <div key={les.id} className="bg-background/80 border border-border/50 p-4 rounded-xl flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h5 className="text-white font-bold text-xs">{sIdx + 1}.{lIdx + 1} {les.title}</h5>
                            {les.description && <p className="text-[10px] text-slate-400 leading-normal">{les.description}</p>}
                            {les.videoUrl && (
                              <a href={les.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary-400 hover:underline block break-all font-mono">
                                {les.videoUrl}
                              </a>
                            )}
                          </div>
                          
                          <div className="flex space-x-2 shrink-0">
                            <button
                              onClick={() => handleStartEditLesson(sec, les)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-350"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(les.id)}
                              className="text-[10px] font-bold text-slate-500 hover:text-error"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Downloadable PDF Materials */}
          <div className="pt-6 border-t border-border/50 space-y-6">
            <div>
              <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-2">Current Study Materials ({resources.length})</h4>
              {resources.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No materials added yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resources.map(res => (
                    <div key={res.id} className="bg-background/45 border border-border p-4 rounded-xl flex justify-between items-center">
                      <div className="min-w-0">
                        <span className="text-white font-bold text-xs block truncate">{res.title || res.fileName}</span>
                        <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-[9px] text-slate-500 hover:underline truncate block">
                          {res.fileUrl}
                        </a>
                      </div>
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-error shrink-0 ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-background/45 border border-border p-5 rounded-2xl space-y-4">
              <h4 className="text-white font-bold text-xs">Add Downloadable PDF Materials</h4>
              <form onSubmit={handleResourceSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1">
                  <input
                    type="text"
                    placeholder="Material Title (e.g. Slides PDF)"
                    value={resourceForm.fileName}
                    onChange={(e) => setResourceForm({ ...resourceForm, fileName: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <div className="flex-1 w-full space-y-1">
                  <input
                    type="text"
                    placeholder="Document URL (https://... or Azure Blob)"
                    value={resourceForm.fileUrl}
                    onChange={(e) => setResourceForm({ ...resourceForm, fileUrl: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <div className="w-full md:w-auto shrink-0 flex items-center gap-4">
                  <span className="text-[10px] text-slate-500 font-bold">Or upload:</span>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'resource')}
                    className="text-xs text-slate-400 file:bg-surface-700 file:border-none file:text-white file:px-3 file:py-1.5 file:rounded-lg file:cursor-pointer"
                  />
                </div>

                <button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer select-none">
                  Add Resource
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════ DEFAULT WORKSPACE DASHBOARD ══════════════════ */
        <>
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-primary-950/40 via-card to-primary-950/10 border border-border p-8 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl animate-pulse"></div>
            <h2 className="text-3xl font-black text-white mt-1.5 animate-fade-in">Teacher Workspace</h2>
            <p className="text-xs text-text-muted mt-2 leading-relaxed max-w-2xl font-medium animate-fade-in">
              Publish and update courses, organize syllabus sections and lessons, or schedule interactive live classrooms for students.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: My Courses (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5 gap-4">
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-primary-500 to-teal-400"></span>
                    <span>My Courses</span>
                  </h3>
                  
                  <div className="flex space-x-2 bg-background p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setCourseFilterTab('active')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition cursor-pointer select-none ${
                        courseFilterTab === 'active' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Active ({courses.filter(c => c.active).length})
                    </button>
                    <button
                      onClick={() => setCourseFilterTab('archived')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition cursor-pointer select-none ${
                        courseFilterTab === 'archived' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Archived ({courses.filter(c => !c.active).length})
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {courses.filter(c => courseFilterTab === 'active' ? c.active : !c.active).length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center bg-background/5 rounded-2xl border border-dashed border-border/30">No courses found.</p>
                  ) : (
                    courses.filter(c => courseFilterTab === 'active' ? c.active : !c.active).map(course => (
                      <div key={course.id} className="bg-background/45 border border-border p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-white font-extrabold text-sm">{course.title}</h4>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                              course.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>{course.active ? 'Published' : 'Archived'}</span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-1 font-medium">{course.category || 'General'} | Price: ₹{course.price}</p>
                        </div>

                        <div className="flex space-x-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => selectCourseForSyllabus(course)}
                            className="bg-primary/10 hover:bg-primary/25 text-primary-400 border border-primary-200/20 text-[10px] font-bold px-3.5 py-2 rounded-lg transition cursor-pointer select-none"
                          >
                            Manage Syllabus
                          </button>
                          <button
                            onClick={() => handleStartEditCourse(course)}
                            className="bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-3.5 py-2 rounded-lg transition cursor-pointer select-none"
                          >
                            Edit Details
                          </button>
                          {course.active ? (
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-3.5 py-2 rounded-lg transition cursor-pointer select-none"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreCourse(course.id)}
                              className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-3.5 py-2 rounded-lg transition cursor-pointer select-none"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Schedule Live Class & Teaching Sessions (1/3 width) */}
            <div className="space-y-6">
              {/* Schedule Live Class Form */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-primary-500 to-teal-400"></span>
                  <span>Schedule Live Class</span>
                </h3>

                <form onSubmit={handleScheduleLive} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Select Course</label>
                    <select
                      value={liveForm.courseId}
                      onChange={(e) => setLiveForm({ ...liveForm, courseId: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {courses.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Session Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Q&A and Doubts Resolving"
                      value={liveForm.title}
                      onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Max Capacity</label>
                      <input
                        type="number"
                        value={liveForm.maxParticipants || 50}
                        onChange={(e) => setLiveForm({ ...liveForm, maxParticipants: parseInt(e.target.value) })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-4 pb-2 text-[10px] text-slate-350 font-bold select-none">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={liveForm.chatEnabled !== false}
                          onChange={(e) => setLiveForm({ ...liveForm, chatEnabled: e.target.checked })}
                          className="rounded border-border text-teal-600 focus:ring-0 focus:ring-offset-0 bg-background"
                        />
                        <span>Enable Chat</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={liveForm.guestAccessEnabled !== false}
                          onChange={(e) => setLiveForm({ ...liveForm, guestAccessEnabled: e.target.checked })}
                          className="rounded border-border text-teal-600 focus:ring-0 focus:ring-offset-0 bg-background"
                        />
                        <span>Allow Guests</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Start Time</label>
                      <input
                        type="datetime-local"
                        value={liveForm.startTime}
                        onChange={(e) => setLiveForm({ ...liveForm, startTime: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">End Time</label>
                      <input
                        type="datetime-local"
                        value={liveForm.endTime}
                        onChange={(e) => setLiveForm({ ...liveForm, endTime: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white text-[10px] font-black uppercase py-3 rounded-xl transition cursor-pointer select-none">
                    Schedule Class
                  </button>
                </form>
              </div>

              {/* Teaching Sessions Card */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-rose-500 to-red-400"></span>
                  <span>Teaching Sessions ({liveSessions.length})</span>
                </h3>

                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {liveSessions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center bg-background/5 rounded-2xl border border-dashed border-border/30">
                      No classrooms scheduled.
                    </p>
                  ) : (
                    liveSessions.map(session => (
                      <div key={session.id} className="bg-background/45 border border-border p-3.5 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[8px] bg-primary-600/10 text-primary-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{session.course?.title || 'Class'}</span>
                            <h4 className="text-white font-extrabold text-xs mt-1.5">{session.title}</h4>
                          </div>
                          <div className="flex space-x-2 shrink-0">
                            {session.status === 'SCHEDULED' && (
                              <button
                                onClick={() => handleStartSession(session.id)}
                                className="text-[9px] font-black text-emerald-400 hover:underline uppercase transition cursor-pointer"
                              >
                                Start
                              </button>
                            )}
                            {session.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => navigate(`/live/classroom/${session.roomToken}`, {
                                    state: {
                                      sessionId: session.id,
                                      micEnabled: true,
                                      camEnabled: true,
                                      role: 'TEACHER',
                                      name: userName,
                                      title: session.title,
                                      courseName: session.course?.title || session.courseName,
                                      teacherName: session.teacher?.name || userName
                                    }
                                  })}
                                  className="text-[9px] font-black text-primary-400 hover:underline uppercase transition cursor-pointer"
                                >
                                  Join
                                </button>
                                <button
                                  onClick={() => handleEndSession(session.id)}
                                  className="text-[9px] font-black text-rose-450 hover:underline uppercase transition cursor-pointer"
                                >
                                  End
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-[9px] font-bold text-slate-500 hover:text-error transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <span>📅 {new Date(session.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════ MODALS OVERLAYS ══════════════════ */}
      
      {/* 1. Edit Course details Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleUpdateCourse} className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-extrabold text-sm text-white">Modify Course Details</h3>
              <button type="button" onClick={() => setEditingCourse(null)} className="text-slate-400" aria-label="Close edit course modal">✕</button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Course Title</label>
              <input
                type="text"
                value={editCourseForm.title}
                onChange={(e) => setEditCourseForm({ ...editCourseForm, title: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Price (₹)</label>
                <input
                  type="number"
                  value={editCourseForm.price}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, price: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Discount Price (₹)</label>
                <input
                  type="number"
                  value={editCourseForm.discountPrice}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, discountPrice: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Thumbnail URL</label>
              <input
                type="text"
                value={editCourseForm.thumbnailUrl}
                onChange={(e) => setEditCourseForm({ ...editCourseForm, thumbnailUrl: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-primary hover:bg-primary-light text-white text-[10px] font-black uppercase py-2.5 rounded-xl transition">
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* 2. Add / Edit Lesson Modal Overlay */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleLessonSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-extrabold text-sm text-white">
                {editingLessonId ? 'Modify Lecture Details' : 'Add New Lecture'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowLessonModal(false); setEditingLessonId(null); }} 
                className="text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Lecture Title</label>
              <input
                type="text"
                placeholder="Lecture Title (e.g. Installation)"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Description</label>
              <textarea
                placeholder="Lecture description..."
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                className="w-full h-16 bg-background border border-border rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Video File (Optional)</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
                className="text-xs text-slate-400"
              />
              {uploadingVideo && <p className="text-[9px] text-teal-400 font-bold animate-pulse">Uploading to Azure Storage...</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Video URL</label>
              <input
                type="text"
                placeholder="Video Cloud Storage URL"
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <button type="submit" className="w-full bg-primary hover:bg-primary-light text-white text-[10px] font-black uppercase py-2.5 rounded-xl transition">
              {editingLessonId ? 'Update Lesson' : 'Add Lesson'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
