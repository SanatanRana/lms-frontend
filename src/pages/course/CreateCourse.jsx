import React, { useState } from 'react';
import api from '../../api/axiosConfig';
import { useNavigate } from 'react-router-dom';

const CreateCourse = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discountPrice: '',
    thumbnailUrl: '',
    introVideoUrl: '',
    category: 'Engineering'
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);

    if (type === 'thumbnail') {
      setUploadingThumbnail(true);
    } else {
      setUploadingIntro(true);
    }

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        const fileUrl = response.data.data.url;
        if (type === 'thumbnail') {
          setFormData(prev => ({ ...prev, thumbnailUrl: fileUrl }));
          setSuccessMsg('Thumbnail uploaded successfully to Azure Storage!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          setFormData(prev => ({ ...prev, introVideoUrl: fileUrl }));
          setSuccessMsg('Intro video uploaded successfully to Azure Storage!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } else {
        setErrorMsg(response.data.message || 'Upload failed');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to upload file to Azure. Make sure credentials are configured.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      if (type === 'thumbnail') {
        setUploadingThumbnail(false);
      } else {
        setUploadingIntro(false);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.title.trim() || !formData.description.trim()) {
        setErrorMsg('Please fill in the title and description.');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null
      };

      const response = await api.post('/courses/create', payload);
      const apiResp = response.data;
      if (apiResp.success) {
        setSuccessMsg("Course published successfully!");
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setErrorMsg(apiResp.message || "Failed to create course");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.response?.data || "Course creation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex justify-center items-center px-4 py-12">
      <div className="bg-surface-800/80 backdrop-blur-md p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-surface-600 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary-600/10 blur-3xl glow-teal"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent-500/5 blur-3xl glow-amber"></div>

        <div className="relative">
          <h2 className="text-3xl font-extrabold mb-2 text-white tracking-tight">Publish a New Course</h2>
          <p className="text-slate-400 text-sm mb-6">Create and configure your course structure step-by-step.</p>

          {/* Step Progress Bar */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-surface-600 -translate-y-1/2 z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary-500 -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>

            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Media' },
              { num: 3, label: 'Pricing' }
            ].map(item => (
              <div key={item.num} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                  step >= item.num 
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20' 
                    : 'bg-surface-800 border-surface-600 text-slate-400'
                }`}>
                  {item.num}
                </div>
                <span className={`text-[10px] mt-1 font-semibold uppercase tracking-wider transition-colors duration-300 ${
                  step >= item.num ? 'text-primary-400' : 'text-slate-500'
                }`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2">
              <svg className="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : handleNext} className="space-y-5">
            {/* STEP 1: DETAILS */}
            {step === 1 && (
              <div className="space-y-5 animate-scale-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Course Title</label>
                  <input 
                    type="text" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange} 
                    placeholder="e.g. Master Spring Boot & System Design"
                    className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="block w-full bg-surface-900/90 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                  >
                    <option value="Engineering">📐 Engineering</option>
                    <option value="Business">💼 Business</option>
                    <option value="Design">🎨 Design</option>
                    <option value="Marketing">📈 Marketing</option>
                    <option value="Science">🧪 Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    rows="5" 
                    placeholder="Write a compelling course description..."
                    className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                    required 
                  />
                </div>
              </div>
            )}

            {/* STEP 2: MEDIA */}
            {step === 2 && (
              <div className="space-y-5 animate-scale-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Thumbnail Image URL</label>
                  <input 
                    type="url" 
                    name="thumbnailUrl" 
                    value={formData.thumbnailUrl} 
                    onChange={handleChange} 
                    placeholder="https://images.unsplash.com/photo-... or Azure link"
                    className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                    disabled={uploadingThumbnail}
                  />
                  <div className="flex items-center space-x-2 mt-2 p-3 bg-surface-900/30 border border-surface-600/50 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Or upload file:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0], 'thumbnail');
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                      disabled={uploadingThumbnail}
                    />
                    {uploadingThumbnail && <span className="text-[10px] text-accent-500 animate-pulse">Uploading...</span>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Intro Video URL</label>
                  <input 
                    type="url" 
                    name="introVideoUrl" 
                    value={formData.introVideoUrl} 
                    onChange={handleChange} 
                    placeholder="https://youtube.com/watch?v=... or Azure link"
                    className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                    disabled={uploadingIntro}
                  />
                  <div className="flex items-center space-x-2 mt-2 p-3 bg-surface-900/30 border border-surface-600/50 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Or upload MP4:</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0], 'intro');
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-primary-600/10 file:text-primary-400 hover:file:bg-primary-600/20 cursor-pointer"
                      disabled={uploadingIntro}
                    />
                    {uploadingIntro && <span className="text-[10px] text-accent-500 animate-pulse">Uploading...</span>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PRICING & CONFIRM */}
            {step === 3 && (
              <div className="space-y-5 animate-scale-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Price (₹)</label>
                    <input 
                      type="number" 
                      name="price" 
                      value={formData.price} 
                      onChange={handleChange} 
                      placeholder="e.g. 1999"
                      className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Discount Price (₹)</label>
                    <input 
                      type="number" 
                      name="discountPrice" 
                      value={formData.discountPrice} 
                      onChange={handleChange} 
                      placeholder="e.g. 999"
                      className="block w-full bg-surface-900/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-900/40 rounded-xl border border-surface-600/60 space-y-2">
                  <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">Review Course Summary</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p><strong className="text-slate-300">Title:</strong> {formData.title || 'Untitled Course'}</p>
                    <p><strong className="text-slate-300">Category:</strong> {formData.category}</p>
                    <p><strong className="text-slate-300">Price:</strong> ₹{formData.price || '0'} {formData.discountPrice && `(Discounted to ₹${formData.discountPrice})`}</p>
                    <p><strong className="text-slate-300">Media:</strong> {formData.thumbnailUrl ? '✅ Thumbnail Added' : '❌ No Thumbnail'} | {formData.introVideoUrl ? '✅ Intro Video Added' : '❌ No Intro Video'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-600/60">
              {step > 1 ? (
                <button 
                  type="button" 
                  onClick={handlePrev}
                  className="bg-surface-700 hover:bg-surface-600 text-white font-semibold py-2 px-5 rounded-xl transition text-sm cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button 
                  type="submit" 
                  className="bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 px-5 rounded-xl transition text-sm shadow-md shadow-primary-500/20 cursor-pointer"
                >
                  Continue
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-primary-600/15 hover:shadow-primary-600/25 transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span>Publish Course</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;
