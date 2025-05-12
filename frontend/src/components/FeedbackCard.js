import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Grid,
  Paper
} from '@mui/material';

/**
 * FeedbackCard component displays performance evaluation scores and feedback
 * 
 * @param {Object} props
 * @param {Object} props.evaluation - The evaluation data containing scores and feedback text
 */
const FeedbackCard = ({ evaluation }) => {
  // Return empty component if no evaluation data
  if (!evaluation) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary">
          No feedback available yet
        </Typography>
      </Paper>
    );
  }

  // Generate improvement tips based on evaluation scores
  const generateImprovementTips = () => {
    const tips = [];
    const scores = {
      methodology: evaluation.methodology_score || 0,
      rapport: evaluation.rapport_score || 0,
      progress: evaluation.progress_score || 0,
      outcome: evaluation.outcome_score || 0
    };
    
    // Find the areas that need the most improvement
    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2); // Get the two lowest scores
    
    // Add tips based on lowest scores
    sortedScores.forEach(([area, score]) => {
      if (area === 'methodology' && score < 80) {
        tips.push('Apply PACER methodology more consistently in your approach');
        tips.push('Structure your questions to better align with the current sales stage');
      }
      
      if (area === 'rapport' && score < 80) {
        tips.push('Show more active listening and empathy in your responses');
        tips.push('Reference specific client concerns to build stronger connection');
      }
      
      if (area === 'progress' && score < 80) {
        tips.push('Move the conversation forward more deliberately toward the next stage');
        tips.push('Clarify next steps and set clear expectations');
      }
      
      if (area === 'outcome' && score < 80) {
        tips.push('Focus more on business value and ROI in your messaging');
        tips.push('Align your solution more directly with the client\'s strategic goals');
      }
    });
    
    // Add a general tip for higher scores
    if (tips.length === 0 || Math.min(...Object.values(scores)) > 80) {
      tips.push('Continue to refine your questioning techniques');
      tips.push('Consider introducing more industry-specific insights');
    }
    
    return tips;
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Methodology Application:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={evaluation.methodology_score} 
                color="primary"
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {evaluation.methodology_score}%
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Client Rapport:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={evaluation.rapport_score} 
                color="secondary"
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {evaluation.rapport_score}%
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Deal Progression:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={evaluation.progress_score} 
                color="success"
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {evaluation.progress_score}%
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Business Outcome:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={evaluation.outcome_score} 
                color="info"
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {evaluation.outcome_score}%
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
        Feedback
      </Typography>
      <Typography variant="body1" paragraph>
        {evaluation.feedback}
      </Typography>
      
      <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Tips for improvement:
        </Typography>
        {generateImprovementTips().map((tip, index) => (
          <Typography key={index} variant="body2" sx={{ display: 'flex', mb: 0.5 }}>
            <span style={{ marginRight: '8px' }}>•</span> {tip}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default FeedbackCard; 