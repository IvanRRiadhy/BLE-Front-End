import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Skeleton,
  Divider,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Collapse,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconArrowBackUp,
  IconBan,
  IconSettings,
} from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { userGroupType, userRegistrationType } from 'src/store/apps/crud/users';
import {
  useAddUserGroup,
  useAssignBuilding,
  useRegisterUser,
  useRevokeBuilding,
  useRevokeAllBuilding,
  useEditUser,
} from 'src/hooks/useUser';
import { useAllBuilding } from 'src/hooks/useBuilding';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import AddEditBuilding from '../../CRUD/building/AddEditBuilding';
import toast from 'react-hot-toast';
import { BuildingType } from 'src/store/apps/crud/building';

interface Props {
  groups: userGroupType[];
  isLoading: boolean;
  levelPriority: string;
}

const SKELETON_ROWS = 5;

const UserGroupList = ({ groups, isLoading, levelPriority }: Props) => {
  /* ---------------- STATE ---------------- */
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const expandedGroup = groups.find((g) => g.id === expandedGroupId);
  // console.log(groups, 'groups')
  const [openCreate, setOpenCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isHead, setIsHead] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<userGroupType | null>(null);

  const { data: buildingData = [] } = useAllBuilding();

  const [userDialogMode, setUserDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openAssignBuilding, setOpenAssignBuilding] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const initialUserAbility = {
    canAlarmAction: null,
    canApprovePatrol: null,
    canCreateMonitoringConfig: null,
    canUpdateMonitoringConfig: null,
  };
  const [userAbility, setUserAbility] = useState({
    canAlarmAction: null,
    canApprovePatrol: null,
    canCreateMonitoringConfig: null,
    canUpdateMonitoringConfig: null,
  });
  const [selectedBuildings, setSelectedBuildings] = useState<BuildingType[]>([]);
  const [openRevokeOne, setOpenRevokeOne] = useState(false);
  const [openRevokeAll, setOpenRevokeAll] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const addGroupMutation = useAddUserGroup();
  const registerUserMutation = useRegisterUser();
  const editUserMutation = useEditUser();
  const assignBuildingMutation = useAssignBuilding();
  const revokeBuildingMutation = useRevokeBuilding();
  const revokeAllBuildingMutation = useRevokeAllBuilding();

  const resetRegisterUserForm = () => {
    setUsername('');
    setEmail('');
    setUserAbility(initialUserAbility);
  };

  const resetCreateGroupForm = () => {
    setGroupName('');
    setIsHead(false);
  };

  const resetAssignBuildingForm = () => {
    setSelectedBuildings([]);
  };

  const [activeTabByGroup, setActiveTabByGroup] = useState<Record<string, 'members' | 'buildings'>>(
    {},
  );

  /* ---------------- HANDLERS ---------------- */
  const toggleExpand = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const getActiveTab = (groupId: string) => activeTabByGroup[groupId] ?? 'members';

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    await addGroupMutation.mutateAsync({
      name: groupName,
      levelPriority,
      isHead: isHead,
    });

    setOpenCreate(false);
    resetCreateGroupForm();
  };

  const handleOpenDeleteDialog = (group: userGroupType) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleRegisterUser = async (username: string, email: string) => {
    if (!expandedGroupId) return;
    try {
      await registerUserMutation.mutateAsync({
        username,
        email,
        GroupId: expandedGroupId,
        ...userAbility,
      });
      toast.success('User registered successfully!');
    } catch (error) {
      console.error('Error registering user:', error);
      toast.error('User Registration failed.');
    }

    setOpenAddUser(false);
    resetRegisterUserForm();
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (!expandedGroupId) return;
    try {
      await editUserMutation.mutateAsync({
        id: selectedUser.id,
        payload: {
          username,
          email,
          GroupId: expandedGroupId,
          ...userAbility,
        },
      });
      toast.success('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('User Update failed.');
    }
    setOpenAddUser(false);
    resetRegisterUserForm();
  };

  const handleAssignBuilding = async () => {
    if (!expandedGroupId || selectedBuildings.length === 0) return;
    try {
      await assignBuildingMutation.mutateAsync({
        groupId: expandedGroupId,
        buildingIds: selectedBuildings.map((building) => building.id),
      });
      toast.success('Building assigned successfully!');
    } catch (error) {
      console.error('Error assigning building:', error);
      toast.error('Building Assign failed.');
    }
    setOpenAssignBuilding(false);
    resetAssignBuildingForm();
  };

  useEffect(() => {
    if (openAddUser && userDialogMode === 'edit' && selectedUser) {
      setUsername(selectedUser.username ?? '');
      setEmail(selectedUser.email ?? '');

      setUserAbility({
        canAlarmAction: selectedUser.canAlarmAction ?? false,
        canApprovePatrol: selectedUser.canApprovePatrol ?? false,
        canCreateMonitoringConfig: selectedUser.canCreateMonitoringConfig ?? false,
        canUpdateMonitoringConfig: selectedUser.canUpdateMonitoringConfig ?? false,
      });
    }

    if (openAddUser && userDialogMode === 'create') {
      resetRegisterUserForm();
    }
  }, [openAddUser, userDialogMode, selectedUser]);

  /* ---------------- SKELETON ---------------- */
  const renderSkeletonRows = () =>
    Array.from({ length: SKELETON_ROWS }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell>
          <Skeleton width={20} />
        </TableCell>
        <TableCell>
          <Skeleton width={180} />
        </TableCell>
        <TableCell>
          <Skeleton width={80} />
        </TableCell>
        <TableCell>
          <Skeleton width={120} />
        </TableCell>
        <TableCell>
          <Skeleton width={40} />
        </TableCell>
      </TableRow>
    ));

  /* ---------------- SUB TABLES ---------------- */
  const MemberTable = ({ members }: { members: any[] }) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Username</TableCell>
          <TableCell>Email</TableCell>
          <TableCell align="right" width={80}>
            Action
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {members.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2}>
              <Typography variant="body2" color="text.secondary">
                No members
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.username}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell align="right">
                <Tooltip title="User Settings">
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => {
                      setUserDialogMode('edit');
                      setSelectedUser(m);
                      setOpenAddUser(true);
                    }}
                  >
                    <IconSettings size={18} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const BuildingTable = ({ buildings, groupId }: { buildings: any[]; groupId: string }) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Building Name</TableCell>
          <TableCell align="right" width={80}>
            Action
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {buildings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2}>
              <Typography variant="body2" color="text.secondary">
                No accessible buildings
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          buildings.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.name}</TableCell>
              <TableCell align="right">
                <Tooltip title="Revoke access">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => {
                      setSelectedBuildingId(b.id);
                      setOpenRevokeOne(true);
                    }}
                  >
                    <IconArrowBackUp size={18} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const GroupAccordionContent = ({
    group,
    tab,
    onTabChange,
  }: {
    group: userGroupType;
    tab: 'members' | 'buildings';
    onTabChange: (tab: 'members' | 'buildings') => void;
  }) => {
    return (
      <Paper sx={{ bgcolor: '#f5f8fa', p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Tabs value={tab} onChange={(_, v) => onTabChange(v)}>
            <Tab value="members" label="Members" />
            <Tab value="buildings" label="Buildings" />
          </Tabs>

          {/* Contextual + button */}
          {tab === 'members' && (
            <Button
              size="small"
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => {
                setUserDialogMode('create');
                setSelectedUser(null);
                setOpenAddUser(true);
              }}
            >
              Add User
            </Button>
          )}

          {tab === 'buildings' && (
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<IconPlus size={16} />}
                onClick={() => {
                  const mappedBuildings =
                    buildingData.filter((b) =>
                      expandedGroup?.accessibleBuildings?.some((ab) => ab.id === b.id),
                    ) ?? [];

                  setSelectedBuildings(mappedBuildings);
                  setOpenAssignBuilding(true);
                }}
              >
                Assign Building
              </Button>

              {group.accessibleBuildingCount > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconBan size={16} />}
                  onClick={() => setOpenRevokeAll(true)}
                >
                  Revoke All
                </Button>
              )}
            </Box>
          )}
        </Box>

        {tab === 'members' ? (
          <MemberTable members={group.members || []} />
        ) : (
          <BuildingTable buildings={group.accessibleBuildings || []} groupId={group.id} />
        )}
      </Paper>
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <Grid container>
      <Grid size={12}>
        <TableContainer>
          <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow>
                {/* LEFT STICKY CREATE */}
                <TableCell sx={{ width: 60 }}>
                  <Tooltip title="Create new group">
                    <IconButton color="primary" onClick={() => setOpenCreate(true)}>
                      <IconPlus size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 800 }}>Group Name</TableCell>
                <TableCell>Is Head</TableCell>
                <TableCell>User Count</TableCell>
                <TableCell>Accessible Buildings</TableCell>
                <TableCell width={80}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading
                ? renderSkeletonRows()
                : groups.map((group) => {
                    const isOpen = expandedGroupId === group.id;
                    return (
                      <React.Fragment key={group.id}>
                        {/* MAIN ROW */}
                        <TableRow hover>
                          <TableCell width={40}>
                            <IconButton size="small" onClick={() => toggleExpand(group.id)}>
                              {isOpen ? <IconChevronDown /> : <IconChevronRight />}
                            </IconButton>
                          </TableCell>
                          <Tooltip title={group.name}>
                            <TableCell
                              sx={{
                                width: 800,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {group.name}
                            </TableCell>
                          </Tooltip>
                          <TableCell>{group.isHead ? 'Yes' : 'No'}</TableCell>
                          <TableCell>{group.memberCount}</TableCell>
                          <TableCell>{group.accessibleBuildingCount}</TableCell>
                          <TableCell>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(group)}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        {/* ACCORDION ROW */}
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0, borderBottom: 0 }}>
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box pl={6} pr={2} pb={2}>
                                <GroupAccordionContent
                                  group={group}
                                  tab={getActiveTab(group.id)}
                                  onTabChange={(tab) =>
                                    setActiveTabByGroup((prev) => ({
                                      ...prev,
                                      [group.id]: tab,
                                    }))
                                  }
                                />
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      {/* REGISTER USER */}
      <Dialog
        open={openAddUser}
        onClose={() => {
          setOpenAddUser(false);
          resetRegisterUserForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h4" fontWeight={700}>
            {userDialogMode === 'create' ? 'Register New User' : 'Edit User'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            {/* LEFT SIDE */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
              <CustomTextField
                id="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                fullWidth
                variant="outlined"
              />

              <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
              <CustomTextField
                id="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>

            {/* RIGHT SIDE */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <YesNoSwitch
                label="Can Alarm Action"
                value={userAbility.canAlarmAction}
                field="canAlarmAction"
                setState={setUserAbility}
              />

              <YesNoSwitch
                label="Can Approve Patrol"
                value={userAbility.canApprovePatrol}
                field="canApprovePatrol"
                setState={setUserAbility}
              />

              <YesNoSwitch
                label="Can Create Monitoring Config"
                value={userAbility.canCreateMonitoringConfig}
                field="canCreateMonitoringConfig"
                setState={setUserAbility}
              />

              <YesNoSwitch
                label="Can Update Monitoring Config"
                value={userAbility.canUpdateMonitoringConfig}
                field="canUpdateMonitoringConfig"
                setState={setUserAbility}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setOpenAddUser(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (userDialogMode === 'create') {
                handleRegisterUser(username, email);
              } else {
                handleUpdateUser();
              }
            }}
            disabled={
              !username || !email || registerUserMutation.isPending || editUserMutation.isPending
            }
          >
            {registerUserMutation.isPending || editUserMutation.isPending ? (
              <CircularProgress size={20} />
            ) : userDialogMode === 'create' ? (
              'Register'
            ) : (
              'Update'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ASSIGN BUILDING */}
      <Dialog
        open={openAssignBuilding}
        onClose={() => {
          setOpenAssignBuilding(false);
          resetAssignBuildingForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h4" fontWeight={700}>
            Assign Building
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <CustomFormLabel htmlFor="building">Building</CustomFormLabel>
          <Box display="flex" alignItems="center" gap={1}>
            <CustomAutocomplete<BuildingType>
              label="Buildings"
              multiple
              options={buildingData}
              value={selectedBuildings}
              onChange={(val) => setSelectedBuildings(val as BuildingType[])}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
            />
            {/* <AddEditBuilding type="add" /> */}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setOpenAssignBuilding(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleAssignBuilding()}
            disabled={assignBuildingMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* CREATE GROUP DIALOG */}
      <Dialog
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          resetCreateGroupForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h4" fontWeight={700}>
            New Group ({levelPriority})
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <CustomFormLabel>Group Name</CustomFormLabel>
          <CustomTextField
            fullWidth
            value={groupName}
            onChange={(e: any) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />
          <CustomFormLabel sx={{ mt: 2 }}>Is Head of Department?</CustomFormLabel>
          <Button
            variant={isHead ? 'contained' : 'outlined'}
            onClick={() => setIsHead(true)}
            sx={{ mr: 1 }}
          >
            Yes
          </Button>
          <Button variant={isHead ? 'outlined' : 'contained'} onClick={() => setIsHead(false)}>
            No
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setOpenCreate(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={addGroupMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete group <strong>{selectedGroup?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* REVOKE DIALOG */}
      <Dialog open={openRevokeOne} onClose={() => setOpenRevokeOne(false)}>
        <DialogTitle>Revoke Building Access</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke access to this building?
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenRevokeOne(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={async () => {
              if (!expandedGroupId || !selectedBuildingId) return;

              try {
                await revokeBuildingMutation.mutateAsync({
                  groupId: expandedGroupId,
                  buildingId: selectedBuildingId,
                });
                toast.success('Building access revoked');
              } catch {
                toast.error('Failed to revoke building');
              }

              setOpenRevokeOne(false);
              setSelectedBuildingId(null);
            }}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openRevokeAll} onClose={() => setOpenRevokeAll(false)}>
        <DialogTitle>Revoke All Buildings</DialogTitle>

        <DialogContent>
          <DialogContentText>
            This will remove <strong>all building access</strong> from this group. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenRevokeAll(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={async () => {
              if (!expandedGroupId) return;

              try {
                await revokeAllBuildingMutation.mutateAsync({
                  groupId: expandedGroupId,
                });
                toast.success('All building access revoked');
              } catch {
                toast.error('Failed to revoke all buildings');
              }

              setOpenRevokeAll(false);
            }}
          >
            Revoke All
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default UserGroupList;

interface YesNoSwitchProps<T> {
  label: string;
  value: boolean | null;
  field: keyof T;
  setState: React.Dispatch<React.SetStateAction<T>>;
}

const YesNoSwitch = <T extends object>({ label, value, field, setState }: YesNoSwitchProps<T>) => {
  const handleChange = (event: React.MouseEvent<HTMLElement>, newValue: boolean | null) => {
    if (newValue !== null) {
      setState((prev) => ({
        ...prev,
        [field]: newValue,
      }));
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
      {/* LEFT: LABEL */}
      <Typography sx={{ width: 220 }} fontWeight={500}>
        {label}
      </Typography>

      {/* RIGHT: TOGGLE */}
      <ToggleButtonGroup value={value} exclusive onChange={handleChange} size="small">
        <ToggleButton value={true} color="success">
          Yes
        </ToggleButton>

        <ToggleButton value={false} color="error">
          No
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
