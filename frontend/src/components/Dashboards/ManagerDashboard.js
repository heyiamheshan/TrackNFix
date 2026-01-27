import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit, FiDownload, FiSend, FiSearch, FiPlus, FiX, FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import './Dashboard.css';

import logo from '../../assets/logo.png'; // Import the logo

const ManagerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('quotations');
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [prices, setPrices] = useState([]);
  const [laborCost, setLaborCost] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (activeTab === 'quotations') {
      fetchQuotations();
    }
  }, [activeTab]);

  useEffect(() => {
    // Calculate total whenever prices or labor cost changes
    const total = prices.reduce((sum, price) => sum + (parseFloat(price.amount) || 0), 0) + (parseFloat(laborCost) || 0);
    setTotalAmount(total);
  }, [prices, laborCost]);

  const fetchQuotations = async () => {
    try {
      const response = await axios.get('/quotations/pending-manager');
      setQuotations(response.data.quotations);
    } catch (error) {
      toast.error('Failed to fetch quotations');
    }
  };

  const handleEditQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    let jobsDone = [];

    try {
      jobsDone = quotation.jobs_done ? (typeof quotation.jobs_done === 'string' ? JSON.parse(quotation.jobs_done) : quotation.jobs_done) : [];
    } catch (e) {
      jobsDone = [];
    }

    let existingPrices = [];
    try {
      existingPrices = quotation.prices ? (typeof quotation.prices === 'string' ? JSON.parse(quotation.prices) : quotation.prices) : [];
    } catch (e) {
      existingPrices = [];
    }

    // Initialize prices from jobs done if no prices exist
    if (existingPrices.length === 0 && jobsDone.length > 0) {
      setPrices(jobsDone.map((job, index) => ({
        id: index,
        description: typeof job === 'string' ? job : job.description || job,
        amount: ''
      })));
    } else {
      setPrices(existingPrices.map((price, index) => ({
        id: index,
        description: price.description || '',
        amount: price.amount || ''
      })));
    }

    setLaborCost(quotation.labor_cost || 0);
  };

  const handlePriceChange = (index, field, value) => {
    const newPrices = [...prices];
    newPrices[index][field] = value;
    setPrices(newPrices);
  };

  const addPriceRow = () => {
    setPrices([...prices, { id: Date.now(), description: '', amount: '' }]);
  };

  const removePriceRow = (index) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const handleUpdateQuotation = async () => {
    try {
      const pricesToSend = prices
        .filter(p => p.description.trim() && p.amount)
        .map(p => ({
          description: p.description.trim(),
          amount: parseFloat(p.amount) || 0
        }));

      await axios.put(`/quotations/${selectedQuotation.id}`, {
        prices: pricesToSend,
        labor_cost: parseFloat(laborCost) || 0,
        customer_name: selectedQuotation.customer_name || null,
        telephone: selectedQuotation.telephone || null,
        insurance_company: selectedQuotation.insurance_company || null
      });

      toast.success('Quotation updated successfully!');
      setSelectedQuotation(null);
      fetchQuotations();
    } catch (error) {
      toast.error('Failed to update quotation');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const response = await axios.post(`/quotations/${selectedQuotation.id}/generate-pdf`, {}, {
        responseType: 'blob'
      });

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation-${selectedQuotation.quotation_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF generated and downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleApproveQuotation = async () => {
    const message = `Quotation ${selectedQuotation.quotation_number} is ready for customer pickup.`;
    try {
      await axios.post(`/quotations/${selectedQuotation.id}/approve`, { message });
      toast.success('Quotation approved and notification sent to admin!');
      setSelectedQuotation(null);
      fetchQuotations();
    } catch (error) {
      toast.error('Failed to approve quotation');
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
          vehicle_number: searchQuery,
          telephone: searchQuery
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

  const handleDownloadServiceRecord = async (vehicleNumber) => {
    try {
      const response = await axios.post(`/vehicles/${vehicleNumber}/service-record-pdf`, {}, {
        responseType: 'blob'
      });

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `service-record-${vehicleNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Service record downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download service record');
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
          <h1 className="dashboard-title">Manager Dashboard</h1>
          <p className="dashboard-subtitle">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
        >
          Request Quotations {quotations.length > 0 && `(${quotations.length})`}
        </button>
        <button
          className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <FiSearch /> Search Records
        </button>
      </div>

      {activeTab === 'quotations' && (
        <div>
          <h2 className="section-title">Request Quotations</h2>
          {quotations.length === 0 ? (
            <div className="glass-card empty-state">
              <p>No quotations pending review</p>
            </div>
          ) : (
            <div className="cards-grid">
              {quotations.map((quotation) => (
                <div key={quotation.id} className="glass-card card-item">
                  <div className="card-title">Quotation #{quotation.quotation_number}</div>
                  <div className="card-subtitle">Vehicle: {quotation.vehicle_number}</div>
                  <div className="card-subtitle">Job Type: {quotation.job_type.replace('_', ' ').toUpperCase()}</div>
                  <div className="card-subtitle">Date: {new Date(quotation.created_at).toLocaleDateString()}</div>
                  <div className="card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEditQuotation(quotation)}
                    >
                      <FiEdit /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedQuotation && (
            <div className="glass-card" style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title">Edit Quotation</h2>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedQuotation(null)}
                >
                  <FiX /> Close
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Quotation Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedQuotation.quotation_number}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedQuotation.vehicle_number}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedQuotation.customer_name || ''}
                  onChange={(e) => setSelectedQuotation({
                    ...selectedQuotation,
                    customer_name: e.target.value
                  })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telephone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={selectedQuotation.telephone || ''}
                  onChange={(e) => setSelectedQuotation({
                    ...selectedQuotation,
                    telephone: e.target.value
                  })}
                />
              </div>

              {selectedQuotation.job_type === 'accident_recovery' && (
                <div className="form-group">
                  <label className="form-label">Insurance Company</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedQuotation.insurance_company || ''}
                    onChange={(e) => setSelectedQuotation({
                      ...selectedQuotation,
                      insurance_company: e.target.value
                    })}
                  />
                </div>
              )}

              <div className="job-details-section">
                {parseImages(selectedQuotation.initial_images).length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3>Initial Images</h3>
                    <div className="image-gallery">
                      {parseImages(selectedQuotation.initial_images).map((img, idx) => (
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

                {parseImages(selectedQuotation.after_images).length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3>After Service Images</h3>
                    <div className="image-gallery">
                      {parseImages(selectedQuotation.after_images).map((img, idx) => (
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
              </div>

              <div className="job-details-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Jobs Done & Pricing</h3>
                  <button
                    className="btn btn-secondary"
                    onClick={addPriceRow}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <FiPlus /> Add Item
                  </button>
                </div>

                {prices.map((price, index) => (
                  <div key={price.id || index} className="price-input-group">
                    <input
                      type="text"
                      className="form-input"
                      value={price.description}
                      onChange={(e) => handlePriceChange(index, 'description', e.target.value)}
                      placeholder="Job description / Part name"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={price.amount}
                        onChange={(e) => handlePriceChange(index, 'amount', e.target.value)}
                        placeholder="Price (Rs.)"
                        step="0.01"
                      />
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removePriceRow(index)}
                        style={{ padding: '12px', minWidth: 'auto' }}
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}

                {prices.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                    Click "Add Item" to add pricing for jobs/parts
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Labor Cost (Rs.)</label>
                <input
                  type="number"
                  className="form-input"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="price-total">
                <span className="price-total-label">Total Amount:</span>
                <span className="price-total-amount">Rs. {totalAmount.toFixed(2)}</span>
              </div>

              <div className="card-actions" style={{ marginTop: '2rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedQuotation(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUpdateQuotation}
                >
                  Update Quotation
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleGeneratePDF}
                >
                  <FiDownload /> Generate PDF
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApproveQuotation}
                >
                  <FiSend /> Approve & Notify Admin
                </button>
              </div>
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
                <>
                  {searchResults.jobs.map((job) => (
                    <div key={job.id} className="glass-card" style={{ marginTop: '1rem' }}>
                      <p><strong>Job #{job.job_number}</strong></p>
                      <p>Type: {job.job_type.replace('_', ' ').toUpperCase()}</p>
                      <p>Date: {new Date(job.created_at).toLocaleDateString()}</p>
                      {job.quotation_number && (
                        <>
                          <p>Quotation: {job.quotation_number}</p>
                          <p>Total: Rs. {parseFloat(job.total_amount || 0).toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownloadServiceRecord(searchResults.vehicle.vehicle_number)}
                    style={{ marginTop: '1.5rem' }}
                  >
                    <FiDownload /> Download Service Record PDF
                  </button>
                </>
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

export default ManagerDashboard;
