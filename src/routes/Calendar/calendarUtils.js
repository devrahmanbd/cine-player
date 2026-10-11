// Copyright (C) 2017-2026 Smart code 203358507

const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
};

const getFirstWeekday = (year, month) => {
    return (new Date(year, month - 1, 1).getDay() + 6) % 7;
};

const getMonthInfo = (year, month, now) => {
    const reference = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const isCurrentMonth = reference.getFullYear() === year && reference.getMonth() + 1 === month;
    return {
        today: isCurrentMonth ? reference.getDate() : null,
        days: getDaysInMonth(year, month),
        firstWeekday: getFirstWeekday(year, month),
    };
};

const toValidDate = (released) => {
    if (released instanceof Date) {
        return Number.isNaN(released.getTime()) ? null : released;
    }
    if (typeof released === 'string' || typeof released === 'number') {
        const parsed = new Date(released);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const bucketVideosByDate = (videos, year, month) => {
    const days = getDaysInMonth(year, month);
    const items = Array.from({ length: days }, (_, index) => ({
        date: { day: index + 1, month, year },
        items: [],
    }));
    if (!Array.isArray(videos)) {
        return items;
    }
    videos.forEach((video) => {
        if (video === null || typeof video !== 'object') {
            return;
        }
        const date = toValidDate(video.released);
        if (date === null || date.getFullYear() !== year || date.getMonth() + 1 !== month) {
            return;
        }
        const bucket = items[date.getDate() - 1];
        if (!bucket) {
            return;
        }
        const deepLinks = video.deepLinks !== null && typeof video.deepLinks === 'object' ? video.deepLinks : {};
        if (typeof deepLinks.metaDetailsStreams !== 'string') {
            return;
        }
        bucket.items.push({
            id: video.id,
            name: video.name,
            poster: video.poster,
            title: video.title,
            season: video.season,
            episode: video.episode,
            deepLinks: {
                metaDetailsStreams: deepLinks.metaDetailsStreams,
            },
        });
    });
    return items;
};

const buildCalendarMonth = (year, month, videos, now) => {
    return {
        monthInfo: getMonthInfo(year, month, now),
        items: bucketVideosByDate(videos, year, month),
    };
};

module.exports = {
    getMonthInfo,
    bucketVideosByDate,
    buildCalendarMonth,
};
