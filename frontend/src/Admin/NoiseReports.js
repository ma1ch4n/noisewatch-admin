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
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const audioRef = useRef(new Audio());
  const videoRefs = useRef({});
  const [audioProgress, setAudioProgress] = useState({});
  const [audioDuration, setAudioDuration] = useState({});
  const [videoLoading, setVideoLoading] = useState({});
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  // API endpoint
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchReports();
    
    // Set up audio event listeners
    const audio = audioRef.current;
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    const handleTimeUpdate = () => {
      if (playingAudio) {
        setAudioProgress(prev => ({
          ...prev,
          [playingAudio]: audio.currentTime
        }));
      }
    };

    const handleLoadedMetadata = () => {
      if (playingAudio) {
        setAudioDuration(prev => ({
          ...prev,
          [playingAudio]: audio.duration
        }));
      }
    };

    const handleEnded = () => {
      setPlayingAudio(null);
      if (playingAudio) {
        setAudioProgress(prev => ({
          ...prev,
          [playingAudio]: 0
        }));
      }
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      console.error('Audio error details:', audio.error);
      setPlayingAudio(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      // Clean up all video elements
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          video.pause();
          video.src = '';
        }
      });
    };
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenVideo(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching reports from API...');
      const response = await fetch(`${API_BASE_URL}/reports/get-report`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.length} reports`);
      
      if (response.ok) {
        const transformed = data.map(r => ({
          ...r,
          // Cloudinary URLs are already in mediaUrl field
          audioUri: r.mediaType === 'audio' ? r.mediaUrl : null,
          videoUri: r.mediaType === 'video' ? r.mediaUrl : null,
          noiseLevel: r.noiseLevel || 'green',
          consecutiveDays: r.consecutiveDays || 1,
          status: r.status || 'pending',
        }));
        
        setReports(transformed);
        
        // Log media information for debugging
        const audioReports = transformed.filter(r => r.mediaType === 'audio');
        const videoReports = transformed.filter(r => r.mediaType === 'video');
        console.log(`🎵 Audio reports: ${audioReports.length}`);
        console.log(`🎬 Video reports: ${videoReports.length}`);
        
      } else {
        alert('Error: Failed to fetch reports');
      }
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

  const updateReportStatus = async () => {
    if (!selectedReport || !selectedStatus) {
      alert('Please select a response');
      return;
    }
    try {
      setUpdatingStatus(true);
      const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (response.ok) {
        alert('Report status updated successfully');
        setStatusModalVisible(false);
        setSelectedReport(null);
        setSelectedStatus(null);
        await fetchReports();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getAvailableResponses = (report) => {
    const { noiseLevel, consecutiveDays } = report;
    const responses = [];

    if (noiseLevel === "red") {
      responses.push({
        status: 'monitoring',
        text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for RED noise.`,
        label: 'Monitoring',
        icon: 'visibility'
      });
      if (consecutiveDays >= 3) {
        responses.push({
          status: 'action_required',
          text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.",
          label: 'Action Required',
          icon: 'warning'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
        label: 'Resolved',
        icon: 'check_circle'
      });
    } else if (noiseLevel === "yellow") {
      responses.push({
        status: 'monitoring',
        text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for YELLOW noise.`,
        label: 'Monitoring',
        icon: 'visibility'
      });
      if (consecutiveDays >= 5) {
        responses.push({
          status: 'action_required',
          text: "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.",
          label: 'Action Required',
          icon: 'warning'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
        label: 'Resolved',
        icon: 'check_circle'
      });
    } else if (noiseLevel === "green") {
      responses.push({
        status: 'monitoring',
        text: "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.",
        label: 'Monitoring',
        icon: 'visibility'
      });
      responses.push({
        status: 'resolved',
        text: "Advice has been provided regarding your noise report. The matter is now closed.",
        label: 'Resolved',
        icon: 'check_circle'
      });
    }

    return responses;
  };

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setSelectedStatus(report.status || null);
    setStatusModalVisible(true);
  };

  const getCurrentResponse = (report) => {
    if (!report.status || report.status === 'pending') {
      return "No response sent yet. Click to select a response.";
    }
    const responses = getAvailableResponses(report);
    const current = responses.find(r => r.status === report.status);
    return current ? current.text : "Response sent.";
  };

  const playAudio = async (audioUri, reportId) => {
  try {
    console.log('🎵 Attempting to play audio for report:', reportId);
    console.log('🔗 Original Cloudinary URL:', audioUri);
    
    // If clicking the same audio that's playing, pause it
    if (playingAudio === reportId && audioRef.current) {
      console.log('⏸️ Pausing current audio');
      audioRef.current.pause();
      setPlayingAudio(null);
      return;
    }
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // ✅ FIX: Ensure Cloudinary URL has .mp3 extension
    let processedUrl = audioUri;
    
    // If URL doesn't end with .mp3, add it
    if (!processedUrl.match(/\.(mp3|wav|ogg)$/i)) {
      // For Cloudinary URLs, ensure .mp3 extension
      processedUrl = processedUrl.replace(/(\.[^.]+)?$/, '.mp3');
    }
    
    // If Cloudinary URL doesn't have /video/upload/, replace with it
    if (processedUrl.includes('cloudinary.com') && !processedUrl.includes('/video/upload/')) {
      processedUrl = processedUrl.replace(/\/(image|raw)\/upload\//, '/video/upload/');
    }
    
    console.log('🔗 Processed URL:', processedUrl);

    // Create new audio element
    const newAudio = new Audio();
    audioRef.current = newAudio;
    
    // Set up event listeners BEFORE setting src
    newAudio.addEventListener('error', (e) => {
      console.error('❌ Audio error event:', e);
      console.error('Audio error code:', newAudio.error?.code);
      console.error('Audio error message:', newAudio.error?.message);
      console.error('Failed URL:', processedUrl);
      
      // Show specific error messages
      let errorMsg = 'Could not play audio. ';
      switch(newAudio.error?.code) {
        case 1: errorMsg += 'Loading was aborted.'; break;
        case 2: errorMsg += 'Network error.'; break;
        case 3: errorMsg += 'Decoding failed.'; break;
        case 4: errorMsg += 'Format not supported.'; break;
        default: errorMsg += 'Unknown error.';
      }
      
      alert(errorMsg + '\n\nTrying alternative format...');
      
      // Try alternative format
      const altUrl = processedUrl.replace('.mp3', '.wav');
      console.log('🔄 Trying alternative URL:', altUrl);
      newAudio.src = altUrl;
      
      setPlayingAudio(null);
    });

    newAudio.addEventListener('loadedmetadata', () => {
      console.log('✅ Audio metadata loaded, duration:', newAudio.duration);
      setAudioDuration(prev => ({
        ...prev,
        [reportId]: newAudio.duration
      }));
    });

    newAudio.addEventListener('timeupdate', () => {
      setAudioProgress(prev => ({
        ...prev,
        [reportId]: newAudio.currentTime
      }));
    });

    newAudio.addEventListener('ended', () => {
      console.log('⏹️ Audio ended');
      setPlayingAudio(null);
      setAudioProgress(prev => ({
        ...prev,
        [reportId]: 0
      }));
    });

    // Set audio properties
    newAudio.crossOrigin = 'anonymous';
    newAudio.preload = 'metadata';
    
    // Set the source
    newAudio.src = processedUrl;
    
    console.log('🔧 Audio element setup complete, attempting to load...');
    
    // Load and play
    try {
      await newAudio.load();
      console.log('✅ Audio loaded successfully');
      
      await newAudio.play();
      console.log('✅ Audio playing successfully');
      setPlayingAudio(reportId);
      
    } catch (playError) {
      console.error('❌ Play error:', playError);
      
      if (playError.name === 'NotSupportedError') {
        alert('Audio format not supported by your browser. The file may need to be re-encoded.\n\nURL: ' + processedUrl);
      } else if (playError.name === 'NotAllowedError') {
        alert('Autoplay was blocked. Please click play again.');
      } else {
        alert('Could not play audio: ' + playError.message);
      }
      setPlayingAudio(null);
    }
  } catch (error) {
    console.error('❌ Error in playAudio function:', error);
    alert('Could not play audio. Please check console for details.');
    setPlayingAudio(null);
  }
};

  const handleAudioProgress = (reportId, value) => {
    const audio = audioRef.current;
    const duration = audioDuration[reportId] || 0;
    
    if (duration > 0 && audio) {
      const newTime = (value / 100) * duration;
      audio.currentTime = newTime;
      setAudioProgress(prev => ({
        ...prev,
        [reportId]: newTime
      }));
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoLoad = (reportId) => {
    setVideoLoading(prev => ({
      ...prev,
      [reportId]: true
    }));
  };

  const handleVideoLoaded = (reportId) => {
    setVideoLoading(prev => ({
      ...prev,
      [reportId]: false
    }));
  };

  const handleVideoError = (reportId) => {
    setVideoLoading(prev => ({
      ...prev,
      [reportId]: false
    }));
    alert('Could not load video. Please check the video URL.');
  };

  const toggleFullscreen = async (reportId) => {
    const videoElement = videoRefs.current[reportId];
    if (!videoElement) return;

    try {
      if (!document.fullscreenElement) {
        await videoElement.requestFullscreen();
        setFullscreenVideo(reportId);
      } else {
        await document.exitFullscreen();
        setFullscreenVideo(null);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      // Fallback for browsers that don't support fullscreen API
      if (!document.fullscreenElement) {
        videoElement.classList.add('fullscreen');
        setFullscreenVideo(reportId);
      } else {
        videoElement.classList.remove('fullscreen');
        setFullscreenVideo(null);
      }
    }
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'All') return reports;
    return reports.filter(r => r.reason?.includes(selectedFilter) || r.reason === selectedFilter);
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

  const getNoiseLevelColor = (level) => ({ red: '#F44336', yellow: '#FFC107', green: '#4CAF50' }[level] || '#999');
  const getNoiseLevelBg = (level) => ({ red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[level] || '#F5F5F5');
  const getNoiseLevelLabel = (level) => ({ red: 'High', yellow: 'Medium', green: 'Low' }[level] || 'Unknown');
  const getStatusColor = (status) => ({ 
    pending: '#999', 
    action_required: '#F44336', 
    monitoring: '#FFC107', 
    resolved: '#4CAF50' 
  }[status] || '#999');
  
  const getStatusLabel = (status) => ({ 
    pending: 'Pending Review', 
    action_required: 'Action Required', 
    monitoring: 'Monitoring', 
    resolved: 'Resolved' 
  }[status] || 'Pending');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Test audio with known working URL
  const testAudio = () => {
    const testUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    playAudio(testUrl, 'test');
  };

  // Debug function to check Cloudinary URL
  const debugMediaUrl = (url) => {
    console.log('🔍 Debugging URL:', url);
    console.log('URL Type:', typeof url);
    console.log('URL Length:', url?.length);
    if (url?.includes('cloudinary.com')) {
      console.log('☁️ Cloudinary URL detected');
      const parts = url.split('/');
      console.log('Domain:', parts[2]);
      console.log('Resource type:', parts[5]);
      console.log('File path:', parts.slice(6).join('/'));
    }
  };

  // Add this function to transform Cloudinary URLs for audio
  const transformAudioUrl = (url) => {
    if (!url) return url;
    
    // If it's a Cloudinary URL, make sure it's using HTTPS
    if (url.includes('cloudinary.com')) {
      const urlObj = new URL(url);
      urlObj.protocol = 'https:';
      return urlObj.toString();
    }
    
    return url;
  };

  // Render media based on mediaType
  const renderMediaSection = (report) => {
    if (!report.mediaUrl || !report.mediaType) {
      return null;
    }

    if (report.mediaType === 'audio') {
      const currentTime = audioProgress[report._id] || 0;
      const duration = audioDuration[report._id] || 0;
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      const audioUrl = transformAudioUrl(report.mediaUrl);

      return (
        <div className="detail-section">
          <div className="detail-header">
            <span className="material-icons">audiotrack</span>
            <div className="detail-label">Audio Recording</div>
            <span className="cloudinary-indicator">Cloudinary</span>
          </div>
          
          <div className="media-player-container">
            <div className="media-player-header">
              <div className="media-type-badge">
                <span className="material-icons">audiotrack</span>
                <span>AUDIO</span>
              </div>
              <div className="cloudinary-badge">Cloudinary</div>
            </div>

            <div className="audio-player">
              <div className="audio-controls">
                <button 
                  className="play-pause-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(audioUrl, report._id);
                  }}
                  disabled={!audioUrl}
                >
                  <span className="material-icons">
                    {playingAudio === report._id ? "pause" : "play_arrow"}
                  </span>
                </button>

                <div className="progress-container">
                  <div className="time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => handleAudioProgress(report._id, parseFloat(e.target.value))}
                    className="progress-bar"
                    disabled={!audioUrl || playingAudio !== report._id}
                  />
                </div>
              </div>
            </div>

            <div className="media-info">
              <div className="media-details">
                <small>Type: {report.mediaType}</small>
                <small>Status: {report.status || 'pending'}</small>
                <small>Format: Cloudinary</small>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-info">
                  <small>URL: {audioUrl?.substring(0, 50)}...</small>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      debugMediaUrl(audioUrl);
                    }}
                    className="debug-button-small"
                  >
                    Debug
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Audio state:', {
                        playing: playingAudio === report._id,
                        duration: audioDuration[report._id],
                        progress: audioProgress[report._id],
                        audioRef: audioRef.current
                      });
                    }}
                    className="debug-button-small"
                  >
                    State
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (report.mediaType === 'video') {
      const isFullscreen = fullscreenVideo === report._id;

      return (
        <div className="detail-section">
          <div className="detail-header">
            <span className="material-icons">videocam</span>
            <div className="detail-label">Video Recording</div>
            <span className="cloudinary-indicator">Cloudinary</span>
          </div>
          
          <div className="media-player-container">
            <div className="media-player-header">
              <div className="media-type-badge">
                <span className="material-icons">videocam</span>
                <span>VIDEO</span>
              </div>
              <div className="cloudinary-badge">Cloudinary</div>
              <button 
                className="fullscreen-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen(report._id);
                }}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                <span className="material-icons">
                  {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                </span>
              </button>
            </div>

            <div className={`video-player ${isFullscreen ? 'video-fullscreen' : ''}`}>
              {videoLoading[report._id] && (
                <div className="media-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading video...</span>
                </div>
              )}
              <video
                ref={el => videoRefs.current[report._id] = el}
                src={report.mediaUrl}
                className={`video-element ${isFullscreen ? 'video-element-fullscreen' : ''}`}
                controls
                preload="metadata"
                crossOrigin="anonymous"
                onLoadStart={() => handleVideoLoad(report._id)}
                onLoadedData={() => handleVideoLoaded(report._id)}
                onCanPlay={() => handleVideoLoaded(report._id)}
                onError={() => handleVideoError(report._id)}
              />
            </div>

            <div className="media-info">
              <div className="media-details">
                <small>Type: {report.mediaType}</small>
                <small>Status: {report.status || 'pending'}</small>
                <small>Format: Cloudinary</small>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-info">
                  <small>URL: {report.mediaUrl?.substring(0, 50)}...</small>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      debugMediaUrl(report.mediaUrl);
                    }}
                    className="debug-button-small"
                  >
                    Debug
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const filters = ['All', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal'];
  const filteredReports = getFilteredReports();

  return (
    <div className="admin-reports-container">
      {/* Debug button for testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-buttons">
          <button 
            onClick={testAudio}
            className="test-audio-button"
            title="Test Audio Playback"
          >
            🎵 Test Audio
          </button>
          <button 
            onClick={() => {
              // Debug first audio report
              const audioReport = reports.find(r => r.mediaType === 'audio');
              if (audioReport) {
                debugMediaUrl(audioReport.mediaUrl);
              } else {
                console.log('No audio reports found');
              }
            }}
            className="debug-button"
            title="Debug Media URLs"
          >
            🔍 Debug
          </button>
        </div>
      )}

      {/* Header */}
      <div className="admin-reports-header">
        <div className="header-gradient">
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

      {/* Main Content */}
      <div className="admin-reports-content">
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
          <div className="reports-list-container">
            {filteredReports.map((report) => (
              <div
                key={report._id}
                className={`report-card ${expandedReport === report._id ? 'report-card-expanded' : ''}`}
                onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
              >
                <div className="report-header">
                  <div className="report-header-left">
                    <div className="report-icon">
                      {getReasonIcon(report.reason)}
                      {report.mediaType === 'audio' && ' 🔊'}
                      {report.mediaType === 'video' && ' 🎬'}
                    </div>
                    <div className="report-header-text">
                      <div className="report-reason">{report.reason || 'Noise Report'}</div>
                      <div className="report-date">{formatDate(report.createdAt)}</div>
                    </div>
                  </div>
                  <div className="report-header-right">
                    {report.noiseLevel && (
                      <div className="noise-level-badge" style={{ backgroundColor: getNoiseLevelBg(report.noiseLevel) }}>
                        <div className="noise-level-dot" style={{ backgroundColor: getNoiseLevelColor(report.noiseLevel) }}></div>
                        <span className="noise-level-text" style={{ color: getNoiseLevelColor(report.noiseLevel) }}>
                          {getNoiseLevelLabel(report.noiseLevel)}
                        </span>
                      </div>
                    )}
                    <span className="material-icons expand-icon">
                      {expandedReport === report._id ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </div>

                {expandedReport === report._id && (
                  <div className="report-details">
                    <div className="status-section">
                      <div className="status-badge" style={{ backgroundColor: getStatusColor(report.status || 'pending') }}>
                        <span className="material-icons">flag</span>
                        <span className="status-text">{getStatusLabel(report.status || 'pending')}</span>
                      </div>
                      {report.consecutiveDays > 1 && (
                        <div className="consecutive-days-badge">
                          <span className="material-icons">calendar_today</span>
                          <span className="consecutive-days-text">{report.consecutiveDays} consecutive days</span>
                        </div>
                      )}
                    </div>

                    <div 
                      className={`auto-response-section ${(!report.status || report.status === 'pending') ? 'auto-response-pending' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openStatusModal(report);
                      }}
                    >
                      <div className="auto-response-header">
                        <span className="material-icons">
                          {(!report.status || report.status === 'pending') ? "error" : "info"}
                        </span>
                        <span className={`auto-response-title ${(!report.status || report.status === 'pending') ? 'auto-response-title-pending' : ''}`}>
                          {(!report.status || report.status === 'pending') ? 'Pending Review' : 'System Response'}
                        </span>
                        <span className="material-icons edit-icon">edit</span>
                      </div>
                      <div className="auto-response-content">
                        <div className={`auto-response-text ${(!report.status || report.status === 'pending') ? 'auto-response-text-pending' : ''}`}>
                          {getCurrentResponse(report)}
                        </div>
                      </div>
                      <div className="tap-hint">
                        <span className={`tap-hint-text ${(!report.status || report.status === 'pending') ? 'tap-hint-text-pending' : ''}`}>
                          {(!report.status || report.status === 'pending') ? 'Click to send response' : 'Click to change response'}
                        </span>
                      </div>
                    </div>

                    {report.comment && (
                      <div className="detail-section">
                        <div className="detail-header">
                          <span className="material-icons">chat</span>
                          <div className="detail-label">Details</div>
                        </div>
                        <div className="detail-text">{report.comment}</div>
                      </div>
                    )}

                    {report.location && (
                      <div className="detail-section">
                        <div className="detail-header">
                          <span className="material-icons">location_on</span>
                          <div className="detail-label">Location</div>
                        </div>
                        <div className="detail-text">
                          Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
                        </div>
                        <button 
                          className="map-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMap(report.location.latitude, report.location.longitude);
                          }}
                        >
                          <span className="material-icons">map</span>
                          <span>View on Map</span>
                        </button>
                      </div>
                    )}

                    {/* Render media based on mediaType */}
                    {renderMediaSection(report)}

                    <div className="detail-section">
                      <div className="timestamp-text">
                        {new Date(report.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModalVisible && (
        <div className="modal-overlay status-modal-overlay" onClick={() => setStatusModalVisible(false)}>
          <div className="status-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="status-modal-header">
              <div className="status-modal-title">Update Report Status</div>
              <button onClick={() => setStatusModalVisible(false)} className="status-modal-close">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="status-modal-content">
              {selectedReport && getAvailableResponses(selectedReport).map((response) => (
                <div
                  key={response.status}
                  className={`status-option ${selectedStatus === response.status ? 'status-option-selected' : ''}`}
                  onClick={() => setSelectedStatus(response.status)}
                >
                  <div className="status-option-header">
                    <div className="status-option-left">
                      <div className={`status-option-radio ${selectedStatus === response.status ? 'status-option-radio-selected' : ''}`}>
                        {selectedStatus === response.status && <div className="status-option-radio-inner"></div>}
                      </div>
                      <span className="material-icons status-option-icon">{response.icon}</span>
                      <span className="status-option-label" style={{ color: getStatusColor(response.status) }}>
                        {response.label}
                      </span>
                    </div>
                  </div>
                  <div className="status-option-text-container">
                    <div className="status-option-text">{response.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="status-modal-footer">
              <button className="cancel-button" onClick={() => setStatusModalVisible(false)}>
                Cancel
              </button>
              <button
                className={`save-button ${updatingStatus ? 'save-button-disabled' : ''}`}
                onClick={updateReportStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <div className="loading-spinner small"></div>
                ) : (
                  <>
                    <span className="material-icons">check</span>
                    Save Status
                  </>
                )}
              </button>
            </div>
          </div>
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