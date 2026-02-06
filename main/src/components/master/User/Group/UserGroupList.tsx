import React, { useState } from 'react';
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
} from '@mui/material';
import { IconPlus, IconTrash, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { userGroupType } from 'src/store/apps/crud/users';
import { useAddUserGroup, useAssignBuilding, useRegisterUser } from 'src/hooks/useUser';
import { useAllBuilding } from 'src/hooks/useBuilding';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import AddEditBuilding from '../../CRUD/building/AddEditBuilding';
import toast from 'react-hot-toast';

interface Props {
  groups: userGroupType[];
  isLoading: boolean;
  levelPriority: string;
}

const SKELETON_ROWS = 5;

const UserGroupList = ({ groups, isLoading, levelPriority }: Props) => {
  /* ---------------- STATE ---------------- */
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [groupName, setGroupName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<userGroupType | null>(null);

  const { data: buildingData = [] } = useAllBuilding();
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openAssignBuilding, setOpenAssignBuilding] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [buildingId, setBuildingId] = useState<string>();

  const addGroupMutation = useAddUserGroup();
  const registerUserMutation = useRegisterUser();
  const assignBuildingMutation = useAssignBuilding();

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
    });

    setGroupName('');
    setOpenCreate(false);
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
    });
    toast.success('User registered successfully!');
    } catch (error) {
      console.error('Error registering user:', error);
      toast.error('User Registration failed.');
    }

    setOpenAddUser(false);
  };

  const handleAssignBuilding = async () => {
    if (!expandedGroupId || !buildingId) return;
   try {
     await assignBuildingMutation.mutateAsync({ groupId: expandedGroupId, buildingIds: [buildingId] });
     toast.success('Building assigned successfully!');
   } catch (error) {
     console.error('Error assigning building:', error);
     toast.error('Building Assign failed.');
   }
    setOpenAssignBuilding(false);
  };

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
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Username</TableCell>
          <TableCell>Email</TableCell>
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
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const BuildingTable = ({ buildings }: { buildings: any[] }) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Building Name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {buildings.length === 0 ? (
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                No accessible buildings
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          buildings.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.name}</TableCell>
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
              onClick={() => setOpenAddUser(true)}
            >
              Add User
            </Button>
          )}

          {tab === 'buildings' && (
            <Button
              size="small"
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => setOpenAssignBuilding(true)}
            >
              Assign Building
            </Button>
          )}
        </Box>

        {tab === 'members' ? (
          <MemberTable members={group.members || []} />
        ) : (
          <BuildingTable buildings={group.accessibleBuildings || []} />
        )}
      </Paper>
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <Grid container>
      <Grid size={12}>
        <TableContainer>
          <Table>
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
                <TableCell>Group Name</TableCell>
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
                          <TableCell>{group.name}</TableCell>
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
      <Dialog open={openAddUser} onClose={() => setOpenAddUser(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h4" fontWeight={700}>
            Register New User
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3}>
            <Grid size={12}>
              <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
              <CustomTextField
                fullWidth
                value={username}
                onChange={(e: any) => setUsername(e.target.value)}
              />
            </Grid>

            <Grid size={12}>
              <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
              <CustomTextField
                fullWidth
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
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
            onClick={() => handleRegisterUser(username, email)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* ASSIGN BUILDING */}
      <Dialog
        open={openAssignBuilding}
        onClose={() => setOpenAssignBuilding(false)}
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
            <CustomAutocomplete
              label="Building"
              options={buildingData}
              value={buildingData.find((b) => b.id === buildingId) || null}
              onChange={(val) => setBuildingId(val?.id ?? '')}
              getOptionLabel={(o) => o?.name ?? ''}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              sx={{ flex: 1 }}
            />
            <AddEditBuilding type="add" />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setOpenAssignBuilding(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleAssignBuilding()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* CREATE GROUP DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
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
    </Grid>
  );
};

export default UserGroupList;
