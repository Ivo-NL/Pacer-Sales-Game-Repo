import React, { useState } from 'react';
import {
  Box, Typography, Paper, Tooltip, CircularProgress,
  Grid, Divider, Card, CardContent, IconButton, Collapse, Chip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import HandshakeIcon from '@mui/icons-material/Handshake';

const SkillTree = ({ detailedProgress, loading, error }) => {
  const [expandedStages, setExpandedStages] = useState({
    P: false,
    A: false,
    C: false,
    E: false,
    R: false
  });

  const handleExpandStage = (stage) => {
    setExpandedStages(prev => ({
      ...prev,
      [stage]: !prev[stage]
    }));
  };

  // Get skill level color (red: 1-3, amber: 4-6, green: 7-10)
  const getSkillLevelColor = (level) => {
    if (level <= 3) return '#ff5e5e';
    if (level <= 6) return '#ffaa5e';
    return '#4caf50';
  };

  // Sub-skills for each PACER stage
  const skillMapping = {
    P: {
      icon: <SearchIcon fontSize="large" />,
      title: 'Prospect',
      description: 'Identify and qualify potential customers',
      subSkills: {
        lead_qualification: 'Lead Qualification',
        market_research: 'Market Research',
        outreach_effectiveness: 'Outreach Effectiveness',
        value_proposition: 'Value Proposition'
      }
    },
    A: {
      icon: <AssessmentIcon fontSize="large" />,
      title: 'Assess',
      description: 'Understand customer needs and pain points',
      subSkills: {
        needs_analysis: 'Needs Analysis',
        stakeholder_mapping: 'Stakeholder Mapping',
        qualification_framework: 'Qualification Framework',
        pain_point_identification: 'Pain Point Identification'
      }
    },
    C: {
      icon: <EmojiObjectsIcon fontSize="large" />,
      title: 'Challenge',
      description: 'Present insights and challenge the status quo',
      subSkills: {
        solution_presentation: 'Solution Presentation',
        competitive_differentiation: 'Competitive Differentiation',
        insight_delivery: 'Insight Delivery',
        value_demonstration: 'Value Demonstration'
      }
    },
    E: {
      icon: <AssignmentIcon fontSize="large" />,
      title: 'Execute',
      description: 'Navigate complex buying processes and close deals',
      subSkills: {
        negotiation: 'Negotiation',
        objection_handling: 'Objection Handling',
        closing_techniques: 'Closing Techniques',
        deal_structuring: 'Deal Structuring'
      }
    },
    R: {
      icon: <HandshakeIcon fontSize="large" />,
      title: 'Retain',
      description: 'Maintain and grow customer relationships',
      subSkills: {
        account_management: 'Account Management',
        relationship_building: 'Relationship Building',
        upselling: 'Upselling',
        customer_success: 'Customer Success'
      }
    }
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

  if (!detailedProgress) {
    return (
      <Box sx={{ my: 2 }}>
        <Typography>
          No skill data available yet. Start playing scenarios to build your skills!
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          PACER Skill Tree
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your progress in mastering the PACER sales methodology skills.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {Object.keys(skillMapping).map((stageKey) => {
          const stage = skillMapping[stageKey];
          const isExpanded = expandedStages[stageKey];
          
          // Calculate average skill level for this stage
          const subSkillsArray = Object.keys(stage.subSkills).map(key => detailedProgress[key] || 1);
          const avgSkillLevel = subSkillsArray.reduce((a, b) => a + b, 0) / subSkillsArray.length;
          
          return (
            <Grid item xs={12} key={stageKey}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderLeft: `6px solid ${getSkillLevelColor(avgSkillLevel)}`,
                  mb: 2
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {stage.icon}
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">
                          {stage.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stage.description}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={`Level ${Math.round(avgSkillLevel)}`} 
                        size="small" 
                        sx={{ 
                          mr: 2, 
                          bgcolor: getSkillLevelColor(avgSkillLevel),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                      
                      <IconButton 
                        onClick={() => handleExpandStage(stageKey)}
                        aria-label={isExpanded ? "collapse" : "expand"}
                      >
                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      {Object.entries(stage.subSkills).map(([skillKey, skillName]) => {
                        const skillLevel = detailedProgress[skillKey] || 1;
                        
                        return (
                          <Grid item xs={12} sm={6} md={3} key={skillKey}>
                            <Tooltip 
                              title={`Level ${skillLevel}/10: ${getSkillLevelDescription(skillLevel)}`} 
                              placement="top"
                            >
                              <Box sx={{ textAlign: 'center' }}>
                                <Box 
                                  sx={{ 
                                    width: 70, 
                                    height: 70, 
                                    borderRadius: '50%', 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    mb: 1,
                                    bgcolor: getSkillLevelColor(skillLevel),
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {skillLevel}
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {skillName}
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

// Helper function to get skill level description
const getSkillLevelDescription = (level) => {
  if (level <= 2) return 'Novice - Basic understanding';
  if (level <= 4) return 'Beginner - Can apply with guidance';
  if (level <= 6) return 'Intermediate - Can apply independently';
  if (level <= 8) return 'Advanced - Can teach others';
  return 'Expert - Deep mastery and innovation';
};

export default SkillTree; 