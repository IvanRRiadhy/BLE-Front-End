import React, { useEffect } from 'react';
import { List } from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { fetchMembers, memberType, SelectMember } from 'src/store/apps/crud/member';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TagListItem from './tagListItem';

const TagList = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const getVisibilityTags = (members: memberType[], filter: string, search: string) => {
    if (filter === 'show_all') {
      return members.filter(
        (mem) =>
          mem.name.toLowerCase().includes(search.toLowerCase()) ||
          mem.bleCardNumber.toLowerCase().includes(search.toLowerCase()) ||
          mem.personId.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return members.filter(
      (mem) =>
        (mem.departmentId === filter ||
          mem.districtId === filter ||
          mem.organizationId === filter) &&
        (mem.name.toLowerCase().includes(search.toLowerCase()) ||
          mem.bleCardNumber.toLowerCase().includes(search.toLowerCase()) ||
          mem.personId.toLowerCase().includes(search.toLowerCase())),
    );
  };

  const members = useSelector((state: RootState) =>
    getVisibilityTags(
      state.memberReducer.members,
      state.memberReducer.curentFilter,
      state.memberReducer.memberSearch,
    ),
  );

  const active = useSelector((state: RootState) => state.memberReducer.selectedMember);

  return (
    <List>
      <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '800px' }}>
        {members.map((member) => (
          <TagListItem
            key={member.id}
            active={member === active}
            member={member}
            onTagClick={() => {
              dispatch(SelectMember(member.id));
            }}
          />
        ))}
      </Scrollbar>
    </List>
  );
};

export default TagList;
