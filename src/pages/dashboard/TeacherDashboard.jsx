import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Course edit state
  const [currentTab, setCurrentTab] = useState('active'); // 'active' vs 'archived'
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

  // Syllabus management state
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  
  // Lesson state
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', videoUrl: '' });

  // Edit states for sections and lessons
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editingLessonForm, setEditingLessonForm] = useState({ title: '', description: '', videoUrl: '' });

  // Resource state
  const [resourceForm, setResourceForm] = useState({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });
  const [resources, setResources] = useState([]);
  const [editingResourceId, setEditingResourceId] = useState(null);
  const [editingResourceForm, setEditingResourceForm] = useState({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });

  // Live session scheduler state
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      setLiveSessions(liveResp.data.data);
    } catch (error) {
      console.error("Error fetching teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Course Edit & Archive Handlers ──

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
    if (!window.confirm("Are you sure you want to delete/archive this course? If it has students enrolled, it will be Archived (preserving student access and billing records). If it is empty, it will be permanently deleted.")) return;
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
        showNotification('success', 'Course published/restored successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to restore course.');
    }
  };

  // ── Syllabus Sections & Lessons ──

  const selectCourseForSyllabus = async (course) => {
    setSelectedCourse(course);
    setSelectedSectionId(null);
    setNewSectionTitle('');
    setEditingResourceId(null);
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

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return;

    try {
      const response = await api.post(`/sections/${selectedSectionId}/lessons`, lessonForm);
      if (response.data.success) {
        // Refresh sections to reload lessons
        selectCourseForSyllabus(selectedCourse);
        setLessonForm({ title: '', description: '', videoUrl: '' });
        setSelectedSectionId(null);
        showNotification('success', 'Lesson added to section successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to add lesson.');
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.fileName.trim()) return;

    try {
      const response = await api.post(`/courses/${selectedCourse.id}/resources`, resourceForm);
      if (response.data.success) {
        setResources([...resources, response.data.data]);
        setResourceForm({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });
        showNotification('success', 'Resource uploaded successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to add resource.');
    }
  };

  const handleUpdateResource = async (e, resourceId) => {
    e.preventDefault();
    if (!editingResourceForm.fileName.trim()) return;
    try {
      const response = await api.put(`/resources/${resourceId}`, editingResourceForm);
      if (response.data.success) {
        setResources(resources.map(res => res.id === resourceId ? response.data.data : res));
        setEditingResourceId(null);
        setEditingResourceForm({ fileName: '', fileType: 'PDF', fileUrl: '', fileSize: 1024 });
        showNotification('success', 'Resource updated successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to update resource.');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      const response = await api.delete(`/resources/${resourceId}`);
      if (response.data.success) {
        setResources(resources.filter(res => res.id !== resourceId));
        showNotification('success', 'Resource deleted successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete resource.');
    }
  };

  const handleUpdateSection = async (sectionId) => {
    if (!editingSectionTitle.trim()) return;
    try {
      const response = await api.put(`/sections/${sectionId}`, { title: editingSectionTitle });
      if (response.data.success) {
        setSections(sections.map(sec => sec.id === sectionId ? { ...sec, title: response.data.data.title } : sec));
        setEditingSectionId(null);
        setEditingSectionTitle('');
        showNotification('success', 'Section updated successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to update section.');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section? This will also delete all lessons in this section.")) return;
    try {
      const response = await api.delete(`/sections/${sectionId}`);
      if (response.data.success) {
        setSections(sections.filter(sec => sec.id !== sectionId));
        showNotification('success', 'Section deleted successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete section.');
    }
  };

  const handleUpdateLesson = async (e, lessonId) => {
    e.preventDefault();
    if (!editingLessonForm.title.trim()) return;
    try {
      const response = await api.put(`/lessons/${lessonId}`, editingLessonForm);
      if (response.data.success) {
        selectCourseForSyllabus(selectedCourse);
        setEditingLessonId(null);
        setEditingLessonForm({ title: '', description: '', videoUrl: '' });
        showNotification('success', 'Lesson updated successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to update lesson.');
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
    const formData = new FormData();
    formData.append('file', file);

    if (type === 'video') {
      setUploadingVideo(true);
    } else {
      setUploadingResource(true);
    }

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        const fileUrl = response.data.data.url;
        if (type === 'video') {
          if (editingLessonId) {
            setEditingLessonForm(prev => ({ ...prev, videoUrl: fileUrl }));
          } else {
            setLessonForm(prev => ({ ...prev, videoUrl: fileUrl }));
          }
          showNotification('success', 'Video uploaded successfully to Azure Storage!');
        } else {
          if (editingResourceId) {
            setEditingResourceForm(prev => ({
              ...prev,
              fileUrl,
              fileName: prev.fileName || response.data.data.fileName,
              fileSize: parseInt(response.data.data.fileSize)
            }));
          } else {
            setResourceForm(prev => ({ 
              ...prev, 
              fileUrl,
              fileName: prev.fileName || response.data.data.fileName,
              fileSize: parseInt(response.data.data.fileSize)
            }));
          }
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

  // ── Live Class Management ──

  const handleScheduleLive = async (e) => {
    e.preventDefault();
    try {
      const formatDateTime = (dtStr) => {
        if (!dtStr) return "";
        if (dtStr.length === 16) return dtStr + ":00"; // YYYY-MM-DDTHH:MM -> add :00
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
    if (!window.confirm("Are you sure you want to delete this live class session? This action cannot be undone.")) return;
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
        setLiveSessions(liveSessions.map(s => s.id === sessionId ? response.data.data : s));
        showNotification('success', 'Session started! Redirecting to classroom...');
        setTimeout(() => {
          navigate(`/live/classroom/${sessionId}`);
        }, 1000);
      }
    } catch (error) {
      console.error(error);
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

  const handleUploadRecording = async (sessionId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingVideo(true);
    try {
      const response = await api.post(`/live/${sessionId}/recording`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        setLiveSessions(liveSessions.map(s => s.id === sessionId ? response.data.data : s));
        showNotification('success', 'Recording uploaded successfully!');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to upload recording.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteRecording = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete the recording?")) return;
    try {
      const response = await api.delete(`/live/${sessionId}/recording`);
      if (response.data.success) {
        setLiveSessions(liveSessions.map(s => s.id === sessionId ? response.data.data : s));
        showNotification('success', 'Recording deleted.');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to delete recording.');
    }
  };

  const showNotification = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification({ type: '', msg: '' }), 3000);
  };

  if (loading) {
    return <LoadingSpinner text="Loading teacher workspace..." />;
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4">
      {/* Alert Notification */}
      <Toast 
        type={notification.type} 
        message={notification.msg} 
        onClose={() => setNotification({ type: '', msg: '' })} 
      />

      {/* Hero Welcome */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-900/40 to-teal-900/40 border border-surface-600 p-8 shadow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Teacher Workspace</h2>
        <p className="text-slate-300 text-sm max-w-xl">
          Publish and update courses, organize syllabus sections and lessons, or schedule interactive live classrooms for students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Course List and Syllabus Creator */}
        <div className="lg:col-span-2 space-y-8">
          
             <section className="bg-surface-800 border border-surface-600 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-surface-600 pb-4 mb-6 gap-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-4 rounded bg-primary-500"></span>
                <span>My Courses</span>
              </h3>
              
              <div className="flex space-x-2 bg-surface-900/50 p-1 rounded-xl border border-surface-600 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentTab('active')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    currentTab === 'active'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({courses.filter(c => c.active).length})
                </button>
                <button
                  onClick={() => setCurrentTab('archived')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    currentTab === 'archived'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Archived ({courses.filter(c => !c.active).length})
                </button>
              </div>
            </div>

            {courses.filter(c => currentTab === 'active' ? c.active : !c.active).length === 0 ? (
              <p className="text-slate-500 text-sm py-4">
                {currentTab === 'active' 
                  ? 'No active courses published yet. Use "+ New Course" at the top to publish one!'
                  : 'No archived courses.'}
              </p>
            ) : (
              <div className="divide-y divide-[#1e293b] space-y-4">
                {courses.filter(c => currentTab === 'active' ? c.active : !c.active).map(course => (
                  <div key={course.id} className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <h4 className="text-white font-bold text-base">{course.title}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          course.active 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {course.active ? 'Published' : 'Archived'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{course.category} | Price: ₹{course.price}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 md:mt-0 shrink-0">
                      <button
                        onClick={() => selectCourseForSyllabus(course)}
                        className="bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 border border-primary-600/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Manage Syllabus
                      </button>
                      <button
                        onClick={() => handleStartEditCourse(course)}
                        className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Edit Details
                      </button>
                      {course.active ? (
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Archive/Delete Course"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreCourse(course.id)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Restore/Publish Course"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Manage Syllabus details */}
          {selectedCourse && (
            <section className="bg-surface-800 border border-surface-600 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-surface-600">
                <div>
                  <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest">Syllabus Editor</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedCourse.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {/* Add Section Form */}
              <form onSubmit={handleAddSection} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="New Section Title (e.g. Getting Started)"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="flex-grow bg-surface-900/50 text-white border border-surface-600 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary-600"
                  required
                />
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  + Add Section
                </button>
              </form>

              {/* Sections & Lessons Listing */}
              <div className="space-y-4">
                {(sections || []).length === 0 ? (
                  <p className="text-slate-500 text-xs py-4">No sections added yet. Create one above.</p>
                ) : (
                  (sections || []).map((sec, idx) => (
                    <div key={sec.id} className="border border-surface-600 rounded-xl p-4 bg-surface-900/20">
                      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        {editingSectionId === sec.id ? (
                          <div className="flex items-center space-x-2 flex-grow max-w-md">
                            <input
                              type="text"
                              value={editingSectionTitle}
                              onChange={(e) => setEditingSectionTitle(e.target.value)}
                              className="flex-grow bg-surface-900 text-white border border-primary-600/50 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                              required
                            />
                            <button
                              onClick={() => handleUpdateSection(sec.id)}
                              className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-2.5 py-1 rounded-md font-semibold transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSectionId(null)}
                              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-2.5 py-1 rounded-md transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-bold text-sm">
                              {idx + 1}. {sec.title}
                            </span>
                            <div className="flex space-x-2 opacity-50 hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  setEditingSectionId(sec.id);
                                  setEditingSectionTitle(sec.title);
                                }}
                                className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold underline"
                                title="Edit Section Name"
                              >
                                Edit
                              </button>
                              <span className="text-slate-700 text-[10px]">|</span>
                              <button
                                onClick={() => handleDeleteSection(sec.id)}
                                className="text-[10px] text-error hover:text-rose-300 font-semibold underline"
                                title="Delete Section"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedSectionId(sec.id)}
                          className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                        >
                          + Add Lesson
                        </button>
                      </div>

                      {/* Lessons list */}
                      <div className="pl-4 space-y-3 border-l border-surface-600">
                        {sec.lessons && sec.lessons.length > 0 ? (
                          sec.lessons.map((lesson, lIdx) => (
                            <div key={lesson.id}>
                              {editingLessonId === lesson.id ? (
                                <form onSubmit={(e) => handleUpdateLesson(e, lesson.id)} className="bg-surface-900/60 border border-primary-600/30 rounded-xl p-4 space-y-3 mt-1">
                                  <h5 className="text-primary-400 font-bold text-[11px] uppercase tracking-wider">Edit Lesson</h5>
                                  <input
                                    type="text"
                                    placeholder="Lesson Title"
                                    value={editingLessonForm.title}
                                    onChange={(e) => setEditingLessonForm({ ...editingLessonForm, title: e.target.value })}
                                    className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                                    required
                                  />
                                  <textarea
                                    placeholder="Description"
                                    value={editingLessonForm.description || ''}
                                    onChange={(e) => setEditingLessonForm({ ...editingLessonForm, description: e.target.value })}
                                    rows="2"
                                    className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                                  />
                                  <div className="space-y-1">
                                    <input
                                      type="url"
                                      placeholder="Video Embed URL"
                                      value={editingLessonForm.videoUrl}
                                      onChange={(e) => setEditingLessonForm({ ...editingLessonForm, videoUrl: e.target.value })}
                                      className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                                      required
                                      disabled={uploadingVideo}
                                    />
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] text-slate-500">Or upload MP4:</span>
                                      <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleFileUpload(e.target.files[0], 'video');
                                          }
                                        }}
                                        className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                                        disabled={uploadingVideo}
                                      />
                                      {uploadingVideo && <span className="text-[10px] text-amber-400 animate-pulse">Uploading to Azure...</span>}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingLessonId(null)}
                                      className="text-xs text-slate-400 px-3 py-1.5"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="text-xs text-slate-300 bg-surface-900/40 p-3 rounded-lg flex justify-between items-start gap-4">
                                  <div className="flex-grow">
                                    <span className="font-semibold text-slate-200">{idx + 1}.{lIdx + 1} {lesson.title}</span>
                                    {lesson.description && <p className="text-slate-400 text-[11px] mt-1">{lesson.description}</p>}
                                    <p className="text-slate-500 text-[10px] mt-1 line-clamp-1">{lesson.videoUrl}</p>
                                  </div>
                                  <div className="flex space-x-2 shrink-0 opacity-40 hover:opacity-100 transition mt-0.5">
                                    <button
                                      onClick={() => {
                                        setEditingLessonId(lesson.id);
                                        setEditingLessonForm({
                                          title: lesson.title,
                                          description: lesson.description || '',
                                          videoUrl: lesson.videoUrl
                                        });
                                      }}
                                      className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold underline"
                                      title="Edit Lesson"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-slate-700 text-[10px]">|</span>
                                    <button
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                      className="text-[10px] text-error hover:text-rose-300 font-semibold underline"
                                      title="Delete Lesson"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-600 text-[10px]">No lessons in this section yet.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Lesson Modal Overlay (conditional form) */}
              {selectedSectionId && (
                <div className="bg-surface-900/60 border border-surface-600 rounded-xl p-4 space-y-3">
                  <h4 className="text-white font-bold text-xs">Add New Lesson</h4>
                  <form onSubmit={handleAddLesson} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Lesson Title"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                      required
                    />
                    <textarea
                      placeholder="Description"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      rows="2"
                      className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                    />
                    <div className="space-y-1">
                      <input
                        type="url"
                        placeholder="Video Embed URL (e.g. YouTube/Vimeo/Azure Blob Link)"
                        value={lessonForm.videoUrl}
                        onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                        className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                        required
                        disabled={uploadingVideo}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500">Or upload MP4:</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], 'video');
                            }
                          }}
                          className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                          disabled={uploadingVideo}
                        />
                        {uploadingVideo && <span className="text-[10px] text-amber-400 animate-pulse">Uploading to Azure...</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedSectionId(null)}
                        className="text-xs text-slate-400 px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Save Lesson
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* List of current resource materials */}
              <div className="pt-4 border-t border-surface-600 space-y-3">
                <h4 className="text-white font-bold text-xs">Current Study Materials ({resources.length})</h4>
                {resources.length === 0 ? (
                  <p className="text-slate-500 text-[10px]">No materials added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {resources.map(res => (
                      <div key={res.id} className="text-xs bg-surface-900/30 border border-surface-600 p-3 rounded-lg">
                        {editingResourceId === res.id ? (
                          <form onSubmit={(e) => handleUpdateResource(e, res.id)} className="space-y-3">
                            <input
                              type="text"
                              placeholder="Material Title"
                              value={editingResourceForm.fileName}
                              onChange={(e) => setEditingResourceForm({ ...editingResourceForm, fileName: e.target.value })}
                              className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                              required
                              disabled={uploadingResource}
                            />
                            <div className="space-y-1">
                              <input
                                type="url"
                                placeholder="Document URL"
                                value={editingResourceForm.fileUrl}
                                onChange={(e) => setEditingResourceForm({ ...editingResourceForm, fileUrl: e.target.value })}
                                className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                                required
                                disabled={uploadingResource}
                              />
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-500">Or upload file:</span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(e.target.files[0], 'resource');
                                    }
                                  }}
                                  className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                                  disabled={uploadingResource}
                                />
                                {uploadingResource && <span className="text-[10px] text-amber-400 animate-pulse">Uploading...</span>}
                              </div>
                            </div>
                            <div className="flex space-x-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingResourceId(null)}
                                className="text-xs text-slate-400 px-3 py-1.5"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                disabled={uploadingResource}
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex-grow">
                              <span className="font-semibold text-slate-200">{res.fileName}</span>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary-600/10 text-primary-400 uppercase">
                                  {res.fileType}
                                </span>
                                <a 
                                  href={res.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-slate-400 hover:text-primary-400 text-[10px] underline truncate max-w-xs md:max-w-md inline-block"
                                >
                                  {res.fileUrl}
                                </a>
                              </div>
                            </div>
                            <div className="flex space-x-2 shrink-0 opacity-50 hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  setEditingResourceId(res.id);
                                  setEditingResourceForm({
                                    fileName: res.fileName,
                                    fileType: res.fileType || 'PDF',
                                    fileUrl: res.fileUrl,
                                    fileSize: res.fileSize || 1024
                                  });
                                }}
                                className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold underline"
                                title="Edit Material"
                              >
                                Edit
                              </button>
                              <span className="text-slate-700 text-[10px]">|</span>
                              <button
                                onClick={() => handleDeleteResource(res.id)}
                                className="text-[10px] text-error hover:text-rose-300 font-semibold underline"
                                title="Delete Material"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Material Resources form */}
              <div className="pt-4 border-t border-surface-600 space-y-3">
                <h4 className="text-white font-bold text-xs">Add Downloadable PDF Materials</h4>
                <form onSubmit={handleAddResource} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Material Title (e.g. Slides PDF)"
                    value={resourceForm.fileName}
                    onChange={(e) => setResourceForm({ ...resourceForm, fileName: e.target.value })}
                    className="bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                    required
                    disabled={uploadingResource}
                  />
                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="Document URL (https://... or Azure Blob Link)"
                      value={resourceForm.fileUrl}
                      onChange={(e) => setResourceForm({ ...resourceForm, fileUrl: e.target.value })}
                      className="w-full bg-surface-900/50 text-white border border-surface-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-600"
                      required
                      disabled={uploadingResource}
                    />
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-500">Or upload file:</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'resource');
                          }
                        }}
                        className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                        disabled={uploadingResource}
                      />
                      {uploadingResource && <span className="text-[10px] text-amber-400 animate-pulse">Uploading to Azure...</span>}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-surface-700 border border-surface-500 text-slate-300 hover:bg-surface-600 text-xs font-bold py-1.5 rounded-lg transition self-start"
                    disabled={uploadingResource}
                  >
                    Add Resource
                  </button>
                </form>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Live Session Scheduler and Active Classes */}
        <div className="space-y-8">
          {/* Scheduler */}
          <section className="bg-surface-800 border border-surface-600 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <span className="w-2 h-4 rounded bg-emerald-500"></span>
              <span>{editingSession ? 'Reschedule Live Class' : 'Schedule Live Class'}</span>
            </h3>

            {courses.length === 0 ? (
              <p className="text-slate-500 text-xs">You must create a course before scheduling a live class.</p>
            ) : (
              <form onSubmit={handleScheduleLive} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Course</label>
                  <select
                    name="courseId"
                    value={liveForm.courseId}
                    onChange={(e) => setLiveForm({ ...liveForm, courseId: e.target.value })}
                    className="block w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                    required
                  >
                    {courses.filter(c => c.active).map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Session Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Q&A and Doubts Resolving"
                    value={liveForm.title}
                    onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                    className="block w-full bg-surface-900/50 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Max Capacity</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={liveForm.maxParticipants}
                      onChange={(e) => setLiveForm({ ...liveForm, maxParticipants: parseInt(e.target.value) })}
                      className="block w-full bg-surface-900/50 text-white border border-surface-600 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-4">
                    <input
                      type="checkbox"
                      id="chatEnabled"
                      checked={liveForm.chatEnabled}
                      onChange={(e) => setLiveForm({ ...liveForm, chatEnabled: e.target.checked })}
                      className="rounded bg-surface-900 border-surface-600 text-primary-600 focus:ring-0"
                    />
                    <label htmlFor="chatEnabled" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">Enable Chat</label>
                  </div>
                  <div className="flex items-center gap-1.5 mt-4">
                    <input
                      type="checkbox"
                      id="guestAccessEnabled"
                      checked={liveForm.guestAccessEnabled}
                      onChange={(e) => setLiveForm({ ...liveForm, guestAccessEnabled: e.target.checked })}
                      className="rounded bg-surface-900 border-surface-600 text-primary-600 focus:ring-0"
                    />
                    <label htmlFor="guestAccessEnabled" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">Allow Guests</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={liveForm.startTime}
                      onChange={(e) => setLiveForm({ ...liveForm, startTime: e.target.value })}
                      className="block w-full bg-surface-900/50 text-white border border-surface-600 rounded-xl px-2 py-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={liveForm.endTime}
                      onChange={(e) => setLiveForm({ ...liveForm, endTime: e.target.value })}
                      className="block w-full bg-surface-900/50 text-white border border-surface-600 rounded-xl px-2 py-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-grow bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
                  >
                    {editingSession ? 'Update Class' : 'Schedule Class'}
                  </button>
                  {editingSession && (
                    <button
                      type="button"
                      onClick={handleCancelEditLive}
                      className="bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Active / Scheduled Sessions */}
          <section className="bg-surface-800 border border-surface-600 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <span className="w-2 h-4 rounded bg-error"></span>
              <span>Teaching Sessions ({liveSessions.length})</span>
            </h3>

            {liveSessions.length === 0 ? (
              <p className="text-slate-500 text-xs py-2">No classrooms scheduled.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {liveSessions.map(session => (
                  <div key={session.id} className="border border-surface-600 rounded-xl p-3 bg-surface-900/30">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-white line-clamp-1">{session.title}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        session.status === 'LIVE' ? 'bg-error/10 text-error' :
                        session.status === 'ENDED' ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Start: {new Date(session.startTime).toLocaleString()}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleStartSession(session.id)}
                            className="bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            Start Live
                          </button>
                          <button
                            onClick={() => handleStartEditLive(session)}
                            className="bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/live/join/${session.roomToken}`;
                              navigator.clipboard.writeText(shareUrl);
                              showNotification('success', 'Join link copied to clipboard!');
                            }}
                            className="bg-slate-700 text-slate-300 border border-slate-500 text-[10px] font-semibold px-2.5 py-1 rounded-md transition hover:bg-slate-600 cursor-pointer"
                          >
                            Copy Link
                          </button>
                        </>
                      )}
                      {session.status === 'LIVE' && (
                        <>
                          <button
                            onClick={() => handleEndSession(session.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            End Session
                          </button>
                          <button
                            onClick={() => navigate(`/live/classroom/${session.id}`)}
                            className="bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            Enter Classroom
                          </button>
                        </>
                      )}
                      {session.status === 'ENDED' && (
                        <>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            Delete Session
                          </button>
                          {session.recordingStatus === 'AVAILABLE' ? (
                            <>
                              <a
                                href={session.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-primary-600/20 border border-primary-500/30 text-primary-400 text-[10px] font-bold px-2.5 py-1 rounded-md transition inline-block"
                              >
                                View Recording
                              </a>
                              <button
                                onClick={() => handleDeleteRecording(session.id)}
                                className="bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                              >
                                Remove Recording
                              </button>
                            </>
                          ) : (
                            <label className="bg-slate-700 hover:bg-slate-600 text-slate-300 border border-surface-500 text-[10px] font-semibold px-2.5 py-1 rounded-md transition cursor-pointer flex items-center">
                              Upload Recording
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => handleUploadRecording(session.id, e.target.files[0])}
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit Course Modal Overlay */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-2xl space-y-4">
            {/* Close button */}
            <button 
              onClick={() => setEditingCourse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer text-sm"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="w-2 h-4 rounded bg-amber-500"></span>
              <span>Edit Course Details</span>
            </h3>
            
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Course Title / Name</label>
                <input
                  type="text"
                  value={editCourseForm.title}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, title: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={editCourseForm.category}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, category: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Business">Business</option>
                  <option value="Design">Design</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={editCourseForm.description}
                  onChange={(e) => setEditCourseForm({ ...editCourseForm, description: e.target.value })}
                  rows="3"
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCourseForm.price}
                    onChange={(e) => setEditCourseForm({ ...editCourseForm, price: e.target.value })}
                    className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Discount Price (₹, optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCourseForm.discountPrice}
                    onChange={(e) => setEditCourseForm({ ...editCourseForm, discountPrice: e.target.value })}
                    className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-4 py-2 rounded-xl transition font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded-xl transition font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
