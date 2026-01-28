import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEye, FiSend, FiEdit, FiSearch, FiBell, FiX, FiArrowLeft, FiDownload, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import './Dashboard.css';

import logo from '../../assets/logo.png'; // Import the logo

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingJobs, setPendingJobs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quotationData, setQuotationData] = useState({
    vehicle_number: '',
    customer_name: '',
    telephone: '',
    vehicle_type: '',
    color: '',
    jobs_done: '',
    insurance_company: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchPendingJobs();
    } else if (activeTab === 'quotations') {
      fetchQuotations();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'notifications') {
        fetchNotifications();
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchPendingJobs = async () => {
    try {
      const response = await axios.get('/jobs/pending');
      setPendingJobs(response.data.jobs);
    } catch (error) {
      toast.error('Failed to fetch pending jobs');
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await axios.get('/quotations');
      setQuotations(response.data.quotations);
    } catch (error) {
      toast.error('Failed to fetch quotations');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadNotifications(response.data.notifications.filter(n => !n.is_read).length);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    }
  };

  const handleReviewJob = async (jobId) => {
    try {
      const response = await axios.get(`/jobs/${jobId}`);
      const job = response.data.job;
      setSelectedJob(job);

      // Parse images
      if (job.initial_images) {
        try {
          job.initial_images = typeof job.initial_images === 'string' ? JSON.parse(job.initial_images) : job.initial_images;
        } catch (e) {
          job.initial_images = [];
        }
      }
      if (job.after_images) {
        try {
          job.after_images = typeof job.after_images === 'string' ? JSON.parse(job.after_images) : job.after_images;
        } catch (e) {
          job.after_images = [];
        }
      }

      setSelectedJob(job);
    } catch (error) {
      toast.error('Failed to fetch job details');
    }
  };

  const handleProceedToQuotation = () => {
    if (!selectedJob) return;

    // Pre-fill quotation data from job
    setQuotationData({
      vehicle_number: selectedJob.vehicle_number || '',
      customer_name: selectedJob.customer_name || '',
      telephone: selectedJob.telephone || '',
      vehicle_type: selectedJob.vehicle_type || '',
      color: selectedJob.color || '',
      jobs_done: '',
      insurance_company: selectedJob.insurance_company || ''
    });
    setShowQuotationForm(true);
  };

  const handleVehicleNumberChange = async (e) => {
    const vehicleNumber = e.target.value;
    setQuotationData({ ...quotationData, vehicle_number: vehicleNumber });

    if (vehicleNumber.length > 3) {
      try {
        const response = await axios.get(`/vehicles/${vehicleNumber}`);
        const vehicle = response.data.vehicle;
        setQuotationData({
          ...quotationData,
          vehicle_number: vehicle.vehicle_number,
          customer_name: vehicle.customer_name || '',
          telephone: vehicle.telephone || '',
          vehicle_type: vehicle.vehicle_type || '',
          color: vehicle.color || '',
          insurance_company: vehicle.insurance_company || ''
        });
      } catch (error) {
        // Vehicle not found, keep current data
      }
    }
  };

  const handleCreateQuotation = async () => {
    if (!quotationData.vehicle_number) {
      toast.error('Vehicle number is required');
      return;
    }

    if (!quotationData.jobs_done.trim()) {
      toast.error('Please enter jobs done');
      return;
    }

    try {
      const jobsDoneArray = quotationData.jobs_done.split('\n').filter(j => j.trim());

      await axios.post('/quotations', {
        job_id: selectedJob.id,
        vehicle_number: quotationData.vehicle_number,
        customer_name: quotationData.customer_name || null,
        telephone: quotationData.telephone || null,
        vehicle_type: quotationData.vehicle_type || null,
        color: quotationData.color || null,
        jobs_done: jobsDoneArray,
        insurance_company: quotationData.insurance_company || null
      });

      toast.success('Quotation created successfully!');
      setShowQuotationForm(false);
      setSelectedJob(null);
      fetchQuotations();
      fetchPendingJobs();
      setActiveTab('quotations');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create quotation');
    }
  };

  const handleSendToManager = async (quotationId) => {
    try {
      await axios.put(`/quotations/${quotationId}/send-to-manager`);
      toast.success('Quotation sent to manager!');
      fetchQuotations();
    } catch (error) {
      toast.error('Failed to send quotation');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      const response = await axios.get('/vehicles/search', {
        params: {
          query: searchQuery
        }
      });

      if (response.data.vehicles.length > 0) {
        const vehicle = response.data.vehicles[0];
        const historyResponse = await axios.get(`/vehicles/${vehicle.vehicle_number}/history`);
        setSearchResults(historyResponse.data);
      } else {
        toast.error('No vehicle found');
        setSearchResults(null);
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleSendToCustomer = async (notification) => {
    const defaultMessage = `Vehicle ${notification.vehicle_number} is ready for pickup.`;
    const customMessage = prompt('Enter custom message:', defaultMessage);

    if (customMessage) {
      try {
        await axios.post('/notifications/send-to-customer', {
          quotation_id: notification.quotation_id,
          message: customMessage,
          vehicle_number: notification.vehicle_number
        });
        toast.success('Message sent to customer!');
        fetchNotifications();
      } catch (error) {
        toast.error('Failed to send message');
      }
    }
  };

  const openImageModal = (imageUrl, label) => {
    setSelectedImage({ url: imageUrl, label });
    setZoomLevel(1);
    setShowImageModal(true);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleDownloadImage = async () => {
    try {
      const response = await fetch(`http://localhost:5001${selectedImage.url}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from path or use label
      const filename = selectedImage.url.split('/').pop() || 'image.jpg';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const parseImages = (images) => {
    if (!images) return [];
    try {
      return typeof images === 'string' ? JSON.parse(images) : images;
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <img src={logo} alt="Jayakody Auto Electricals Logo" className="dashboard-logo" />
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Employee Requests {pendingJobs.length > 0 && `(${pendingJobs.length})`}
        </button>
        <button
          className={`nav-tab ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          Created Quotations
        </button>
        <button
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''} ${unreadNotifications > 0 ? 'notification-badge' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <FiBell /> Notifications {unreadNotifications > 0 && `(${unreadNotifications})`}
        </button>
        <button
          className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <FiSearch /> Search Records
        </button>
      </div>

      {activeTab === 'requests' && (
        <div>
          <h2 className="section-title">Employee Requests</h2>
          {pendingJobs.length === 0 ? (
            <div className="glass-card empty-state">
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="cards-grid">
              {pendingJobs.map((job) => (
                <div key={job.id} className="glass-card card-item">
                  <div className="card-title">Job #{job.job_number}</div>
                  <div className="card-subtitle">Type: {job.job_type.replace('_', ' ').toUpperCase()}</div>
                  <div className="card-subtitle">Employee: {job.employee_name}</div>
                  {job.vehicle_number && (
                    <div className="card-subtitle">Vehicle: {job.vehicle_number}</div>
                  )}
                  <div className="card-subtitle">Date: {new Date(job.created_at).toLocaleDateString()}</div>
                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleReviewJob(job.id)}
                    >
                      <FiEye /> Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedJob && !showQuotationForm && (
            <div className="glass-card" style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Job Details</h3>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedJob(null);
                    setShowQuotationForm(false);
                  }}
                >
                  <FiX /> Close
                </button>
              </div>

              <div className="job-details-section">
                <p><strong>Job Number:</strong> {selectedJob.job_number}</p>
                <p><strong>Job Type:</strong> {selectedJob.job_type.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Employee:</strong> {selectedJob.employee_name}</p>
                {selectedJob.vehicle_number && (
                  <p><strong>Vehicle Number:</strong> {selectedJob.vehicle_number}</p>
                )}
                {selectedJob.special_notes && (
                  <p><strong>Special Notes:</strong> {selectedJob.special_notes}</p>
                )}
              </div>

              {parseImages(selectedJob.initial_images).length > 0 && (
                <div className="job-details-section">
                  <h3>Initial Images</h3>
                  <div className="image-gallery">
                    {parseImages(selectedJob.initial_images).map((img, idx) => (
                      <div
                        key={idx}
                        className="image-gallery-item"
                        onClick={() => openImageModal(img, `Initial Image ${idx + 1}`)}
                      >
                        <img src={`http://localhost:5001${img}`} alt={`Initial ${idx + 1}`} />
                        <div className="image-gallery-label">Initial {idx + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parseImages(selectedJob.after_images).length > 0 && (
                <div className="job-details-section">
                  <h3>After Service Images</h3>
                  <div className="image-gallery">
                    {parseImages(selectedJob.after_images).map((img, idx) => (
                      <div
                        key={idx}
                        className="image-gallery-item"
                        onClick={() => openImageModal(img, `After Image ${idx + 1}`)}
                      >
                        <img src={`http://localhost:5001${img}`} alt={`After ${idx + 1}`} />
                        <div className="image-gallery-label">After {idx + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-actions" style={{ marginTop: '2rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedJob(null);
                    setShowQuotationForm(false);
                  }}
                >
                  <FiArrowLeft /> Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleProceedToQuotation}
                >
                  Proceed to Quotation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showQuotationForm && selectedJob && (
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Create Quotation</h2>
          <div className="form-group">
            <label className="form-label">Vehicle Number *</label>
            <input
              type="text"
              className="form-input"
              value={quotationData.vehicle_number}
              onChange={handleVehicleNumberChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              value={quotationData.customer_name}
              onChange={(e) => setQuotationData({ ...quotationData, customer_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Telephone</label>
            <input
              type="tel"
              className="form-input"
              value={quotationData.telephone}
              onChange={(e) => setQuotationData({ ...quotationData, telephone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle Type</label>
            <input
              type="text"
              className="form-input"
              value={quotationData.vehicle_type}
              onChange={(e) => setQuotationData({ ...quotationData, vehicle_type: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input
              type="text"
              className="form-input"
              value={quotationData.color}
              onChange={(e) => setQuotationData({ ...quotationData, color: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Jobs Done * (One per line)</label>
            <textarea
              className="form-textarea"
              placeholder="Enter jobs done (one per line)"
              value={quotationData.jobs_done}
              onChange={(e) => setQuotationData({ ...quotationData, jobs_done: e.target.value })}
              rows="6"
              required
            />
          </div>
          {selectedJob.job_type === 'accident_recovery' && (
            <div className="form-group">
              <label className="form-label">Insurance Company</label>
              <input
                type="text"
                className="form-input"
                value={quotationData.insurance_company}
                onChange={(e) => setQuotationData({ ...quotationData, insurance_company: e.target.value })}
              />
            </div>
          )}
          <div className="card-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowQuotationForm(false);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateQuotation}
            >
              Add Quotation
            </button>
          </div>
        </div>
      )}

      {activeTab === 'quotations' && (
        <div>
          <h2 className="section-title">Created Quotations</h2>
          {quotations.length === 0 ? (
            <div className="glass-card empty-state">
              <p>No quotations created yet</p>
            </div>
          ) : (
            <div className="cards-grid">
              {quotations.map((quotation) => (
                <div key={quotation.id} className="glass-card card-item">
                  <div className="card-title">Quotation #{quotation.quotation_number}</div>
                  <div className="card-subtitle">Vehicle: {quotation.vehicle_number}</div>
                  <div className="card-subtitle">Status: {quotation.status.replace('_', ' ').toUpperCase()}</div>
                  <div className="card-subtitle">Date: {new Date(quotation.created_at).toLocaleDateString()}</div>
                  <div className="card-actions">
                    {quotation.status === 'draft' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSendToManager(quotation.id)}
                      >
                        <FiSend /> Send to Manager
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div>
          <h2 className="section-title">Notifications</h2>
          {notifications.length === 0 ? (
            <div className="glass-card empty-state">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="cards-grid">
              {notifications.map((notification) => (
                <div key={notification.id} className="glass-card card-item">
                  <div className="card-title">{notification.message}</div>
                  <div className="card-subtitle">Vehicle: {notification.vehicle_number}</div>
                  <div className="card-subtitle">Date: {new Date(notification.created_at).toLocaleDateString()}</div>
                  {notification.type === 'quotation_ready' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSendToCustomer(notification)}
                      style={{ marginTop: '1rem' }}
                    >
                      Send to Customer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="glass-card">
          <h2 className="section-title">Search Records</h2>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Search by vehicle number or telephone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" onClick={handleSearch} style={{ marginTop: '1rem' }}>
              <FiSearch /> Search
            </button>
          </div>
          {searchResults && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Vehicle History</h3>
              <div className="glass-card" style={{ marginBottom: '1rem' }}>
                <p><strong>Vehicle Number:</strong> {searchResults.vehicle.vehicle_number}</p>
                {searchResults.vehicle.customer_name && (
                  <p><strong>Customer:</strong> {searchResults.vehicle.customer_name}</p>
                )}
                {searchResults.vehicle.telephone && (
                  <p><strong>Telephone:</strong> {searchResults.vehicle.telephone}</p>
                )}
              </div>
              {searchResults.jobs.length === 0 ? (
                <p>No jobs found for this vehicle</p>
              ) : (
                searchResults.jobs.map((job) => (
                  <div key={job.id} className="glass-card" style={{ marginTop: '1rem' }}>
                    <p><strong>Job #{job.job_number}</strong></p>
                    <p>Type: {job.job_type.replace('_', ' ').toUpperCase()}</p>
                    {job.job_type === 'repair' && job.repair_type && (
                      <p>Category: {job.repair_type.replace('_', ' ').toUpperCase()}
                        {job.repair_subtype && ` (${job.repair_subtype.replace('_', ' ').toUpperCase()})`}
                      </p>
                    )}
                    <p>Date: {new Date(job.created_at).toLocaleDateString()}</p>
                    {job.quotation_number && (
                      <p>Quotation: {job.quotation_number} - Total: Rs. {parseFloat(job.total_amount || 0).toFixed(2)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showImageModal && selectedImage && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedImage.label}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', marginLeft: 'auto' }}>
                <button className="btn btn-secondary" onClick={handleZoomOut} title="Zoom Out">
                  <FiZoomOut />
                </button>
                <button className="btn btn-secondary" onClick={handleResetZoom} title="Reset Zoom">
                  <FiRefreshCw />
                </button>
                <button className="btn btn-secondary" onClick={handleZoomIn} title="Zoom In">
                  <FiZoomIn />
                </button>
                <button className="btn btn-primary" onClick={handleDownloadImage} title="Download">
                  <FiDownload />
                </button>
              </div>
              <button className="modal-close" onClick={() => setShowImageModal(false)}>
                <FiX />
              </button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <img
                src={`http://localhost:5001${selectedImage.url}`}
                alt={selectedImage.label}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease-in-out',
                  cursor: zoomLevel > 1 ? 'grab' : 'default'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
