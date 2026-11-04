const UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1000,
	m: 60 * 1000,
	h: 60 * 60 * 1000,
	d: 24 * 60 * 60 * 1000,
	w: 7 * 24 * 60 * 60 * 1000,
};

export const parseDuration = (value: string): number => {
	const trimmed = value.trim();

	if (/^\d+$/.test(trimmed)) {
		return Number(trimmed) * 1000;
	}

	const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i.exec(trimmed);
	if (!match?.[1] || !match[2]) {
		throw new Error(
			`Invalid duration "${value}". Use e.g. "15m", "12h" or "7d".`,
		);
	}

	const amount = Number(match[1]);
	const unit = match[2].toLowerCase() as keyof typeof UNIT_MS;

	return Math.floor(amount * UNIT_MS[unit]);
};
