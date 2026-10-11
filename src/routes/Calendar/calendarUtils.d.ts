type LocalCalendarVideo = {
    id: string,
    name?: string,
    poster?: string | null,
    title?: string,
    season?: number,
    episode?: number,
    released: unknown,
    deepLinks?: { metaDetailsStreams?: unknown } | null,
};

type LocalCalendarMonth = {
    monthInfo: CalendarMonthInfo,
    items: CalendarItem[],
};

export declare const getMonthInfo: (year: number, month: number, now?: Date) => CalendarMonthInfo;
export declare const bucketVideosByDate: (videos: LocalCalendarVideo[] | null | undefined, year: number, month: number) => CalendarItem[];
export declare const buildCalendarMonth: (year: number, month: number, videos: LocalCalendarVideo[] | null | undefined, now?: Date) => LocalCalendarMonth;
