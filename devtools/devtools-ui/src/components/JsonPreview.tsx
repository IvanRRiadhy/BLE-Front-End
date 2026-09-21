import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { ProductionAreaJson } from 'devtools-floorplan-detection';

interface JsonPreviewProps {
  productionJson: ProductionAreaJson[];
  copyFeedback: boolean;
  onCopyJson: () => void;
  onDownloadJson: () => void;
}

export const JsonPreview: React.FC<JsonPreviewProps> = ({
  productionJson,
  copyFeedback,
  onCopyJson,
  onDownloadJson,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const formattedJson = JSON.stringify(productionJson, null, 2);

  return (
    <Box
      sx={{
        backgroundColor: '#0c1017',
        borderTop: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 2,
          py: 0.8,
          backgroundColor: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? '1px solid #1f2937' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <DataObjectIcon sx={{ fontSize: 18, color: '#10b981' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.85rem' }}>
            BIONIC Production JSON Output
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.72rem' }}>
            ({productionJson.length} serialized areas from floorplanSerializer.ts)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={copyFeedback ? <CheckIcon sx={{ color: '#10b981' }} /> : <ContentCopyIcon />}
            onClick={onCopyJson}
            disabled={productionJson.length === 0}
            sx={{
              borderColor: copyFeedback ? '#10b981' : '#374151',
              color: copyFeedback ? '#10b981' : '#cbd5e1',
              fontSize: '0.75rem',
              py: 0.3,
              px: 1,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#4b5563',
                backgroundColor: '#1e293b',
              },
            }}
          >
            {copyFeedback ? 'Copied!' : 'Copy JSON'}
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={onDownloadJson}
            disabled={productionJson.length === 0}
            sx={{
              backgroundColor: '#059669',
              color: '#ffffff',
              fontSize: '0.75rem',
              py: 0.3,
              px: 1,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#047857',
              },
            }}
          >
            Download
          </Button>

          <Tooltip title={expanded ? 'Collapse Panel' : 'Expand Panel'}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: '#9ca3af', p: 0.5 }}
            >
              {expanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={expanded} timeout="auto">
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            maxHeight: 200,
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.78rem',
            lineHeight: 1.5,
            color: '#a7f3d0',
            backgroundColor: '#070a10',
            userSelect: 'text',
          }}
        >
          {productionJson.length === 0 ? (
            <span style={{ color: '#4b5563' }}>// No serialized output. Run detection or load mock.</span>
          ) : (
            formattedJson
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
