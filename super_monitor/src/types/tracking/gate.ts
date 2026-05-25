export interface gatesType {
    id: string;
    name: string;
    position?: [x: number, y: number];
    color: string;
    posX: number;
    posY: number;
    isActive: boolean;
    isEditing: boolean;
}