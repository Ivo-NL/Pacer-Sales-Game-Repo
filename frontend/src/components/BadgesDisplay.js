import React, { useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid,
  Card, CardContent, CardMedia, CardActionArea, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, Chip,
  Tabs, Tab
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';

// Default badge image if none is provided
const DEFAULT_BADGE_IMAGE = '/badges/default-badge.png';

const BadgesDisplay = ({ userBadges, allBadges, loading, error }) => {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Helper function to check if user has earned a badge
  const hasEarnedBadge = (badgeId) => {
    return userBadges && userBadges.some(b => b.badge_id === badgeId);
  };

  // Group badges by category
  const groupBadgesByCategory = (badges) => {
    const grouped = {};
    
    if (!badges) return grouped;
    
    badges.forEach(badge => {
      if (!grouped[badge.category]) {
        grouped[badge.category] = [];
      }
      grouped[badge.category].push(badge);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ my: 2 }}>
        <Typography color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const earnedBadges = userBadges || [];
  const allBadgesGrouped = groupBadgesByCategory(allBadges);
  const categories = Object.keys(allBadgesGrouped);

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <EmojiEventsIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5">
          Badges & Achievements
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Collect badges by demonstrating expertise in different PACER methodology skills and completing challenges.
      </Typography>
      
      {earnedBadges.length > 0 ? (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Your Earned Badges ({earnedBadges.length})
          </Typography>
          <Grid container spacing={2}>
            {earnedBadges.map((userBadge) => {
              const badge = userBadge.badge;
              return (
                <Grid item xs={6} sm={4} md={3} lg={2} key={userBadge.id}>
                  <Card 
                    sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <CardActionArea 
                      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
                      onClick={() => handleBadgeClick({...badge, earned_at: userBadge.earned_at})}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={badge.image_url || DEFAULT_BADGE_IMAGE}
                        alt={badge.name}
                        sx={{ objectFit: 'contain', pt: 2 }}
                      />
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                        <Typography variant="subtitle2" noWrap>
                          {badge.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ mb: 4, textAlign: 'center', py: 2 }}>
          <Typography variant="body1" color="text.secondary">
            You haven't earned any badges yet. Complete scenarios to earn badges!
          </Typography>
        </Box>
      )}
      
      {/* All available badges by category */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {categories.map((category, index) => (
              <Tab key={category} label={category} id={`badge-tab-${index}`} />
            ))}
          </Tabs>
        </Box>
        
        {categories.map((category, index) => (
          <TabPanel value={tabValue} index={index} key={category}>
            <Grid container spacing={2}>
              {allBadgesGrouped[category].map((badge) => {
                const isEarned = hasEarnedBadge(badge.id);
                
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={badge.id}>
                    <Card 
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        boxShadow: isEarned ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                        opacity: isEarned ? 1 : 0.7,
                        position: 'relative'
                      }}
                    >
                      <CardActionArea 
                        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
                        onClick={() => handleBadgeClick(badge)}
                        disabled={!isEarned}
                      >
                        <CardMedia
                          component="img"
                          height="140"
                          image={badge.image_url || DEFAULT_BADGE_IMAGE}
                          alt={badge.name}
                          sx={{ 
                            objectFit: 'contain',
                            pt: 2,
                            filter: isEarned ? 'none' : 'grayscale(100%)'
                          }}
                        />
                        <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                          <Typography variant="subtitle2" noWrap>
                            {badge.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {isEarned ? 'Earned' : 'Locked'}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                      
                      {!isEarned && (
                        <Box 
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'grey.500',
                            backgroundColor: 'rgba(255,255,255,0.7)',
                            borderRadius: '50%',
                            p: 1
                          }}
                        >
                          <LockIcon fontSize="large" />
                        </Box>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </TabPanel>
        ))}
      </Box>
      
      {/* Badge detail dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        {selectedBadge && (
          <>
            <DialogTitle>
              {selectedBadge.name}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
                <Box sx={{ 
                  width: { xs: '100%', sm: '40%' }, 
                  display: 'flex', 
                  justifyContent: 'center',
                  mb: { xs: 2, sm: 0 }
                }}>
                  <img 
                    src={selectedBadge.image_url || DEFAULT_BADGE_IMAGE} 
                    alt={selectedBadge.name}
                    style={{ width: 150, height: 150, objectFit: 'contain' }}
                  />
                </Box>
                <Box sx={{ width: { xs: '100%', sm: '60%' } }}>
                  <Typography variant="body1" paragraph>
                    {selectedBadge.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Category
                  </Typography>
                  <Chip 
                    label={selectedBadge.category} 
                    size="small" 
                    color="primary"
                    sx={{ mb: 2 }}
                  />
                  
                  {hasEarnedBadge(selectedBadge.id) && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Earned on
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedBadge.earned_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  
                  {!hasEarnedBadge(selectedBadge.id) && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Requirements to earn
                      </Typography>
                      <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                        {selectedBadge.criteria && Object.entries(selectedBadge.criteria).map(([key, value]) => (
                          <li key={key}>
                            <Typography variant="body2">
                              {formatCriterion(key, value)}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`badge-tabpanel-${index}`}
      aria-labelledby={`badge-tab-${index}`}
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

// Format criterion for display
const formatCriterion = (key, value) => {
  switch (key) {
    case 'region':
      return `Complete scenarios in the ${value} region`;
    case 'completed_scenarios':
      return `Complete ${value} scenarios`;
    case 'min_score':
      return `Achieve a minimum score of ${value}`;
    case 'pacer_stage':
      return `Master the ${value} stage`;
    case 'scenario_type':
      return `Complete ${value} type scenarios`;
    default:
      return `${key}: ${value}`;
  }
};

export default BadgesDisplay; 