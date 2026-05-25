interface BlaclistType {
    id: string;
    name: string;
    cardID: string;
    dateAsigned: string;
    duration: string;
    keterangan: string;
}

const BlacklistData: BlaclistType[] = [
    {
        id: "1",
        name: "John Doe",
        cardID: "123456789",
        dateAsigned: "01-01-2025",
        duration: "3 months",
        keterangan: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat, autem."
    },
    {
        id: "2",
        name: "Bambang Priyono",
        cardID: "987654321",
        dateAsigned: "10-02-2025",
        duration: "5 months",
        keterangan: "Adadeh"
    },
    {
        id: "3",
        name: "Zacky Aditya",
        cardID: "123455555",
        dateAsigned: "15-02-2025",
        duration: "3 year",
        keterangan: " Adalah"
    }
];

export default BlacklistData;