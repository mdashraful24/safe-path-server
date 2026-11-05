const parsePositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPagination = (
	pageValue: unknown,
	limitValue: unknown,
	defaultLimit = 10,
) => {
	const page = parsePositiveInt(pageValue, 1);
	const limit = Math.min(parsePositiveInt(limitValue, defaultLimit), 100);

	return {
		page,
		limit,
		skip: (page - 1) * limit,
	};
};
