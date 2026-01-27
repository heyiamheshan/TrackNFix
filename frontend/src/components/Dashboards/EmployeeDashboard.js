import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiUpload, FiX, FiSend, FiSearch } from 'react-icons/fi';
import './Dashboard.css';

import logo from '../../assets/logo.png'; // Import the logo

const EmployeeDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('create-job');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleSearchResults, setVehicleSearchResults] = useState([]);
  const [showVehicleSearch, setShowVehicleSearch] = useState(false);
  const [formData, setFormData] = useState({
    job_type: '',
    special_notes: '',
    initial_images: [],
    after_images: [],
    parts_replaced: []
  });

  useEffect(() => {
    if (activeTab === 'my-jobs') {
      fetchMyJobs();
    }
  }, [activeTab]);

  const fetchMyJobs = async () => {
    try {
      const response = await axios.get('/jobs/employee/my-jobs');
      setJobs(response.data.jobs);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    }
  };

  const handleVehicleSearch = async (query) => {
    setVehicleNumber(query);
    if (query.length > 2) {
      try {
        const response = await axios.get('/vehicles/search', {
          params: { vehicle_number: query }
        });
        setVehicleSearchResults(response.data.vehicles || []);
        setShowVehicleSearch(true);
      } catch (error) {
        setVehicleSearchResults([]);
      }
    } else {
      setVehicleSearchResults([]);
      setShowVehicleSearch(false);
    }
  };

  const selectVehicle = (vehicle) => {
    setVehicleNumber(vehicle.vehicle_number);
    setShowVehicleSearch(false);
    setVehicleSearchResults([]);
  };

  const handleJobTypeChange = (e) => {
    setFormData({ ...formData, job_type: e.target.value });
  };

  const handleImageUpload = (e, type) => {
    const files = Array.from(e.target.files);
    const newImages = [...formData[type], ...files];
    setFormData({ ...formData, [type]: newImages });
  };

  const removeImage = (index, type) => {
    const newImages = formData[type].filter((_, i) => i !== index);
    setFormData({ ...formData, [type]: newImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.job_type) {
      toast.error('Please select a job type');
      return;
    }

    if (!vehicleNumber) {
      toast.error('Please enter or select a vehicle number');
      return;
    }

    if (formData.initial_images.length === 0) {
      toast.error('Please upload initial images of the vehicle');
      return;
    }

    setLoading(true);

    try {
      // First, ensure vehicle exists or create it
      let vehicleId;
      try {
        const vehicleResponse = await axios.get(`/vehicles/${vehicleNumber}`);
        vehicleId = vehicleResponse.data.vehicle.id;
      } catch (error) {
        // Vehicle doesn't exist, create it
        const createResponse = await axios.post('/vehicles', {
          vehicle_number: vehicleNumber
        });
        vehicleId = createResponse.data.vehicle.id;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('job_type', formData.job_type);
      formDataToSend.append('special_notes', formData.special_notes);
      formDataToSend.append('vehicle_id', vehicleId);
      
      // Prepare image arrays with filenames
      const initialImageNames = formData.initial_images.map((_, idx) => `initial-${idx}`);
      const afterImageNames = formData.after_images.map((_, idx) => `after-${idx}`);
      
      formDataToSend.append('initial_images', JSON.stringify(initialImageNames));
      formDataToSend.append('after_images', JSON.stringify(afterImageNames));
      formDataToSend.append('parts_replaced', JSON.stringify(formData.parts_replaced));

      // Append all images
      formData.initial_images.forEach((file, idx) => {
        formDataToSend.append('images', file);
      });
      formData.after_images.forEach((file) => {
        formDataToSend.append('images', file);
      });

      await axios.post('/jobs', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Job submitted successfully!');
      setFormData({
        job_type: '',
        special_notes: '',
        initial_images: [],
        after_images: [],
        parts_replaced: []
      });
      setVehicleNumber('');
      setActiveTab('my-jobs');
      fetchMyJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <img src={logo} alt="Jayakody Auto Electricals Logo" className="dashboard-logo" />
          <h1 className="dashboard-title">Employee Dashboard</h1>
          <p className="dashboard-subtitle">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'create-job' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-job')}
        >
          <FiPlus /> Create Job
        </button>
        <button
          className={`nav-tab ${activeTab === 'my-jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-jobs')}
        >
          My Jobs
        </button>
      </div>

      {activeTab === 'create-job' && (
        <div className="glass-card">
          <h2 className="section-title">Create New Job</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Vehicle Number *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter vehicle number"
                  value={vehicleNumber}
                  onChange={(e) => handleVehicleSearch(e.target.value)}
                  required
                />
                {showVehicleSearch && vehicleSearchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'rgba(15, 32, 39, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '0.5rem',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {vehicleSearchResults.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        onClick={() => selectVehicle(vehicle)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          marginBottom: '0.25rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {vehicle.vehicle_number}
                        </div>
                        {vehicle.customer_name && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {vehicle.customer_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Job Type *</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="monthly_service"
                    name="job_type"
                    value="monthly_service"
                    checked={formData.job_type === 'monthly_service'}
                    onChange={handleJobTypeChange}
                  />
                  <label htmlFor="monthly_service">Monthly Service</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="repair"
                    name="job_type"
                    value="repair"
                    checked={formData.job_type === 'repair'}
                    onChange={handleJobTypeChange}
                  />
                  <label htmlFor="repair">Repair</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="accident_recovery"
                    name="job_type"
                    value="accident_recovery"
                    checked={formData.job_type === 'accident_recovery'}
                    onChange={handleJobTypeChange}
                  />
                  <label htmlFor="accident_recovery">Accident Recovery</label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Images (All sides of vehicle) *</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'initial_images')}
                  style={{ display: 'none' }}
                  id="initial-images"
                />
                <label htmlFor="initial-images" style={{ cursor: 'pointer' }}>
                  <FiUpload size={24} />
                  <p>Click to upload initial images</p>
                </label>
              </div>
              {formData.initial_images.length > 0 && (
                <div className="image-preview-grid">
                  {formData.initial_images.map((file, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={URL.createObjectURL(file)} alt={`Initial ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeImage(index, 'initial_images')}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">After Service/Repair Images</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'after_images')}
                  style={{ display: 'none' }}
                  id="after-images"
                />
                <label htmlFor="after-images" style={{ cursor: 'pointer' }}>
                  <FiUpload size={24} />
                  <p>Click to upload after service images</p>
                </label>
              </div>
              {formData.after_images.length > 0 && (
                <div className="image-preview-grid">
                  {formData.after_images.map((file, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={URL.createObjectURL(file)} alt={`After ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeImage(index, 'after_images')}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Special Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Enter details about parts replaced, services done, etc."
                value={formData.special_notes}
                onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                rows="5"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : (
                <>
                  <FiSend /> Submit to Admin
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'my-jobs' && (
        <div>
          <h2 className="section-title">My Jobs</h2>
          {jobs.length === 0 ? (
            <div className="glass-card empty-state">
              <p>No jobs submitted yet</p>
            </div>
          ) : (
            <div className="cards-grid">
              {jobs.map((job) => (
                <div key={job.id} className="glass-card card-item">
                  <div className="card-title">Job #{job.job_number}</div>
                  <div className="card-subtitle">Type: {job.job_type.replace('_', ' ').toUpperCase()}</div>
                  {job.vehicle_number && (
                    <div className="card-subtitle">Vehicle: {job.vehicle_number}</div>
                  )}
                  <div className="card-subtitle">Status: {job.status.replace('_', ' ').toUpperCase()}</div>
                  <div className="card-subtitle">Date: {new Date(job.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
