import mock from './mock';
import './tracking/FloorPlanData';
import './blog/blogData';
import './contacts/ContactsData';
import './chat/Chatdata';
import './notes/NotesData';
import './ticket/TicketData';
import './eCommerce/ProductsData';
import './email/EmailData';
import './userprofile/PostData';
import './userprofile/UsersData';
import './invoice/invoceLists';
import './kanban/KanbanData';
import './tracking/GatesData';
import './tracking/TagData';


mock.onAny().passThrough();
