import mock from '../mock';

interface TagType {
    id: string;
    tagID: string;
    name: string;
    department: string;
    color: string;
}

const TagData: TagType[] = [
    {
        id: '1',
        tagID: '3SDE',
        name: 'Bambang',
        department: 'Sales',
        color: 'success',
    },
    {
        id: '2',
        tagID: '4BKO',
        name: 'Priyadi',
        department: 'Engineer',
        color: 'warning',
    },
    {
        id: '3',
        tagID: '2RTW',
        name: 'Dodit',
        department: 'HR',
        color: 'info',
    },
    {
        id: '4',
        tagID: '5OYA',
        name: 'Mulan',
        department: 'Marketing',
        color: 'error',
    },
    {
        id: '5',
        tagID: '8CIV',
        name: 'Layla',
        department: 'Finance',
        color: 'primary',
    },
    {
        id: '6',
        tagID: '7BTS',
        name: 'Joni',
        department: 'Engineer',
        color: 'secondary',
    },
    {
        id: '7',
        tagID: '1RRR',
        name: 'Hakos',
        department: 'HR',
        color: 'error',
    },
    {
        id: '8',
        tagID: '6PLZ',
        name: 'Bobby',
        department: 'Marketing',
        color: 'success',
    },

];

mock.onGet('api/data/tracking/TagData').reply(() => {
    return[200, TagData];
});
export default TagData;