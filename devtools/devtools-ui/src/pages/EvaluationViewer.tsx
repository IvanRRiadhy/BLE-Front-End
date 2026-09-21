import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  Alert,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export const EvaluationViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const evalCmd = 'python -m evaluation.run --dataset my_floorplan';

  const handleCopy = () => {
    navigator.clipboard.writeText(evalCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        backgroundColor: '#0b0f17',
        color: '#f8fafc',
        p: 4,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 1.5,
              backgroundColor: '#1e1b4b',
              color: '#818cf8',
              border: '1px solid #4338ca',
            }}
          >
            <AssessmentIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              BIONIC Evaluation Benchmark Harness
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.2 }}>
              Independent black-box evaluation and geometric accuracy verification
            </Typography>
          </Box>
        </Box>

        {/* Workflow Card */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#0e1420',
            border: '1px solid #1f2937',
            borderRadius: 1.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#38bdf8', mb: 1.5 }}>
            Ground Truth Evaluation Lifecycle
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              p: 2,
              backgroundColor: '#090d16',
              borderRadius: 1,
              border: '1px solid #1e293b',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.85rem',
            }}
          >
            <Chip label="1. my_floorplan" sx={{ backgroundColor: '#1e293b', color: '#94a3b8' }} />
            <Typography sx={{ color: '#64748b' }}>→</Typography>
            <Chip label="2. Annotation Tool" sx={{ backgroundColor: '#0284c7', color: '#fff', fontWeight: 600 }} />
            <Typography sx={{ color: '#64748b' }}>→</Typography>
            <Chip label="3. *.gt.json" sx={{ backgroundColor: '#064e3b', color: '#a7f3d0' }} />
            <Typography sx={{ color: '#64748b' }}>→</Typography>
            <Chip label="4. Evaluation Harness" sx={{ backgroundColor: '#312e81', color: '#c7d2fe' }} />
            <Typography sx={{ color: '#64748b' }}>→</Typography>
            <Chip label="5. Accuracy Metrics & Gallery" sx={{ backgroundColor: '#701a75', color: '#f5d0fe' }} />
          </Box>
        </Paper>

        {/* CLI Runner Command */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#0e1420',
            border: '1px solid #1f2937',
            borderRadius: 1.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 1 }}>
            Run Evaluation Against User Floorplans
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Once you save ground truth files in the Annotation Tool, execute the benchmark runner CLI to evaluate the current detector accuracy against human ground truth:
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#070a10',
              border: '1px solid #1e293b',
              borderRadius: 1,
              p: 1.5,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.85rem',
              color: '#38bdf8',
            }}
          >
            <code>{evalCmd}</code>
            <Tooltip title={copied ? 'Copied!' : 'Copy command'}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={handleCopy}
                sx={{
                  borderColor: '#334155',
                  color: copied ? '#4ade80' : '#94a3b8',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Tooltip>
          </Box>
        </Paper>

        {/* Output Artifacts Info */}
        <Paper
          sx={{
            p: 3,
            backgroundColor: '#0e1420',
            border: '1px solid #1f2937',
            borderRadius: 1.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', mb: 1.5 }}>
            Generated Benchmark Artifacts
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Each run outputs comprehensive performance and geometry metrics:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DescriptionIcon sx={{ color: '#38bdf8' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                  HTML Summary Report:
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  services/floorplan-detector/evaluation/results/latest/summary.html
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AssessmentIcon sx={{ color: '#10b981' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                  JSON & CSV Raw Results:
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  services/floorplan-detector/evaluation/results/latest/report.json (.csv)
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CheckCircleIcon sx={{ color: '#818cf8' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                  Visual Overlay Debug Images:
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  services/floorplan-detector/evaluation/results/latest/visualizations/
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
