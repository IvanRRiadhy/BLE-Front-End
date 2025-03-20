import img1 from 'src/assets/images/profile/user-1.jpg';
import img2 from 'src/assets/images/profile/user-2.jpg';
import img3 from 'src/assets/images/profile/user-3.jpg';
import img4 from 'src/assets/images/profile/user-4.jpg';

interface PerformerType {
  id: string;
  imgsrc: string;
  name: string;
  post: string;
  area: string;
  status: string;
  triggerTime: string;
}

const TopPerformerData: PerformerType[] = [
  {
    id: '1',
    imgsrc: img1,
    name: 'Sunil Joshi',
    post: 'Web Designer',
    area: 'A',
    status: 'Low',
    triggerTime: '10:08:15',
  },
  {
    id: '2',
    imgsrc: img2,
    name: 'John Deo',
    post: 'Web Developer',
    area: 'F',
    status: 'Medium',
    triggerTime: '09:01:11',
  },
  {
    id: '3',
    imgsrc: img3,
    name: 'Mathew Anderson',
    post: 'Web Manager',
    area: 'D',
    status: 'High',
    triggerTime: '11:20:40',
  },
  {
    id: '4',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'A',
    status: 'Very High',
    triggerTime: '10:10:30',
  },
  {
    id: '5',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'A',
    status: 'Very Low',
    triggerTime: '10:09:45',
    
  },
  {
    id: '6',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'B',
    status: 'Very High',
    triggerTime: '15:03:15',
  },
  {
    id: '7',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'H',
    status: 'Very High',
    triggerTime: '09:40:33',
  },
  {
    id: '8',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'B',
    status: 'Very High',
    triggerTime: '07:00:32',
  },
  {
    id: '9',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'C',
    status: 'Very High',
    triggerTime: '07:00:33',
  },
  {
    id: '10',
    imgsrc: img4,
    name: 'Yuvraj Sheth',
    post: 'Project Manager',
    area: 'C',
    status: 'Very High',
    triggerTime: '07:00:34',
  },
  
];

export default TopPerformerData;
