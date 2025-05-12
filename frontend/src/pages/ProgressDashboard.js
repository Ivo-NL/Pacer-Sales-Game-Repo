import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tab, Tabs, Button, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

// Import components
import SkillTree from '../components/SkillTree';
import BadgesDisplay from '../components/BadgesDisplay';
import PerformanceAnalytics from '../components/PerformanceAnalytics';
import LearningPathRecommendations from '../components/LearningPathRecommendations';

const ProgressDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for each component's data
  const [detailedProgress, setDetailedProgress] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [performance, setPerformance] = useState({});
  const [recommendations, setRecommendations] = useState({});

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch real data from API
        const [progressRes, badgesRes, recommendationsRes] = await Promise.all([
          apiService.progress.getDetailedProgress(),
          apiService.progress.getUserBadges(),
          apiService.progress.getSkillRecommendations()
        ]);
        
        setDetailedProgress(progressRes.data);
        setUserBadges(badgesRes.data);
        setAllBadges(badgesRes.data);
        setPerformance(progressRes.data.performance);
        setRecommendations(recommendationsRes.data);
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError('Failed to load progress data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Your PACER Journey
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => navigate('/scenarios')}
        >
          Start New Scenario
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="progress dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Skill Tree" id="tab-0" />
            <Tab label="Performance Analytics" id="tab-1" />
            <Tab label="Badges & Achievements" id="tab-2" />
            <Tab label="Learning Path" id="tab-3" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <SkillTree 
            detailedProgress={detailedProgress}
            loading={loading}
            error={error}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <PerformanceAnalytics 
            performance={performance}
            loading={loading}
            error={error}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <BadgesDisplay 
            userBadges={userBadges}
            allBadges={allBadges}
            loading={loading}
            error={error}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <LearningPathRecommendations 
            recommendations={recommendations}
            loading={loading}
            error={error}
          />
        </TabPanel>
      </Box>
    </Container>
  );
};

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default ProgressDashboard; 