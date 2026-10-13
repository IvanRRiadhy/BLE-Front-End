import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  Checkbox,
  Chip,
  Box,
  InputAdornment,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { IconPencil, IconPlus, IconKey } from '@tabler/icons-react';
import React, { useEffect, useMemo } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { integrationType, apiTypeAuth } from 'src/types/crud/input';
import {
  addIntegration,
  editIntegration,
  fetchIntegrationDT,
  fetchIntegrations,
  IntegrationType,
} from 'src/store/apps/crud/integration';
import { useIntegrationScope, IntegrationScopeType, useGenerateApiKey } from 'src/hooks/useIntegration';
import { useAllBrands } from 'src/hooks/useBrand';
import { BrandType } from 'src/store/apps/crud/brand';
import toast from 'react-hot-toast';
import { defaultIntegrationForm } from 'src/store/apps/defaultForm';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

interface FormType {
  type?: string;
  integration?: IntegrationType;
}

const AddEditIntegration = ({ type, integration }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<IntegrationType>({
    ...defaultIntegrationForm,
    ...integration,
    applicationId: localStorage.getItem('applicationId') || '',
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const { data: scopesData = [], isLoading: isLoadingScopes } = useIntegrationScope();
  const { data: brandsData = [], isLoading: isLoadingBrands } = useAllBrands();
  const generateApiKeyMutation = useGenerateApiKey();

  const handleGenerateKey = async () => {
    try {
      const generatedKey = await generateApiKeyMutation.mutateAsync();
      setFormData((prev) => ({
        ...prev,
        apiKeyValue: generatedKey,
      }));
      toast.success('API key generated successfully');
    } catch (error) {
      toast.error('Failed to generate API key');
      console.error('Error generating API key:', error);
    }
  };

  // Group scopes by module and extract concrete (non-wildcard) items per module
  const { moduleScopesMap, concreteScopes } = useMemo(() => {
    const map: Record<string, IntegrationScopeType[]> = {};
    const concrete: IntegrationScopeType[] = [];

    (scopesData || []).forEach((scope) => {
      const mod = scope.module || 'Other';
      if (!map[mod]) {
        map[mod] = [];
      }
      map[mod].push(scope);

      if (!scope.key.includes('*')) {
        concrete.push(scope);
      }
    });

    return { moduleScopesMap: map, concreteScopes: concrete };
  }, [scopesData]);

  // Selected keys parsed from formData.scopes (excluding any wildcards that might have been saved)
  const selectedConcreteKeys = useMemo(() => {
    if (!formData.scopes) return [];
    return formData.scopes
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && !k.includes('*'));
  }, [formData.scopes]);

  // Selected options shown in Autocomplete (includes wildcards if all module items are selected)
  const selectedScopeOptions = useMemo(() => {
    const selectedSet = new Set(selectedConcreteKeys);
    const result: IntegrationScopeType[] = [];

    (scopesData || []).forEach((scope) => {
      if (scope.key.includes('*')) {
        const mod = scope.module || 'Other';
        const modScopes = moduleScopesMap[mod] || [];
        const modConcreteScopes = modScopes.filter((s) => !s.key.includes('*'));

        // If module has concrete items and all are selected, consider wildcard option selected
        if (
          modConcreteScopes.length > 0 &&
          modConcreteScopes.every((s) => selectedSet.has(s.key))
        ) {
          result.push(scope);
        }
      } else {
        if (selectedSet.has(scope.key)) {
          result.push(scope);
        }
      }
    });

    return result;
  }, [scopesData, selectedConcreteKeys, moduleScopesMap]);

  const IntegrationFilter = useSelector(
    (state: RootState) => state.integrationReducer.IntegrationFilter,
  );
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    const storedAppId = localStorage.getItem('applicationId') || '';
    if (type === 'edit' && integration) {
      if (!integration.id) {
        dispatch(fetchIntegrationDT(IntegrationFilter));
      }
      setFormData({
        ...defaultIntegrationForm,
        ...integration,
        applicationId: storedAppId,
      });
    } else {
      setFormData({
        ...defaultIntegrationForm,
        applicationId: storedAppId,
        brandId: '',
        integrationType: 'Api',
        apiTypeAuth: 'ApiKey',
        apiKeyField: '',
        apiKeyValue: '',
        scopes: '',
        apiUrl: '',
        apiAuthUsername: '',
        apiAuthPasswd: '',
      });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: IntegrationType = {
        ...formData,
        applicationId: formData.applicationId || localStorage.getItem('applicationId') || '',
        apiAuthUsername: formData.apiAuthUsername?.trim() ? formData.apiAuthUsername : (null as any),
        apiAuthPasswd: formData.apiAuthPasswd?.trim() ? formData.apiAuthPasswd : (null as any),
        apiKeyField: formData.apiKeyField || '',
        apiKeyValue: formData.apiKeyValue || '',
      };

      let result;
      if (type === 'edit') {
        result = await dispatch(editIntegration(payload)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addIntegration(payload));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchIntegrationDT(IntegrationFilter));
        console.log('Integration Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving integration:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  const handleScopeChange = (
    _event: React.SyntheticEvent,
    _newOptions: IntegrationScopeType[],
    reason: string,
    details?: { option?: IntegrationScopeType },
  ) => {
    if (reason === 'clear') {
      setFormData((prev) => ({ ...prev, scopes: '' }));
      return;
    }

    const toggledOption = details?.option;
    if (!toggledOption) {
      // Direct replacement fallback (e.g. tag deleted or cleared)
      // Determine which option was removed by comparing selectedScopeOptions with _newOptions
      const newOptionKeys = new Set(_newOptions.map((o) => o.key));
      const removedOptions = selectedScopeOptions.filter((o) => !newOptionKeys.has(o.key));

      const updatedKeys = new Set(selectedConcreteKeys);

      removedOptions.forEach((removed) => {
        if (removed.key.includes('*')) {
          // A wildcard chip was deleted -> remove all concrete scopes of this module
          const mod = removed.module || 'Other';
          const modConcreteScopes = (moduleScopesMap[mod] || []).filter((s) => !s.key.includes('*'));
          modConcreteScopes.forEach((s) => updatedKeys.delete(s.key));
        } else {
          updatedKeys.delete(removed.key);
        }
      });

      setFormData((prev) => ({
        ...prev,
        scopes: Array.from(updatedKeys).join(','),
      }));
      return;
    }

    const currentSelectedKeys = new Set(selectedConcreteKeys);

    if (toggledOption.key.includes('*')) {
      const mod = toggledOption.module || 'Other';
      const modScopes = moduleScopesMap[mod] || [];
      const modConcreteScopes = modScopes.filter((s) => !s.key.includes('*'));

      const allModSelected =
        modConcreteScopes.length > 0 &&
        modConcreteScopes.every((s) => currentSelectedKeys.has(s.key));

      if (allModSelected) {
        // Deselect all concrete scopes in this module
        modConcreteScopes.forEach((s) => currentSelectedKeys.delete(s.key));
      } else {
        // Select all concrete scopes in this module
        modConcreteScopes.forEach((s) => currentSelectedKeys.add(s.key));
      }
    } else {
      if (currentSelectedKeys.has(toggledOption.key)) {
        currentSelectedKeys.delete(toggledOption.key);
      } else {
        currentSelectedKeys.add(toggledOption.key);
      }
    }

    setFormData((prev) => ({
      ...prev,
      scopes: Array.from(currentSelectedKeys).join(','),
    }));
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Integration">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Integration">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Integration
          </Button>
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Integration' : 'Edit Integration'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Integration Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel htmlFor="brand-id">Brand</CustomFormLabel>
                <Autocomplete<BrandType, false, false, false>
                  options={brandsData}
                  loading={isLoadingBrands}
                  getOptionLabel={(option) => option.name || ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={brandsData.find((b) => b.id === formData.brandId) || null}
                  onChange={(_e, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      brandId: newValue ? newValue.id : '',
                    }));
                  }}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder={formData.brandId ? '' : 'Select brand...'}
                      fullWidth
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingBrands ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel htmlFor="integration-type">Integration Type</CustomFormLabel>
                <CustomSelect
                  name="integrationType"
                  value={formData.integrationType || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {integrationType.map((integration) => (
                    <MenuItem
                      key={integration.value}
                      value={integration.value}
                      disabled={integration.disabled || false}
                    >
                      {integration.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
              <Grid size={{ lg: 12, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel htmlFor="integration-scopes">Integration Scopes</CustomFormLabel>
                <Autocomplete<IntegrationScopeType, true, false, false>
                  multiple
                  disableCloseOnSelect
                  options={scopesData}
                  loading={isLoadingScopes}
                  groupBy={(option) => option.module || 'Other'}
                  getOptionLabel={(option) => option.name || option.key}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  value={selectedScopeOptions}
                  onChange={handleScopeChange}
                  renderTags={(tagValue, getTagProps) => {
                    // Identify modules that have their wildcard chip present
                    const wildcardModules = new Set(
                      tagValue
                        .filter((option) => option.key.includes('*'))
                        .map((option) => option.module || 'Other'),
                    );

                    // If a module's wildcard (select-all) is active, only show the wildcard chip and suppress individual chips
                    const visibleTags = tagValue.filter((option) => {
                      const mod = option.module || 'Other';
                      if (wildcardModules.has(mod)) {
                        return option.key.includes('*');
                      }
                      return true;
                    });

                    return visibleTags.map((option) => {
                      const origIndex = tagValue.findIndex((t) => t.key === option.key);
                      const { key, ...tagProps } = getTagProps({ index: origIndex });
                      return (
                        <Chip
                          key={option.key}
                          label={option.name}
                          size="small"
                          color={option.key.includes('*') ? 'primary' : 'default'}
                          {...tagProps}
                        />
                      );
                    });
                  }}
                  renderOption={(props, option, { selected }) => {
                    const isWildcard = option.key.includes('*');
                    return (
                      <li {...props} key={option.key}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            py: 0.5,
                          }}
                        >
                          <Box sx={{ pr: 1 }}>
                            <Typography
                              variant="body2"
                              fontWeight={isWildcard ? 700 : 500}
                              color={isWildcard ? 'primary.main' : 'text.primary'}
                            >
                              {option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {option.key}
                              {option.description ? ` • ${option.description}` : ''}
                            </Typography>
                          </Box>
                          <Checkbox
                            icon={icon}
                            checkedIcon={checkedIcon}
                            checked={selected}
                            color={isWildcard ? 'secondary' : 'primary'}
                            sx={{ p: 0.5 }}
                          />
                        </Box>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder={selectedScopeOptions.length === 0 ? 'Select scopes...' : ''}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingScopes ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              API Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel htmlFor="api-type">API Authentication Type</CustomFormLabel>
                <CustomSelect
                  name="apiTypeAuth"
                  value={formData.apiTypeAuth || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {apiTypeAuth.map((api) => (
                    <MenuItem key={api.value} value={api.value} disabled={api.disabled || false}>
                      {api.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
                <CustomFormLabel htmlFor="api-auth-uname">
                  API Authentication Username
                </CustomFormLabel>
                <CustomTextField
                  id="apiAuthUsername"
                  name="apiAuthUsername"
                  value={formData.apiAuthUsername || ''}
                  placeholder={formData.apiAuthUsername || 'Username'}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="api-key-field">API Key Field</CustomFormLabel>
                <CustomTextField
                  id="apiKeyField"
                  name="apiKeyField"
                  value={formData.apiKeyField || ''}
                  placeholder={formData.apiKeyField || 'e.g. X-BIOPEOPLETRACKING-API-KEY'}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
                <CustomFormLabel htmlFor="api-url">API URL</CustomFormLabel>
                <CustomTextField
                  id="apiUrl"
                  name="apiUrl"
                  value={formData.apiUrl || ''}
                  placeholder={formData.apiUrl || 'https://...'}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="api-key-field">
                  API Authentication Password
                </CustomFormLabel>
                <CustomTextField
                  id="apiAuthPasswd"
                  name="apiAuthPasswd"
                  type="password"
                  value={formData.apiAuthPasswd || ''}
                  placeholder={formData.apiAuthPasswd || 'Password'}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="api-key-field">API Key Value</CustomFormLabel>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <CustomTextField
                    id="apiKeyValue"
                    name="apiKeyValue"
                    value={formData.apiKeyValue || ''}
                    placeholder={formData.apiKeyValue || 'Key value'}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  />
                  <Tooltip title="Generate random API key">
                    <span>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleGenerateKey}
                        disabled={generateApiKeyMutation.isPending}
                        sx={{ whiteSpace: 'nowrap', px: 2, minWidth: '120px' }}
                        startIcon={
                          generateApiKeyMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <IconKey size={18} />
                          )
                        }
                      >
                        Generate
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {loading && (
        <Dialog open={true} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditIntegration;
