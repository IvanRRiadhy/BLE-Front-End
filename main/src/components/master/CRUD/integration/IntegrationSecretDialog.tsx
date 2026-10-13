import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Grid2 as Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  Box,
  InputAdornment,
} from '@mui/material';
import { IconKey, IconEye, IconEyeOff, IconCopy, IconCheck } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useIntegrationSecret } from 'src/hooks/useIntegration';
import toast from 'react-hot-toast';

interface IntegrationSecretDialogProps {
  integrationId: string;
  brandName?: string;
}

const IntegrationSecretDialog: React.FC<IntegrationSecretDialogProps> = ({
  integrationId,
  brandName,
}) => {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: secretData, isLoading, isError, refetch } = useIntegrationSecret(
    integrationId,
    open,
  );

  const handleOpen = () => {
    setOpen(true);
    setShowPassword(false);
    setShowApiKey(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <>
      <Tooltip title="View Secret">
        <IconButton color="primary" size="small" onClick={handleOpen}>
          <IconKey size={20} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={1} mt={1} fontWeight={700}>
            Integration Secret
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {brandName ? `Brand: ${brandName}` : `ID: ${integrationId}`}
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </DialogTitle>

        <DialogContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          )}

          {isError && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="error" mb={2}>
                Failed to retrieve integration secrets.
              </Typography>
              <Button variant="outlined" onClick={() => refetch()}>
                Retry
              </Button>
            </Box>
          )}

          {!isLoading && !isError && secretData && (
            <Grid container spacing={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel>Authentication Type</CustomFormLabel>
                <CustomTextField
                  value={secretData.apiTypeAuth || '-'}
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                  }}
                />
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel>Username</CustomFormLabel>
                <CustomTextField
                  value={secretData.apiAuthUsername || '-'}
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: secretData.apiAuthUsername ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(secretData.apiAuthUsername, 'Username')}
                          >
                            {copiedField === 'Username' ? <IconCheck size={18} /> : <IconCopy size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>

              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel>API Key Field</CustomFormLabel>
                <CustomTextField
                  value={secretData.apiKeyField || '-'}
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: secretData.apiKeyField ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(secretData.apiKeyField, 'API Key Field')}
                          >
                            {copiedField === 'API Key Field' ? <IconCheck size={18} /> : <IconCopy size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>

              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel>API Key Value</CustomFormLabel>
                <CustomTextField
                  type={showApiKey ? 'text' : 'password'}
                  value={secretData.apiKeyValue || '-'}
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: secretData.apiKeyValue ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowApiKey((prev) => !prev)}>
                            {showApiKey ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(secretData.apiKeyValue, 'API Key Value')}
                          >
                            {copiedField === 'API Key Value' ? <IconCheck size={18} /> : <IconCopy size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>

              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel>Password</CustomFormLabel>
                <CustomTextField
                  type={showPassword ? 'text' : 'password'}
                  value={secretData.apiAuthPasswd || '-'}
                  fullWidth
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: secretData.apiAuthPasswd ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword((prev) => !prev)}>
                            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(secretData.apiAuthPasswd, 'Password')}
                          >
                            {copiedField === 'Password' ? <IconCheck size={18} /> : <IconCopy size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IntegrationSecretDialog;
