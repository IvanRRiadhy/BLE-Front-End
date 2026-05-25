import mock from '../mock';

interface gatesType {
    id: string;
    name: string;
    position: [x: number, y: number];
    color: string;
    posX: number;
    posY: number;
    isActive: boolean;
    isEditing: boolean;
}

const GatesData: gatesType[] =[
    {
        id: '2ed2d1e2-2b01-4641-9bea-246ee5017d1c',
        name: "ABC123",
        position: [0, 0],
        color: 'red',
        posX: 0,
        posY: 0,
        isActive: false,
        isEditing: false,
    },
    {
        id:'fa799094-f675-40ec-88ce-5db519b39a22',
        name: "ASD332",
        position: [150, 400],
        color: 'green',
        posX: 150,  
        posY: 400,
        isActive: false,
        isEditing: false,
    },
    {
        id:'a5a25000-029b-4fd2-b32f-92d0e85a40db',
        name: "QWE169",
        position: [450, 50],
        color: 'blue',
        posX: 450,
        posY: 50,
        isActive: false,
        isEditing: false,
    },
    {
        id:'e78fa1ba-9e39-42d1-99bc-acd3cb32bdaf',
        name: "QNM094",
        position: [300, 100],
        color: 'yellow',
        posX: 300,
        posY: 100,
        isActive: false,
        isEditing: false,
    },
    {
        id:'8d6ce319-86f9-441d-96b0-c876c8c7af7d',
        name: "ZXK775",
        position: [100, 50],
        color: 'magenta',
        posX: 100,
        posY: 50,
        isActive: false,
        isEditing: false,
    }
];

mock.onGet('/api/data/tracking/GatesData').reply(() => {
    return[200, GatesData];
});
export default GatesData;