export type EmisObjectLink = {
	objectId: string;
	linkType: string;
	isPrimary: boolean;
	confidence: number | null;
	comment: string | null;
};

export type AttachNewsObjectsInput = {
	links: EmisObjectLink[];
};

export type UpdateNewsObjectLinkInput = Partial<
	Pick<EmisObjectLink, 'linkType' | 'isPrimary' | 'confidence' | 'comment'>
>;
