import React, { useState, useEffect, useRef } from 'react';
import './NoiseReports.css';
import CustomDrawer from './CustomDrawer';

const NoiseReports = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  useEffect(() => {
    fetchReports();
    
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockReports = [
        {
          _id: '1',
          reason: 'Loud Music',
          comment: 'Neighbors playing loud music late at night',
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 15
          },
          audioUri: 'https://example.com/audio1.mp3',
          videoUri: 'https://example.com/video1.mp4',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          reason: 'Construction Noise',
          comment: 'Construction work starting too early in the morning',
          location: {
            latitude: 40.7589,
            longitude: -73.9851,
            accuracy: 25
          },
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          reason: 'Vehicle Noise',
          comment: 'Loud vehicle exhaust and honking',
          location: {
            latitude: 40.7505,
            longitude: -73.9934,
            accuracy: 10
          },
          audioUri: 'https://example.com/audio2.mp3',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const playAudio = async (audioUri, reportId) => {
    try {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        if (playingAudio === reportId) {
          setPlayingAudio(null);
          return;
        }
      }

      const newAudio = new Audio(audioUri);
      setAudioElement(newAudio);
      setPlayingAudio(reportId);

      newAudio.addEventListener('ended', () => {
        setPlayingAudio(null);
      });

      newAudio.addEventListener('error', () => {
        setPlayingAudio(null);
        alert('Could not play audio');
      });

      await newAudio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Could not play audio');
    }
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'All') return reports;
    return reports.filter(report => 
      report.reason?.includes(selectedFilter) || 
      report.reason === selectedFilter
    );
  };

  const getReasonIcon = (reason) => {
    if (!reason) return '📢';
    if (reason.includes('Music')) return '🔊';
    if (reason.includes('Vehicle')) return '🚗';
    if (reason.includes('Construction')) return '🔨';
    if (reason.includes('Party')) return '🎉';
    if (reason.includes('Animal')) return '🐕';
    if (reason.includes('Industrial')) return '🏭';
    if (reason.includes('Shouting')) return '🗣️';
    return '📢';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const openMap = (latitude, longitude) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    if (window.confirm('Would you like to view this location in Google Maps?')) {
      window.open(url, '_blank');
    }
  };

  const handleResolveReport = (reportId) => {
    if (window.confirm('Mark this report as resolved?')) {
      // Implement resolve functionality
      console.log('Resolving report:', reportId);
      alert('Report marked as resolved');
    }
  };

  const handleDeleteReport = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      // Implement delete functionality
      setReports(reports.filter(report => report._id !== reportId));
      alert('Report deleted successfully');
    }
  };

  const filters = ['All', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal'];
  const filteredReports = getFilteredReports();

  return (
    <div className="admin-reports-container">
      {/* Header */}
      <div className="admin-reports-header">
        <div className="header-content">
          <div className="header-top">
            <button onClick={openDrawer} className="header-button">
              <span className="material-icons">menu</span>
            </button>
            <button onClick={onRefresh} className="header-button" disabled={refreshing}>
              <span className="material-icons">refresh</span>
            </button>
          </div>
          <div className="header-title">📊 Noise Reports</div>
          <div className="header-subtitle">
            {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="filter-container">
        <div className="filter-content">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`filter-pill ${selectedFilter === filter ? 'filter-pill-active' : ''}`}
              onClick={() => setSelectedFilter(filter)}
            >
              <span className={`filter-pill-text ${selectedFilter === filter ? 'filter-pill-text-active' : ''}`}>
                {filter}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading reports...</div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-container">
          <span className="material-icons empty-icon">description</span>
          <div className="empty-text">No reports found</div>
          <div className="empty-subtext">
            {selectedFilter !== 'All' 
              ? `No ${selectedFilter} reports available` 
              : 'Reports will appear here when submitted'}
          </div>
        </div>
      ) : (
        <div className="reports-list">
          {filteredReports.map((report) => (
            <div
              key={report._id}
              className="report-card"
              onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
            >
              <div className="report-header">
                <div className="report-header-left">
                  <div className="report-icon">{getReasonIcon(report.reason)}</div>
                  <div className="report-header-text">
                    <div className="report-reason">{report.reason || 'Noise Report'}</div>
                    <div className="report-date">{formatDate(report.createdAt)}</div>
                  </div>
                </div>
                <span className="material-icons expand-icon">
                  {expandedReport === report._id ? "expand_less" : "expand_more"}
                </span>
              </div>

              {expandedReport === report._id && (
                <div className="report-details">
                  {/* Comment */}
                  {report.comment && (
                    <div className="detail-section">
                      <div className="detail-header">
                        <span className="material-icons">chat</span>
                        <div className="detail-label">Details</div>
                      </div>
                      <div className="detail-text">{report.comment}</div>
                    </div>
                  )}

                  {/* Location */}
                  {report.location && (
                    <div className="detail-section">
                      <div className="detail-header">
                        <span className="material-icons">location_on</span>
                        <div className="detail-label">Location</div>
                      </div>
                      <div className="detail-text">
                        Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
                      </div>
                      {report.location.accuracy && (
                        <div className="accuracy-text">
                          Accuracy: ±{Math.round(report.location.accuracy)}m
                        </div>
                      )}
                      <button 
                        className="map-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMap(report.location.latitude, report.location.longitude);
                        }}
                      >
                        <span className="material-icons">map</span>
                        <span className="map-button-text">View on Map</span>
                      </button>
                    </div>
                  )}

                  {/* Audio Recording */}
                  {report.audioUri && (
                    <div className="detail-section">
                      <div className="detail-header">
                        <span className="material-icons">audiotrack</span>
                        <div className="detail-label">Audio Recording</div>
                      </div>
                      <button 
                        className="audio-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(report.audioUri, report._id);
                        }}
                      >
                        <span className="material-icons audio-icon">
                          {playingAudio === report._id ? "pause_circle" : "play_circle"}
                        </span>
                        <span className="audio-button-text">
                          {playingAudio === report._id ? 'Pause Audio' : 'Play Audio'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Video */}
                  {report.videoUri && (
                    <div className="detail-section">
                      <div className="detail-header">
                        <span className="material-icons">videocam</span>
                        <div className="detail-label">Video Recording</div>
                      </div>
                      <div className="video-container">
                        <video
                          src={report.videoUri}
                          className="video-player"
                          controls
                        />
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="detail-section">
                    <div className="detail-header">
                      <span className="material-icons">schedule</span>
                      <div className="detail-label">Submitted</div>
                    </div>
                    <div className="detail-text">
                      {new Date(report.createdAt).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <button 
                      className="action-button action-button-resolve"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolveReport(report._id);
                      }}
                    >
                      <span className="material-icons">check_circle</span>
                      <span className="action-button-text">Resolve</span>
                    </button>
                    <button 
                      className="action-button action-button-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report._id);
                      }}
                    >
                      <span className="material-icons">delete</span>
                      <span className="action-button-text">Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drawer Modal */}
      {drawerVisible && (
        <div className="modal-container">
          <div className="overlay" onClick={closeDrawer}></div>
          <div className="drawer-container">
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NoiseReports;