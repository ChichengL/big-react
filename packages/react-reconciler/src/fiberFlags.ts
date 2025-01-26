export const NoFlags = 0b00000001;
export const Placement = 0b00000010;
export const Update = 0b00000100;
export const ChildDeletion = 0b00001000;

export type Flags =
	| typeof NoFlags
	| typeof Placement
	| typeof Update
	| typeof ChildDeletion;
